export type PreguntaGlobal = {
  id: string;
  textoPregunta: string;
  respuestaCorrecta: string;
  opcionFalsa_1: string;
  opcionFalsa_2: string;
  categoria: 'CineTV' | 'CulturaGeneral' | 'CienciaTech' | 'Musica' | 'Adivinanzas' | 'Terror' | 'Cocina';
};

export type QuizQuestion = {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  category: Category;
};

export type Category = 'CineTV' | 'CulturaGeneral' | 'CienciaTech' | 'Musica' | 'Adivinanzas' | 'Terror' | 'Cocina' | 'Mix';
export type GameMode = 'fixed' | 'survival' | 'pvp';

export interface QuizResults {
  score: number;
  correctAnswers: number;
  wrongAnswers: number;
  totalQuestions: number;
  questions: QuizQuestion[];
  userAnswers: (string | null)[];
  highestStreak: number;
  mode: GameMode;
  category: Category;
}

// PvP Types
export type PvPPlayer = {
  id: string;
  name: string;
  correctAnswers: number;
  isReady: boolean;
};

export type PvPGameRound = {
  roundNumber: number;
  category: Category | 'Mix';
  questions: QuizQuestion[];
};

type PlayerAnswer = {
  answer: string;
  scoreApplied?: boolean;
};

export type PvPGame = {
  id: string;
  status: 'waiting' | 'ongoing' | 'finished';
  players: Record<string, PvPPlayer>;
  playerIds: string[];
  currentRound: number;
  currentQuestionIndex: number;
  rounds: PvPGameRound[];
  answers: Record<string, Record<string, PlayerAnswer>>;
  createdAt: any; // Firestore Timestamp
  questionStartTime?: number;
  winner?: string; // ID of the winning player
  reason?: 'abandoned' | 'completed';
};
