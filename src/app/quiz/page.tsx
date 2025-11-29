import { Suspense } from 'react';
import QuizComponent from './QuizComponent';
import Logo from '@/components/Logo';

// This is the entry point for the /quiz route.
// It uses Suspense to wrap the actual quiz component.
export default function QuizPage() {
  return (
    <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Logo className="animate-pulse" /></div>}>
      <QuizComponent />
    </Suspense>
  );
}
