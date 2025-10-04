'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Brain, Clapperboard, FlaskConical, Globe, Music, Shuffle, Target, InfinityIcon, Ghost, Github } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { Category, GameMode } from '@/lib/definitions';
import Logo from '@/components/Logo';

const categories = [
  { id: 'Mix', name: 'Mix', icon: Shuffle },
  { id: 'CulturaGeneral', name: 'General', icon: Globe },
  { id: 'CienciaTech', name: 'Ciencia', icon: FlaskConical },
  { id: 'Musica', name: 'Música', icon: Music },
  { id: 'CineTV', name: 'Cine/TV', icon: Clapperboard },
  { id: 'Adivinanzas', name: 'Adivinanzas', icon: Brain },
  { id: 'Terror', name: 'Terror', icon: Ghost, selectedClassName: 'bg-black text-accent border-accent' },
] as const;

const gameModes = [
  { id: 'fixed', name: '10 Preguntas', icon: Target },
  { id: 'survival', name: 'Supervivencia', icon: InfinityIcon },
] as const;

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('Mix');
  const [selectedMode, setSelectedMode] = useState<GameMode>('fixed');

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-secondary/50">
      
      <a href="https://github.com/JoaquinCamino12/QuimoQuiz" target="_blank" rel="noopener noreferrer" className="absolute top-4 right-4 flex items-center gap-2 text-foreground/70 hover:text-foreground transition-colors">
        <Github className="h-5 w-5" />
        <span className="hidden sm:inline">Ver en GitHub</span>
      </a>

      <main className="flex w-full flex-col items-center justify-center">
        <div className="w-full max-w-md animate-bounce-in">
          <Card className="w-full shadow-2xl overflow-hidden bg-card/80 backdrop-blur-sm">
            <CardHeader className="text-center p-6">
              <div className="mx-auto mb-4">
                <Logo />
              </div>
              <CardTitle className="text-3xl font-bold font-headline">Quimo-Quiz Global</CardTitle>
              <CardDescription>¡Pon a prueba tus conocimientos y desafía al mundo!</CardDescription>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              <div className="space-y-4">
                <div>
                  <h3 className="mb-3 text-base font-semibold text-center text-foreground/80">Elige una Categoría</h3>
                  <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
                    {categories.map((category) => {
                       const isSelected = selectedCategory === category.id;
                       const selectedClasses = 'selectedClassName' in category && category.selectedClassName
                         ? category.selectedClassName
                         : 'bg-primary text-primary-foreground border-primary';

                      return(
                      <button
                        key={category.id}
                        onClick={() => setSelectedCategory(category.id)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-1 rounded-lg border p-2 text-xs sm:text-sm font-medium transition-all duration-200 aspect-square',
                          'hover:shadow-md hover:scale-105 hover:border-primary',
                          isSelected
                            ? `${selectedClasses} shadow-lg scale-105`
                            : 'bg-card/50'
                        )}
                      >
                        <category.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                        <span className='text-center'>{category.name}</span>
                      </button>
                    )})}
                  </div>
                </div>
                <div>
                  <h3 className="mb-3 text-base font-semibold text-center text-foreground/80">Modo de Juego</h3>
                  <div className="grid grid-cols-2 gap-3">
                    {gameModes.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        className={cn(
                          'flex items-center justify-center gap-3 rounded-lg border p-3 text-sm sm:text-base font-medium transition-all duration-200',
                          'hover:shadow-md hover:scale-105 hover:border-primary',
                          selectedMode === mode.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                            : 'bg-card/50'
                        )}
                      >
                        <mode.icon className="h-5 w-5" />
                        <span>{mode.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <Link href={`/quiz?category=${selectedCategory}&mode=${selectedMode}`}>
                  <Button size="lg" className="w-full h-12 sm:h-14 text-lg sm:text-xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-shadow">
                    ¡Empezar!
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="absolute bottom-4 text-center text-xs text-foreground/60">
        Creado por <a href="https://joaquincamino.netlify.app" target="_blank" rel="noopener noreferrer" className="font-semibold hover:text-foreground underline">Joaquín Camino</a>
      </footer>
    </div>
  );
}
