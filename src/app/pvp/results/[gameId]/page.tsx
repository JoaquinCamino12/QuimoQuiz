'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { useFirebase } from '@/firebase';
import { Award, Repeat, Home, Swords, Trophy, X, User, Loader } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { PvPGame } from '@/lib/definitions';
import Logo from '@/components/Logo';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

export default function PvPResultsPage() {
  const router = useRouter();
  const { gameId } = useParams();
  const { user, isUserLoading, firestore } = useFirebase();
  const { toast } = useToast();

  const [game, setGame] = useState<PvPGame | null>(null);
  const [loading, setLoading] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!firestore || !gameId || isUserLoading) return;
    
    if (!user) {
        router.replace('/');
        return;
    }
    
    const fetchGame = async () => {
        try {
            const gameRef = doc(firestore, 'pvpGames', gameId as string);
            const docSnap = await getDoc(gameRef);
            if (docSnap.exists()) {
                const gameData = { id: docSnap.id, ...docSnap.data() } as PvPGame;
                if (gameData.status !== 'finished') {
                    router.replace(`/pvp/game/${gameId}`);
                } else {
                    setGame(gameData);
                }
            } else {
                router.replace('/');
            }
        } catch (error) {
            console.error("Error fetching game results:", error);
            router.replace('/');
        } finally {
            setLoading(false);
        }
    };
    fetchGame();
  }, [firestore, gameId, user, isUserLoading, router]);
  
  const handlePlayAgain = useCallback(async () => {
    if (!firestore || !gameId || !game) return;
    setIsResetting(true);
    try {
      const gameRef = doc(firestore, 'pvpGames', gameId as string);
      
      await runTransaction(firestore, async (transaction) => {
        const freshGameDoc = await transaction.get(gameRef);
        if (!freshGameDoc.exists()) {
            throw new Error("La partida ya no existe.");
        }
        
        const currentPlayers = freshGameDoc.data().players;
        const resetPlayers: { [key: string]: any } = {};
        Object.keys(currentPlayers).forEach(playerId => {
            resetPlayers[playerId] = {
                ...currentPlayers[playerId],
                correctAnswers: 0,
                isReady: false,
            };
        });

        transaction.update(gameRef, {
            status: 'waiting',
            currentRound: 0,
            currentQuestionIndex: 0,
            rounds: [],
            answers: {},
            questionStartTime: null,
            winner: null,
            reason: null,
            players: resetPlayers,
            createdAt: serverTimestamp() 
        });
      });

      router.push(`/pvp/game/${gameId}`);

    } catch (error: any) {
        toast({
            title: "Error al reiniciar",
            description: error.message || "No se pudo reiniciar la partida. Intenta crear una nueva.",
            variant: "destructive"
        });
        setIsResetting(false);
    }
  }, [firestore, gameId, router, toast, game]);


  if (loading || isUserLoading || !game || !user) {
    return <div className="flex h-screen w-full items-center justify-center"><Logo className="animate-pulse" /></div>;
  }

  const me = game.players[user.uid];
  const opponentId = game.playerIds.find(id => id !== user.uid);
  const opponent = opponentId ? game.players[opponentId] : { name: 'Oponente', correctAnswers: 0, id: '', isReady: false };

  if (!me) {
     router.replace('/');
     return <div className="flex h-screen w-full items-center justify-center"><Logo className="animate-pulse" /></div>;
  }

  let isWinner = false;
  let isTie = false;
  let resultText = '';
  let subText = 'Resumen final del duelo.';

  if (game.reason === 'abandoned') {
    isWinner = game.winner === user.uid;
    resultText = isWinner ? "¡Has Ganado!" : "Derrota";
    subText = isWinner ? `${opponent.name || 'Tu oponente'} ha abandonado la partida.` : "Abandonaste la partida.";
  } else {
    isWinner = me.correctAnswers > opponent.correctAnswers;
    isTie = me.correctAnswers === opponent.correctAnswers;
    if (isTie) {
      resultText = "¡Es un Empate!";
    } else {
      resultText = isWinner ? "¡Has Ganado!" : "Has Perdido...";
    }
  }

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-background to-secondary/50">
      <Card className="w-full max-w-2xl animate-bounce-in shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center p-6">
          <div className="mx-auto mb-2">
            {isWinner && <Trophy className="h-16 w-16 text-yellow-400" />}
            {isTie && <Swords className="h-16 w-16 text-muted-foreground" />}
            {!isWinner && !isTie && <X className="h-16 w-16 text-destructive" />}
          </div>
          <CardTitle className="text-3xl font-bold font-headline">{resultText}</CardTitle>
          <CardDescription>{subText}</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          
          <div className={cn(
              "flex justify-between items-center p-4 rounded-lg mb-2 border-2",
              isWinner ? "bg-green-100/80 border-green-500" : "bg-card"
          )}>
            <div className="flex items-center gap-3">
              {isWinner && <Award className="h-6 w-6 text-yellow-500" />}
               {!isWinner && <User className="h-6 w-6 text-muted-foreground" />}
              <p className="font-bold text-lg">{me.name} (Tú)</p>
            </div>
            <p className="text-2xl font-bold text-primary">{me.correctAnswers}</p>
          </div>
          
          {opponentId && (
            <div className={cn(
                "flex justify-between items-center p-4 rounded-lg mb-6 border-2",
                !isWinner && !isTie ? "bg-green-100/80 border-green-500" : "bg-card"
            )}>
              <div className="flex items-center gap-3">
                {!isWinner && !isTie && <Award className="h-6 w-6 text-yellow-500" />}
                {(isWinner || isTie) && <User className="h-6 w-6 text-muted-foreground" />}
                <p className="font-bold text-lg">{opponent.name}</p>
              </div>
              <p className="text-2xl font-bold text-primary">{opponent.correctAnswers}</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            <Link href="/" passHref>
              <Button variant="outline" size="lg" className="w-full h-14 text-base">
                <Home className="mr-2 h-5 w-5" />
                Volver al Menú
              </Button>
            </Link>
             <Button onClick={handlePlayAgain} disabled={isResetting} size="lg" className="w-full h-14 text-base bg-accent hover:bg-accent/90 text-accent-foreground">
                {isResetting ? <Loader className="animate-spin" /> : <Repeat className="mr-2 h-5 w-5" />}
                Jugar de Nuevo
             </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
