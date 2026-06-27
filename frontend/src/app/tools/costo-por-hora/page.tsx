import { ToolShell } from '@/components/ToolShell';
import { CostCalculator } from '@/components/CostCalculator';

export const metadata = {
  title: 'Calculadora de costo por hora gamer · Sonora',
  description: '¿Cuánto te cuesta cada hora de juego? Calcula el valor real de tu tiempo en videojuegos. Gratis, sin registrarte.',
};

export default function CostPerHourPage() {
  return (
    <ToolShell title="Calculadora gamer" subtitle="¿Cuánto vale cada hora de tu tiempo de juego?">
      <CostCalculator />
    </ToolShell>
  );
}
