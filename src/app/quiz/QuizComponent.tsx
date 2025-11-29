'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { BarChart, CheckCircle, Flame, Heart, HelpCircle, Star, Target, XCircle, InfinityIcon, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { collection, query, where, getDocs, Firestore, limit, documentId } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import type { Category, GameMode, PreguntaGlobal, QuizQuestion } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import Logo from '@/components/Logo';
import { motion, AnimatePresence } from 'framer-motion';
import { soundManager } from '@/lib/sounds';

const shuffleArray = <T,>(array: T[]): T[] => {
  return [...array].sort(() => Math.random() - 0.5);
};

const QUESTION_TIME = 15; // seconds
const POINTS_PER_CORRECT = 100;
const STREAK_BONUS = 20;
const TIME_BONUS_MULTIPLIER = 10;
const TOTAL_STRIKES = 3;
const SURVIVAL_FETCH_THRESHOLD = 5; // Fetch more when this many questions are left
const FIRESTORE_IN_LIMIT = 30;

export default function QuizComponent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const firestore = useFirestore();

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [askedQuestionIds, setAskedQuestionIds] = useState<Set<string>>(new Set());
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [highestStreak, setHighestStreak] = useState(0);
  const [strikes, setStrikes] = useState(TOTAL_STRIKES);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [userAnswers, setUserAnswers] = useState<(string | null)[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isGameFinished, setIsGameFinished] = useState(false);
  const [isFetchingMore, setIsFetchingMore] = useState(false);

  const category = useMemo(() => (searchParams.get('category') as Category) || 'Mix', [searchParams]);
  const mode = useMemo(() => (searchParams.get('mode') as GameMode) || 'fixed', [searchParams]);

  useEffect(() => {
    if (isGameFinished) {
      router.push('/results');
    }
  }, [isGameFinished, router]);

  const endGame = useCallback(() => {
    const finalUserAnswers = userAnswers;
    const finalScore = score;
    if (finalScore > highScore) {
      localStorage.setItem(`highScore_${category}_${mode}`, String(finalScore));
    }
    const correctCount = finalUserAnswers.filter((ans, i) => quizQuestions[i] && ans === quizQuestions[i].correctAnswer).length;

    sessionStorage.setItem('quizResults', JSON.stringify({
      score: finalScore,
      correctAnswers: correctCount,
      wrongAnswers: finalUserAnswers.length - correctCount,
      totalQuestions: finalUserAnswers.length,
      questions: quizQuestions.slice(0, finalUserAnswers.length),
      userAnswers: finalUserAnswers,
      highestStreak,
      mode,
      category,
    }));
    setIsGameFinished(true);
  }, [score, highScore, category, mode, quizQuestions, userAnswers, highestStreak]);

  const fetchQuestions = useCallback(async (excludeIds: Set<string> = new Set()) => {
    if (!firestore) return [];

    const questionsCollection = collection(firestore, 'PreguntasGlobales');
    let baseQuery;
    if (category === 'Mix') {
      baseQuery = query(questionsCollection);
    } else {
      baseQuery = query(questionsCollection, where('categoria', '==', category));
    }

    const allDocsSnapshot = await getDocs(baseQuery);
    let allDocIds = allDocsSnapshot.docs.map(doc => doc.id);

    // Filter out already asked questions
    const availableIds = allDocIds.filter(id => !excludeIds.has(id));

    if (availableIds.length === 0) {
      console.warn("No more unique questions available.");
      return [];
    }

    const questionLimit = mode === 'fixed' ? 10 : FIRESTORE_IN_LIMIT;
    const numToFetch = Math.min(questionLimit, availableIds.length);

    const randomIds = shuffleArray(availableIds).slice(0, numToFetch);

    if (randomIds.length === 0) return [];

    const questionsQuery = query(questionsCollection, where(documentId(), 'in', randomIds));
    const querySnapshot = await getDocs(questionsQuery);

    return querySnapshot.docs.map(doc => ({ ...doc.data() as PreguntaGlobal, id: doc.id }));
  }, [firestore, category, mode]);

  const advanceToNextQuestion = useCallback(() => {
    if (mode === 'fixed' && currentQuestionIndex + 1 >= quizQuestions.length) {
      endGame();
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
      setIsAnswered(false);
      setSelectedAnswer(null);
      setTimeLeft(QUESTION_TIME);
    }
  }, [mode, currentQuestionIndex, quizQuestions.length, endGame]);


  const handleAnswer = useCallback((answer: string) => {
    if (isAnswered) return;

    setIsAnswered(true);
    setSelectedAnswer(answer);
    soundManager.playClick();

    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    setUserAnswers(prev => [...prev, answer === '' ? null : answer]);

    const isCorrect = answer !== '' && answer === quizQuestions[currentQuestionIndex].correctAnswer;

    if (isCorrect) {
      soundManager.playSuccess();
      const newStreak = streak + 1;
      const timeBonus = timeLeft * TIME_BONUS_MULTIPLIER;
      const streakBonus = newStreak * STREAK_BONUS;
      setScore(s => s + POINTS_PER_CORRECT + timeBonus + streakBonus);
      setStreak(newStreak);
      if (newStreak > highestStreak) {
        setHighestStreak(newStreak);
      }
    } else {
      soundManager.playError();
      setStreak(0);
      if (mode === 'survival') {
        const newStrikes = strikes - 1;
        setStrikes(newStrikes);
        if (newStrikes <= 0) {
          setTimeout(endGame, 2000);
          return;
        }
      }
    }

    setTimeout(advanceToNextQuestion, 2000);
  }, [isAnswered, streak, timeLeft, quizQuestions, currentQuestionIndex, mode, highestStreak, strikes, endGame, advanceToNextQuestion]);

  useEffect(() => {
    const initializeQuiz = async () => {
      setIsLoading(true);
      try {
        let fetchedRawQuestions = await fetchQuestions();

        if (fetchedRawQuestions.length === 0 && category !== 'Mix') {
          console.warn(`No questions for ${category}, falling back to Mix.`);
          fetchedRawQuestions = await fetchQuestions(new Set()); // Pass empty set for initial fetch
        }

        if (fetchedRawQuestions.length > 0) {
          const newQuestions = fetchedRawQuestions.map((q) => ({
            id: q.id,
            questionText: q.textoPregunta,
            options: shuffleArray([q.respuestaCorrecta, q.opcionFalsa_1, q.opcionFalsa_2].filter(Boolean)),
            correctAnswer: q.respuestaCorrecta,
            category: q.categoria,
          }));
          setQuizQuestions(newQuestions);
          setAskedQuestionIds(new Set(fetchedRawQuestions.map(q => q.id)));
        } else {
          console.error("No questions found at all.");
          // Handle no questions case, e.g., redirect or show error
        }

      } catch (error) {
        console.error("Error initializing quiz: ", error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeQuiz();

    const storedHighScore = localStorage.getItem(`highScore_${category}_${mode}`);
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
  }, [category, mode, firestore, fetchQuestions]);

  // Effect for fetching more questions in survival mode
  useEffect(() => {
    const shouldFetch = mode === 'survival' &&
      !isFetchingMore &&
      quizQuestions.length > 0 &&
      quizQuestions.length - currentQuestionIndex <= SURVIVAL_FETCH_THRESHOLD;

    if (shouldFetch) {
      setIsFetchingMore(true);
      fetchQuestions(askedQuestionIds).then(newRawQuestions => {
        if (newRawQuestions.length > 0) {
          const newFormattedQuestions = newRawQuestions.map((q) => ({
            id: q.id,
            questionText: q.textoPregunta,
            options: shuffleArray([q.respuestaCorrecta, q.opcionFalsa_1, q.opcionFalsa_2].filter(Boolean)),
            correctAnswer: q.respuestaCorrecta,
            category: q.categoria,
          }));
          setQuizQuestions(prev => [...prev, ...newFormattedQuestions]);
          setAskedQuestionIds(prev => new Set([...prev, ...newRawQuestions.map(q => q.id)]));
        }
        setIsFetchingMore(false);
      });
    }
  }, [currentQuestionIndex, quizQuestions.length, mode, isFetchingMore, fetchQuestions, askedQuestionIds]);

  useEffect(() => {
    if (isAnswered || isLoading || quizQuestions.length === 0) return;

    if (timeLeft <= 0) {
      handleAnswer(''); // Timeout counts as a wrong answer
      return;
    }

    const timer = setTimeout(() => {
      if (!isAnswered) {
        setTimeLeft(t => t - 1);
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [timeLeft, isAnswered, isLoading, quizQuestions.length, handleAnswer]);


  if (isLoading || quizQuestions.length === 0) {
    return <div className="flex h-screen w-full items-center justify-center"><Logo className="animate-pulse" /></div>;
  }

  const currentQuestion = quizQuestions[currentQuestionIndex];

  if (!currentQuestion) {
    // This can happen if survival runs out of questions or during final transition
    if (!isFetchingMore && !isLoading) {
      endGame();
    }
    return <div className="flex h-screen w-full items-center justify-center">Cargando siguiente ronda...</div>;
  }

  const progress = mode === 'fixed' ? ((currentQuestionIndex + 1) / quizQuestions.length) * 100 : 100;

  return (
    <div className="flex flex-col h-screen bg-background p-4 sm:p-6 md:p-8 font-body">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-4 w-full sm:w-auto">
          <Link href="/" aria-label="Volver al menú principal">
            <Button variant="ghost" size="icon">
              <Home className="h-6 w-6" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold font-headline text-primary">{category}</h1>
          {mode === 'fixed' ? <Target className="h-6 w-6 text-foreground/70" /> : <InfinityIcon className="h-6 w-6 text-foreground/70" />}
        </div>
        <div className="flex items-center gap-4 sm:gap-6 text-sm sm:text-base font-semibold w-full sm:w-auto justify-around">
          <div className="flex items-center gap-2" title="Puntuación más alta">
            <Star className="h-5 w-5 text-yellow-400" />
            <span>{highScore}</span>
          </div>
          <div className="flex items-center gap-2" title="Racha">
            <Flame className="h-5 w-5 text-accent" />
            <span>{streak}</span>
          </div>
          {mode === 'survival' && (
            <div className="flex items-center gap-2" title="Vidas">
              {Array.from({ length: TOTAL_STRIKES }).map((_, i) => (
                <Heart key={i} className={cn("h-5 w-5 transition-colors", i < strikes ? 'text-red-500 fill-current' : 'text-foreground/30')} />
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Progress & Score */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2 text-sm font-medium text-foreground/80">
          <span>{mode === 'fixed' ? `Pregunta ${currentQuestionIndex + 1} de ${quizQuestions.length}` : `Pregunta ${currentQuestionIndex + 1}`}</span>
          <span>{timeLeft}s</span>
        </div>
        <Progress value={mode === 'fixed' ? progress : (timeLeft / QUESTION_TIME) * 100} className="h-3" />
        <div className="text-center text-4xl font-bold font-headline text-primary mt-4">{score}</div>
      </div>

      {/* Question */}
      <main className="flex-grow flex flex-col items-center justify-center text-center overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestion.id}
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
            className="w-full max-w-2xl"
          >
            <h2 className="text-2xl sm:text-3xl font-semibold">{currentQuestion.questionText}</h2>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Answers */}
      <footer className="mt-6 w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {currentQuestion.options.map((option) => {
            const isCorrect = option === currentQuestion.correctAnswer;
            const buttonState = isAnswered
              ? isCorrect
                ? 'correct'
                : selectedAnswer === option
                  ? 'incorrect'
                  : 'disabled'
              : 'default';

            return (
              <Button
                key={option}
                onClick={() => handleAnswer(option)}
                disabled={isAnswered}
                className={cn(
                  'h-auto min-h-[4rem] text-base whitespace-normal text-wrap justify-start p-4 text-left transition-all duration-300',
                  {
                    'bg-green-500 text-primary-foreground hover:bg-green-500/90': buttonState === 'correct',
                    'bg-destructive text-destructive-foreground hover:bg-destructive/90 animate-shake': buttonState === 'incorrect',
                    'bg-card/80 text-foreground/70': buttonState === 'disabled',
                    'bg-card hover:bg-secondary': buttonState === 'default',
                  }
                )}
              >
                <div className="flex items-center w-full">
                  <div className="mr-4">
                    {buttonState === 'correct' && <CheckCircle />}
                    {buttonState === 'incorrect' && <XCircle />}
                    {buttonState === 'disabled' && <HelpCircle className="opacity-50" />}
                    {buttonState === 'default' && <HelpCircle className="opacity-50" />}
                  </div>
                  <span className={cn({ 'text-primary-foreground': buttonState === 'correct', 'text-destructive-foreground': buttonState === 'incorrect' })}>{option}</span>
                </div>
              </Button>
            );
          })}
        </div>
      </footer>
    </div>
  );
}
