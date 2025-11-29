'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Brain, Clapperboard, FlaskConical, Globe, Music, Shuffle, Target, InfinityIcon, Ghost, Github, Swords, Loader, PlusCircle, LogIn, Utensils } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { Category, GameMode } from '@/lib/definitions';
import Logo from '@/components/Logo';
import { useToast } from '@/hooks/use-toast';
import { useFirebase } from '@/firebase';
import { collection, addDoc, serverTimestamp, doc, runTransaction, getDoc } from 'firebase/firestore';
import { useRouter } from 'next/navigation';

const categories = [
  { id: 'Mix', name: 'Mix', icon: Shuffle },
  { id: 'CulturaGeneral', name: 'General', icon: Globe },
  { id: 'CienciaTech', name: 'Ciencia', icon: FlaskConical },
  { id: 'Musica', name: 'Música', icon: Music },
  { id: 'CineTV', name: 'Cine/TV', icon: Clapperboard },
  { id: 'Adivinanzas', name: 'Adivinanzas', icon: Brain },
  { id: 'Terror', name: 'Terror', icon: Ghost, selectedClassName: 'bg-black text-accent border-accent' },
  { id: 'Cocina', name: 'Cocina', icon: Utensils },
] as const;

const gameModes = [
  { id: 'fixed', name: '10 Preguntas', icon: Target },
  { id: 'survival', name: 'Supervivencia', icon: InfinityIcon },
  { id: 'pvp', name: 'Duelo 1 vs 1', icon: Swords },
] as const;


