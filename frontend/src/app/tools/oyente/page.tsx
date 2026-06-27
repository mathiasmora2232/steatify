import { ToolShell } from '@/components/ToolShell';
import { QuizRunner } from '@/components/Quiz';
import { LISTENER_QUIZ } from '@/lib/quizzes';

export const metadata = {
  title: '¿Qué tipo de oyente eres? · Sonora',
  description: 'Descubre tu arquetipo musical: Looper, Explorador, Nocturno, Coleccionista o Nostálgico. Quiz gratis, sin registrarte.',
};

export default function ListenerQuizPage() {
  return (
    <ToolShell title={LISTENER_QUIZ.title} subtitle={LISTENER_QUIZ.subtitle}>
      <QuizRunner quiz={LISTENER_QUIZ} />
    </ToolShell>
  );
}
