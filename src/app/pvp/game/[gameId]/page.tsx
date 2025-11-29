'use client';

import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, updateDoc, runTransaction, getDocs, collection, query, where, documentId, increment } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import type { PvPGame, PvPPlayer, PreguntaGlobal, QuizQuestion, PvPGameRound } from '@/lib/definitions';
import Logo from '@/components/Logo';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, HelpCircle, LogOut, User, XCircle, Shield, Loader, Copy, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

const QUESTION_TIME = 15;
const ROUNDS_PER_PVP = 5;
const QUESTIONS_PER_ROUND = 3;
const TOTAL_QUESTIONS = ROUNDS_PER_PVP * QUESTIONS_PER_ROUND;
const BOTH_ANSWERED_DELAY = 2000; // ms


const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

export default function PvPGamePage() {
  const router = useRouter();
  const { gameId } = useParams();
  const { firestore, user, isReady } = useFirebase();
  const { toast } = useToast();

  const [game, setGame] = useState<PvPGame | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [isStartingGame, setIsStartingGame] = useState(false);
  
  const roomIdRef = useRef<HTMLSpanElement>(null);

  const gameRef = useMemo(() => {
    if (!firestore || !gameId) return null;
    return doc(firestore, 'pvpGames', gameId as string);
  }, [firestore, gameId]);

  const me = useMemo(() => game && user ? game.players[user.uid] : null, [game, user]);
  const opponent = useMemo(() => {
    if (!game || !user) return null;
    const opponentId = game.playerIds.find(id => id !== user.uid);
    return opponentId ? game.players[opponentId] : null;
  }, [game, user]);

  const isHost = useMemo(() => game && user && game.playerIds[0] === user.uid, [game, user]);
  
  const currentRoundData = useMemo(() => game && game.currentRound > 0 ? game.rounds[game.currentRound - 1] : null, [game]);
  const currentQuestion = useMemo(() => currentRoundData ? currentRoundData.questions[game.currentQuestionIndex] : null, [currentRoundData, game]);

  const answersForCurrentQuestion = useMemo(() => {
      if (!game || !currentQuestion) return {};
      const key = `${game.currentRound}_${game.currentQuestionIndex}`;
      return game.answers?.[key] || {};
  }, [game, currentQuestion]);

  const iHaveAnswered = useMemo(() => user?.uid && !!answersForCurrentQuestion[user.uid], [user, answersForCurrentQuestion]);
  const myAnswerIsCorrect = useMemo(() => {
      if (!user?.uid || !iHaveAnswered || !currentQuestion) return null;
      return answersForCurrentQuestion[user.uid].answer === currentQuestion.correctAnswer;
  }, [user, iHaveAnswered, currentQuestion, answersForCurrentQuestion]);

  const bothAnswered = useMemo(() => game?.playerIds.every(id => !!answersForCurrentQuestion[id]), [game, answersForCurrentQuestion]);
  const showResults = useMemo(() => bothAnswered || timeLeft <= 0, [bothAnswered, timeLeft]);


  const handleStartGame = useCallback(async () => {
    if (!gameRef || !isHost || !firestore) return;
    setIsStartingGame(true);

    try {
        const createPvpRounds = async (): Promise<PvPGameRound[]> => {
            const formatQuestion = (data: PreguntaGlobal): QuizQuestion => ({
              questionText: data.textoPregunta,
              options: shuffleArray([data.respuestaCorrecta, data.opcionFalsa_1, data.opcionFalsa_2]),
              correctAnswer: data.respuestaCorrecta,
              category: data.categoria
            });

            const questionsCollection = collection(firestore, 'PreguntasGlobales');
            const allDocsSnapshot = await getDocs(questionsCollection);
            const allDocIds = allDocsSnapshot.docs.map(doc => doc.id);

            const numToFetch = Math.min(TOTAL_QUESTIONS, allDocIds.length);
             if (numToFetch < TOTAL_QUESTIONS) throw new Error("No hay suficientes preguntas en la base de datos");
            
            const randomIds = shuffleArray(allDocIds).slice(0, numToFetch);
            
            const questionsQuery = query(questionsCollection, where(documentId(), 'in', randomIds));
            const snapshot = await getDocs(questionsQuery);
        
            if (snapshot.docs.length < TOTAL_QUESTIONS) throw new Error("No hay suficientes preguntas en la base de datos");
        
            const allQuestions = snapshot.docs.map(doc => formatQuestion(doc.data() as PreguntaGlobal));
            const randomQuestions = shuffleArray(allQuestions);
        
            return Array.from({ length: ROUNDS_PER_PVP }).map((_, i) => ({
                roundNumber: i + 1,
                category: 'Mix',
                questions: randomQuestions.slice(i * QUESTIONS_PER_ROUND, (i + 1) * QUESTIONS_PER_ROUND)
            }));
        };

        const rounds = await createPvpRounds();
        await updateDoc(gameRef, {
            status: 'ongoing',
            currentRound: 1,
            'players.isReady': true, 
            rounds: rounds,
            questionStartTime: Date.now()
        });

    } catch (error) {
        console.error("Error starting game:", error);
        toast({ title: "Error", description: "No se pudo iniciar el juego. Inténtalo de nuevo.", variant: "destructive" });
    } finally {
        setIsStartingGame(false);
    }
  }, [gameRef, isHost, firestore, toast]);

  const advanceGameState = useCallback(async () => {
    if (!gameRef || !isHost) return;

    try {
        await runTransaction(firestore, async (transaction) => {
            const freshGameDoc = await transaction.get(gameRef);
            if (!freshGameDoc.exists()) throw new Error("Game does not exist!");
            const freshGame = freshGameDoc.data() as PvPGame;
            
            let nextQuestionIndex = freshGame.currentQuestionIndex + 1;
            let nextRound = freshGame.currentRound;
            
            const isLastQuestionInRound = nextQuestionIndex >= (freshGame.rounds[nextRound - 1]?.questions.length || 0);

            if (isLastQuestionInRound) {
                nextQuestionIndex = 0;
                nextRound += 1;
            }
            
            if (nextRound > freshGame.rounds.length) {
                transaction.update(gameRef, { status: 'finished' });
            } else {
                transaction.update(gameRef, {
                    currentRound: nextRound,
                    currentQuestionIndex: nextQuestionIndex,
                    questionStartTime: Date.now()
                });
            }
        });

    } catch (error) {
        console.error("Failed to advance game state:", error);
    }
  }, [gameRef, isHost, firestore]);

 const handleAnswer = useCallback(async (answer: string) => {
    if (iHaveAnswered || !gameRef || !user || !game || !currentQuestion) return;
    
    if (timeLeft <= 0 && answer !== '') return;

    setSelectedAnswer(answer);
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  
    const currentAnswersKey = `${game.currentRound}_${game.currentQuestionIndex}`;
    
    try {
       await runTransaction(firestore, async (transaction) => {
         const freshGameDoc = await transaction.get(gameRef);
         if (!freshGameDoc.exists()) throw new Error("Game does not exist!");
         const freshGame = freshGameDoc.data() as PvPGame;

         // Just record the answer
         transaction.update(gameRef, {
            [`answers.${currentAnswersKey}.${user.uid}`]: { answer }
         });
       });
    } catch(error) {
      console.error("Failed to submit answer:", error);
    }
  }, [iHaveAnswered, gameRef, user, game, currentQuestion, timeLeft, firestore]);

  
  // Effect to advance the game state
  useEffect(() => {
    if (showResults && isHost) {
      const timer = setTimeout(advanceGameState, BOTH_ANSWERED_DELAY);
      return () => clearTimeout(timer);
    }
  }, [showResults, isHost, advanceGameState]);


  useEffect(() => {
    if (!gameRef) return;
    const unsubscribe = onSnapshot(gameRef, (doc) => {
      if (doc.exists()) {
        const gameData = { id: doc.id, ...doc.data() } as PvPGame;
        setGame(gameData);

        // Score update for timeout
        if (isHost && gameData.status === 'ongoing' && gameData.questionStartTime) {
            const elapsed = (Date.now() - gameData.questionStartTime) / 1000;
            if (elapsed > QUESTION_TIME + 0.5) { // Add a small buffer
                const currentAnswersKey = `${gameData.currentRound}_${gameData.currentQuestionIndex}`;
                const currentAnswers = gameData.answers?.[currentAnswersKey] || {};
                const allPlayersAnswered = gameData.playerIds.every(id => !!currentAnswers[id]);
                
                if (!allPlayersAnswered) {
                    runTransaction(firestore, async (transaction) => {
                        const freshGameDoc = await transaction.get(gameRef);
                        if (!freshGameDoc.exists()) return;
                        const freshGame = freshGameDoc.data() as PvPGame;
                        const freshAnswers = freshGame.answers?.[currentAnswersKey] || {};
                        const updates: {[key: string]: any} = {};

                        let shouldUpdate = false;
                        freshGame.playerIds.forEach(playerId => {
                            if (!freshAnswers[playerId]) {
                                updates[`answers.${currentAnswersKey}.${playerId}`] = { answer: '' };
                                shouldUpdate = true;
                            }
                        });

                        if (shouldUpdate) {
                            transaction.update(gameRef, updates);
                        }
                    });
                }
            }
        }

        if (gameData.status === 'finished') {
          router.replace(`/pvp/results/${gameId}`);
        } else if (gameData.playerIds.length < 2 && gameData.status !== 'waiting') {
           updateDoc(gameRef, { status: 'finished', winner: user?.uid, reason: 'abandoned' });
        }
      } else {
        toast({ title: "Sala no encontrada", description: "La sala ha sido eliminada.", variant: "destructive"});
        router.replace('/');
      }
    }, (error) => {
      console.error("Error listening to game changes:", error);
      toast({ title: "Error de conexión", description: "Se perdió la conexión con la partida.", variant: "destructive"});
      router.replace('/');
    });
    return () => unsubscribe();
  }, [gameRef, router, user, gameId, toast, isHost, firestore]);
  
  // Timer logic
  useEffect(() => {
    if (!game || game.status !== 'ongoing') {
        setTimeLeft(QUESTION_TIME);
        return;
    }
    
    const startTime = game.questionStartTime || Date.now();

    const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const currentLeft = Math.max(0, Math.ceil(QUESTION_TIME - elapsed));
        setTimeLeft(currentLeft);
        
        if (currentLeft <= 0) {
          if (!iHaveAnswered) {
             handleAnswer(''); // Force a blank answer for timeout
          }
          clearInterval(interval);
        }
    }, 500);
    
    return () => clearInterval(interval);

  }, [game, iHaveAnswered, handleAnswer]);

  useEffect(() => {
    if (user) {
      setSelectedAnswer(answersForCurrentQuestion[user.uid]?.answer || null);
    }
  }, [answersForCurrentQuestion, user]);

  // Effect to apply score when both players have answered
  useEffect(() => {
    if (!game || !gameRef || !user || !isHost || !currentQuestion || !showResults) {
      return;
    }

    const currentAnswersKey = `${game.currentRound}_${game.currentQuestionIndex}`;
    const currentAnswers = game.answers?.[currentAnswersKey] || {};

    // Check if both players have answered and score has not been applied yet
    const allAnswered = game.playerIds.every(id => currentAnswers[id]);
    const scoreNotApplied = game.playerIds.some(id => currentAnswers[id] && !currentAnswers[id].scoreApplied);

    if (allAnswered && scoreNotApplied) {
      runTransaction(firestore, async (transaction) => {
        const updates: { [key: string]: any } = {};
        let scoreChanged = false;
        
        game.playerIds.forEach(playerId => {
          const playerAnswer = currentAnswers[playerId].answer;
          if (playerAnswer === currentQuestion.correctAnswer) {
            updates[`players.${playerId}.correctAnswers`] = increment(1);
            scoreChanged = true;
          }
          updates[`answers.${currentAnswersKey}.${playerId}.scoreApplied`] = true;
        });

        if (scoreChanged) {
          transaction.update(gameRef, updates);
        } else {
          // If no score changed, just mark as applied to prevent re-running
          game.playerIds.forEach(playerId => {
            transaction.update(gameRef, {
              [`answers.${currentAnswersKey}.${playerId}.scoreApplied`]: true,
            });
          });
        }
      }).catch(error => {
        console.error("Error applying score:", error);
      });
    }

  }, [game, gameRef, user, isHost, currentQuestion, showResults, firestore]);

  const handleLeaveGame = async () => {
    if (!gameRef || !user || !game) {
        router.replace('/');
        return;
    }

    try {
        if (game.status === 'waiting') {
            if (isHost && game.playerIds.length === 1) {
                await runTransaction(firestore, async t => t.delete(gameRef));
            } else {
                await runTransaction(firestore, async t => {
                    const freshGame = (await t.get(gameRef)).data() as PvPGame;
                    const newPlayerIds = freshGame.playerIds.filter(id => id !== user.uid);
                    const newPlayers = { ...freshGame.players };
                    delete newPlayers[user.uid];
                    t.update(gameRef, { players: newPlayers, playerIds: newPlayerIds });
                });
            }
        } else if (game.status === 'ongoing') {
            const opponentId = game.playerIds.find(id => id !== user.uid);
            await updateDoc(gameRef, { status: 'finished', winner: opponentId, reason: 'abandoned' });
        }
    } catch (error) {
      console.error("Error leaving game:", error);
    }
    router.replace('/');
  };

 const copyRoomId = () => {
    if (roomIdRef.current) {
        const range = document.createRange();
        range.selectNodeContents(roomIdRef.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
        try {
            document.execCommand('copy');
            toast({ title: "¡Copiado!", description: "Código de la sala copiado al portapapeles." });
        } catch (err) {
            toast({ title: "Error", description: "No se pudo copiar el código.", variant: "destructive" });
        }
        selection?.removeAllRanges();
    }
  }

  if (!isReady || !game || !user || !me) {
    return <div className="flex h-screen w-full items-center justify-center"><Logo className="animate-pulse" /></div>;
  }
  
  if (game.status === 'waiting') {
    return (
        <div className="flex flex-col h-screen w-full items-center justify-center text-center p-4 bg-background">
            <Logo className="mb-8" />
            <h1 className="text-3xl font-bold font-headline mb-2">Sala de Espera</h1>
            <p className="text-muted-foreground mb-6">Esperando a que se una un oponente...</p>
            <div className="flex flex-col items-center gap-4 text-xl mb-8 w-full max-w-xs">
                <div className="flex items-center justify-between w-full p-3 bg-card rounded-lg border">
                    <div className="flex items-center gap-2">
                        <User className="h-6 w-6 text-primary" />
                        <span className="font-bold">{me.name}</span>
                    </div>
                    {isHost && <Shield className="h-6 w-6 text-yellow-500" title="Anfitrión"/>}
                </div>
                <div className="flex items-center justify-between w-full p-3 bg-card rounded-lg border">
                    {opponent ? (
                         <div className="flex items-center gap-2">
                            <User className="h-6 w-6 text-primary" />
                            <span className="font-bold">{opponent.name}</span>
                         </div>
                    ) : (
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-6 w-6 animate-pulse" />
                            <span>Buscando...</span>
                        </div>
                    )}
                </div>
            </div>

             <div className="mb-8">
                <p className="text-sm text-muted-foreground mb-2">Código de la sala:</p>
                <div 
                    onClick={copyRoomId}
                    className="flex items-center gap-2 bg-card border rounded-lg px-4 py-2 font-mono text-2xl cursor-pointer hover:bg-secondary transition-colors"
                >
                    <span ref={roomIdRef}>{gameId}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Copy className="h-5 w-5" />
                    </Button>
                </div>
            </div>

            {isHost && opponent && (
                <Button onClick={handleStartGame} disabled={isStartingGame} size="lg" className="h-14 text-xl">
                    {isStartingGame ? <Loader className="animate-spin"/> : "¡Empezar Duelo!"}
                </Button>
            )}

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="absolute bottom-6 text-muted-foreground">
                    <XCircle className="mr-2 h-4 w-4" />
                    Salir de la Sala
                </Button>
              </AlertDialogTrigger>
               <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Abandonar la partida?</AlertDialogTitle>
                  <AlertDialogDescription>
                     Si abandonas, la sala se cerrará. ¿Estás seguro?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveGame} className="bg-destructive hover:bg-destructive/90">Abandonar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
    );
  }

  if (!opponent || !currentQuestion) {
    return <div className="flex h-screen w-full items-center justify-center"><p>Sincronizando partida...</p></div>;
  }

  const getButtonState = (option: string) => {
    if (!showResults) {
      return (selectedAnswer === option) ? 'selected' : 'default';
    }

    // Show results state
    if (option === currentQuestion.correctAnswer) return 'correct';
    if (selectedAnswer === option && selectedAnswer !== currentQuestion.correctAnswer) return 'incorrect';
    return 'disabled';
  }

  return (
    <div className="flex flex-col h-screen bg-background p-4 sm:p-6 md:p-8 font-body">
      <header className="grid grid-cols-3 items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive">
                    <LogOut className="h-5 w-5"/>
                  </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Abandonar la partida?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Si abandonas, tu oponente ganará la partida inmediatamente. ¿Estás seguro?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleLeaveGame} className="bg-destructive hover:bg-destructive/90">Abandonar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <div className="text-left">
                <p className="font-bold text-lg truncate">{me.name}</p>
                <p className="text-2xl font-headline text-primary">{me.correctAnswers}</p>
            </div>
        </div>
        <div className="text-center">
            <p className="text-sm text-muted-foreground">Ronda {game.currentRound}/{game.rounds.length}</p>
            <p className="text-lg font-bold">{`${timeLeft}s`}</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-lg truncate">{opponent.name}</p>
          <p className="text-2xl font-headline text-primary">{opponent.correctAnswers}</p>
        </div>
      </header>
       <div className="grid grid-cols-3 items-center gap-4 mb-4 h-6">
            <div className="flex justify-start">
              {showResults && iHaveAnswered && (myAnswerIsCorrect ? <CheckCircle className="h-6 w-6 text-green-500" /> : <XCircle className="h-6 w-6 text-destructive" />)}
            </div>
           <div></div>
           <div className="flex justify-end">
             {showResults && answersForCurrentQuestion[opponent.id] && (answersForCurrentQuestion[opponent.id].answer === currentQuestion.correctAnswer ? <CheckCircle className="h-6 w-6 text-green-500" /> : <XCircle className="h-6 w-6 text-destructive" />)}
           </div>
       </div>

      <div className="mb-6">
        <Progress value={(timeLeft / QUESTION_TIME) * 100} className="h-3" />
      </div>

      <main className="flex-grow flex flex-col items-center justify-center text-center">
        <div className="w-full max-w-2xl animate-bounce-in">
          <p className="text-sm font-semibold text-accent mb-2">{currentRoundData?.category}</p>
          <h2 className="text-2xl sm:text-3xl font-semibold">{currentQuestion.questionText}</h2>
        </div>
      </main>

      <footer className="mt-6 w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQuestion.options.map((option) => {
            const buttonState = getButtonState(option);
            const isMyAnswer = selectedAnswer === option;
            const isOpponentAnswer = opponent.id && showResults && answersForCurrentQuestion[opponent.id]?.answer === option;

            return (
              <Button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={iHaveAnswered}
                className={cn(
                  'h-auto min-h-[4rem] text-base whitespace-normal text-wrap justify-start p-4 text-left transition-all duration-300 relative',
                  {
                    'bg-green-500 hover:bg-green-500/90 text-white': buttonState === 'correct',
                    'bg-destructive hover:bg-destructive/90 text-white animate-shake': buttonState === 'incorrect',
                    'bg-card/80 text-foreground/70 opacity-70 cursor-not-allowed': buttonState === 'disabled',
                    'bg-card hover:bg-secondary': buttonState === 'default',
                    'border-primary border-2 shadow-lg': buttonState === 'selected',
                  }
                )}
              >
                <div className="flex items-center w-full">
                    <div className="mr-4">
                        {(buttonState === 'correct') && <CheckCircle />}
                        {(buttonState === 'incorrect') && <XCircle/>}
                        {(buttonState === 'disabled' || buttonState === 'default' || buttonState === 'selected') && <HelpCircle className="opacity-50"/>}
                    </div>
                    <span className={cn("flex-grow", { "text-white": buttonState === 'correct' || buttonState === 'incorrect'})}>
                      {option}
                    </span>
                </div>
                {isOpponentAnswer && !isMyAnswer && (
                  <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" title={opponent.name} />
                )}
              </Button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}

    