export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState<Category>('Mix');
  const [selectedMode, setSelectedMode] = useState<GameMode>('fixed');
  const [playerName, setPlayerName] = useState('');
  const [roomId, setRoomId] = useState('');
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);

  const { toast } = useToast();
  const { firestore, user, isReady } = useFirebase();
  const router = useRouter();

  const handlePvpAction = async (action: 'create' | 'join') => {
    if (!isReady || !firestore || !user) {
      toast({ title: "Inicializando...", description: "El sistema de autenticación se está preparando. Inténtalo de nuevo.", variant: "destructive" });
      return;
    }
    if (!playerName.trim()) {
      toast({ title: "Nombre requerido", description: "Por favor, introduce tu nombre de jugador.", variant: "destructive" });
      return;
    }

    if (action === 'create') {
      setIsCreatingRoom(true);
      try {
        const newRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        const gameRef = doc(firestore, 'pvpGames', newRoomId);

        const newGameData = {
          status: 'waiting',
          players: { [user.uid]: { id: user.uid, name: playerName, correctAnswers: 0, isReady: false } },
          playerIds: [user.uid],
          createdAt: serverTimestamp(),
          currentRound: 0,
          currentQuestionIndex: 0,
          rounds: [],
          answers: {},
        };

        await runTransaction(firestore, async (transaction) => {
          transaction.set(gameRef, newGameData);
        });

        router.push(`/pvp/game/${newRoomId}`);

      } catch (error) {
        console.error("Error creando la sala:", error);
        toast({ title: "Error", description: "No se pudo crear la sala. Inténtalo de nuevo.", variant: "destructive" });
        setIsCreatingRoom(false);
      }
    } else if (action === 'join') {
      if (!roomId.trim()) {
        toast({ title: "Código de sala requerido", description: "Por favor, introduce el código de la sala.", variant: "destructive" });
        return;
      }
      setIsJoiningRoom(true);
      try {
        const gameRef = doc(firestore, 'pvpGames', roomId.toUpperCase());

        await runTransaction(firestore, async (transaction) => {
          const freshGameDoc = await transaction.get(gameRef);
          if (!freshGameDoc.exists() || freshGameDoc.data().status !== 'waiting') {
            throw new Error("La sala no existe o ya está en curso.");
          }

          const gameData = freshGameDoc.data();
          // Prevent joining own game or if the room is full
          if (gameData.playerIds.includes(user.uid) || gameData.playerIds.length >= 2) {
            throw new Error("No puedes unirte a esta sala.");
          }

          const newPlayer = { id: user.uid, name: playerName, correctAnswers: 0, isReady: false };

          transaction.update(gameRef, {
            [`players.${user.uid}`]: newPlayer,
            playerIds: [...gameData.playerIds, user.uid],
          });
        });

        router.push(`/pvp/game/${roomId.toUpperCase()}`);

      } catch (error: any) {
        console.error("Error al unirse a la sala:", error);
        toast({ title: "Error al unirse", description: error.message || "No se pudo unir a la sala. Verifica el código e inténtalo de nuevo.", variant: "destructive" });
        setIsJoiningRoom(false);
      }
    }
  };

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
                  <h3 className="mb-3 text-base font-semibold text-center text-foreground/80">Modo de Juego</h3>
                  <div className="grid grid-cols-3 gap-3">
                    {gameModes.map((mode) => (
                      <button
                        key={mode.id}
                        onClick={() => setSelectedMode(mode.id)}
                        className={cn(
                          'flex flex-col items-center justify-center gap-2 rounded-lg border p-3 text-sm sm:text-base font-medium transition-all duration-200 aspect-square',
                          'hover:shadow-md hover:scale-105 hover:border-primary',
                          selectedMode === mode.id
                            ? 'bg-primary text-primary-foreground border-primary shadow-lg scale-105'
                            : 'bg-card/50'
                        )}
                      >
                        <mode.icon className="h-6 w-6" />
                        <span className="text-xs text-center">{mode.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {selectedMode === 'pvp' && (
                  <div className="space-y-4 animate-in fade-in duration-300 border-t pt-4">
                    <div>
                      <h3 className="mb-2 text-base font-semibold text-center text-foreground/80">Tu Nombre de Jugador</h3>
                      <Input
                        placeholder="Introduce tu nombre..."
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="text-center"
                        disabled={!isReady}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <Button onClick={() => handlePvpAction('create')} disabled={!isReady || isCreatingRoom || isJoiningRoom} className="h-12 text-base">
                        {isCreatingRoom ? <Loader className="animate-spin" /> : <PlusCircle />}
                        Crear Sala
                      </Button>
                      <Button onClick={() => handlePvpAction('join')} disabled={!isReady || isJoiningRoom || isCreatingRoom} className="h-12 text-base">
                        {isJoiningRoom ? <Loader className="animate-spin" /> : <LogIn />}
                        Unirse a Sala
                      </Button>
                    </div>
                    <div>
                      <Input
                        placeholder="Código de la sala..."
                        value={roomId}
                        onChange={(e) => setRoomId(e.target.value)}
                        className="text-center"
                        disabled={!isReady}
                      />
                    </div>
                  </div>
                )}

                {selectedMode !== 'pvp' && (
                  <div className="animate-in fade-in duration-300">
                    <h3 className="mb-3 text-base font-semibold text-center text-foreground/80">Elige una Categoría</h3>
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-4">
                      {categories.map((category) => {
                        const isSelected = selectedCategory === category.id;
                        const selectedClasses = 'selectedClassName' in category && category.selectedClassName
                          ? category.selectedClassName
                          : 'bg-primary text-primary-foreground border-primary';

                        return (
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
                        )
                      })}
                    </div>
                    <div className="mt-6">
                      <Button asChild size="lg" className="w-full h-12 sm:h-14 text-lg sm:text-xl bg-accent hover:bg-accent/90 text-accent-foreground shadow-lg hover:shadow-xl transition-shadow" disabled={!isReady}>
                        <Link href={`/quiz?category=${selectedCategory}&mode=${selectedMode}`} aria-disabled={!isReady} tabIndex={!isReady ? -1 : undefined}>
                          ¡Empezar!
                        </Link>
                      </Button>
                    </div>
                  </div>
                )}

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
