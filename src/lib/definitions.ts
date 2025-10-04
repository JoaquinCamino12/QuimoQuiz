export type PreguntaGlobal = {
  id: string;
  textoPregunta: string;
  respuestaCorrecta: string;
  opcionFalsa_1: string;
  opcionFalsa_2: string;
  categoria: 'CineTV' | 'CulturaGeneral' | 'CienciaTech' | 'Musica' | 'Adivinanzas' | 'Terror';
};

export type QuizQuestion = {
  questionText: string;
  options: string[];
  correctAnswer: string;
};

export type Category = 'CineTV' | 'CulturaGeneral' | 'CienciaTech' | 'Musica' | 'Adivinanzas' | 'Terror' | 'Mix';
export type GameMode = 'fixed' | 'survival';

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
