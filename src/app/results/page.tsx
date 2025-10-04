'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Award, Check, Repeat, Settings, Star, TrendingUp, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import type { QuizResults } from '@/lib/definitions';
import { cn } from '@/lib/utils';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

export default function ResultsPage() {
  const router = useRouter();
  const [results, setResults] = useState<QuizResults | null>(null);
  const [highScore, setHighScore] = useState(0);

  useEffect(() => {
    const resultsData = sessionStorage.getItem('quizResults');
    if (resultsData) {
      const parsedResults: QuizResults = JSON.parse(resultsData);
      setResults(parsedResults);
      const storedHighScore = localStorage.getItem(`highScore_${parsedResults.category}_${parsedResults.mode}`);
      if (storedHighScore) {
        setHighScore(parseInt(storedHighScore, 10));
      }
    } else {
      router.replace('/');
    }
  }, [router]);

  if (!results) {
    return <div className="flex h-screen w-full items-center justify-center">Cargando resultados...</div>;
  }
  
  const isNewHighScore = results.score > 0 && results.score >= highScore;

  const chartData = [
    { name: 'Resultados', correctas: results.correctAnswers, incorrectas: results.wrongAnswers },
  ];
  const chartConfig = {
    correctas: { label: 'Correctas', color: 'hsl(var(--primary))' },
    incorrectas: { label: 'Incorrectas', color: 'hsl(var(--destructive))' },
  };

  return (
    <main className="flex min-h-screen w-full flex-col items-center justify-center p-4 sm:p-6 md:p-8 bg-gradient-to-br from-background to-secondary/50">
      <Card className="w-full max-w-2xl animate-bounce-in shadow-2xl bg-card/80 backdrop-blur-sm">
        <CardHeader className="text-center p-6">
          {isNewHighScore ? (
             <div className="mx-auto mb-2 text-yellow-400"><Award className="h-16 w-16" /></div>
          ) : (
            <div className="mx-auto mb-2 text-primary"><Star className="h-16 w-16" /></div>
          )}
          <CardTitle className="text-3xl font-bold font-headline">
            {isNewHighScore ? "¡Nuevo Récord!" : "¡Juego Terminado!"}
          </CardTitle>
          <CardDescription>Aquí está tu resumen de la partida.</CardDescription>
        </CardHeader>
        <CardContent className="p-6 pt-0">
          <div className="text-center mb-6">
            <p className="text-muted-foreground">Tu puntuación</p>
            <p className="text-6xl font-bold text-primary">{results.score}</p>
            <p className="text-sm text-muted-foreground">Récord: {highScore}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center mb-6">
            <div className="rounded-lg border bg-card p-4">
              <p className="text-2xl font-semibold">{results.correctAnswers}/{results.totalQuestions}</p>
              <p className="text-sm text-muted-foreground">Aciertos</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-2xl font-semibold">{results.wrongAnswers}</p>
              <p className="text-sm text-muted-foreground">Errores</p>
            </div>
            <div className="rounded-lg border bg-card p-4">
              <p className="text-2xl font-semibold">{results.highestStreak}</p>
              <p className="text-sm text-muted-foreground">Mejor Racha</p>
            </div>
          </div>
          
          <div className="mb-6">
            <ChartContainer config={chartConfig} className="mx-auto aspect-auto h-[50px] w-full">
              <BarChart accessibilityLayer data={chartData} layout="vertical" margin={{left: 0, right: 0, top: 0, bottom: 0}}>
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="name" hide />
                <Tooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                <Bar dataKey="correctas" stackId="a" fill="var(--color-correctas)" radius={[5, 0, 0, 5]} />
                <Bar dataKey="incorrectas" stackId="a" fill="var(--color-incorrectas)" radius={[0, 5, 5, 0]} />
              </BarChart>
            </ChartContainer>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            <Link href="/" passHref>
              <Button variant="outline" size="lg" className="w-full h-14 text-base">
                <Settings className="mr-2 h-5 w-5" />
                Jugar de Nuevo
              </Button>
            </Link>
            <Link href={`/quiz?category=${results.category}&mode=${results.mode}`} passHref>
              <Button size="lg" className="w-full h-14 text-base bg-accent hover:bg-accent/90 text-accent-foreground">
                <Repeat className="mr-2 h-5 w-5" />
                Reintentar
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

    