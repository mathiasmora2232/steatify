import { ToolShell } from '@/components/ToolShell';
import { QuizRunner } from '@/components/Quiz';
import { GAMER_QUIZ } from '@/lib/quizzes';

export const metadata = {
  title: '¿Qué tipo de jugador eres? · Sonora',
  description: 'Descubre tu clase gamer: Completista, Coleccionista, Competitivo, Explorador o Casual. Quiz gratis, sin registrarte.',
};

export default function GamerQuizPage() {
  return (
    <ToolShell title={GAMER_QUIZ.title} subtitle={GAMER_QUIZ.subtitle}>
      <QuizRunner quiz={GAMER_QUIZ} />
    </ToolShell>
  );
}
