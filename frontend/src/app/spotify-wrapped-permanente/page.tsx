import Link from 'next/link';
import { ArticleShell } from '@/components/ArticleShell';

export const metadata = {
  title: 'Spotify Wrapped permanente: tu resumen musical todo el año',
  description: '¿Cansado de esperar a diciembre? Sonora es un Spotify Wrapped permanente: rankings, eras, obsesiones y récords actualizados en tiempo real, no una vez al año.',
  alternates: { canonical: '/spotify-wrapped-permanente' },
};

export default function Page() {
  return (
    <ArticleShell
      title="Spotify Wrapped permanente"
      lead="Tu resumen musical no debería existir solo en diciembre. Sonora lo hace permanente y en tiempo real."
    >
      <p>
        El Spotify Wrapped es genial… una vez al año. El problema es que tu música cambia cada semana: nuevas obsesiones,
        artistas que vuelven, etapas que empiezan y terminan. <strong>Sonora</strong> convierte ese resumen anual en algo
        <strong> vivo</strong>: puedes ver tu "Wrapped" de esta semana, este mes, este verano o cualquier periodo, cuando quieras.
      </p>

      <h2>¿Cómo funciona?</h2>
      <ul>
        <li>Conectas tu cuenta de Spotify (acceso de solo lectura).</li>
        <li>Sonora analiza tu historial de reproducciones de forma continua.</li>
        <li>Obtienes rankings, minutos, géneros y tendencias actualizados al instante.</li>
      </ul>

      <h2>Más que un Top 5</h2>
      <p>El Wrapped tradicional te da un puñado de números. Sonora te da una historia:</p>
      <ul>
        <li><strong>Eras musicales</strong>: cada mes detecta tu "etapa" y le pone nombre.</li>
        <li><strong>Obsesiones</strong>: las canciones que tienes en repeat ahora mismo.</li>
        <li><strong>Cementerio</strong>: temas que amaste y dejaste de escuchar.</li>
        <li><strong>Récords</strong>: tu mayor obsesión, tu canción más nocturna, tu loop más largo.</li>
      </ul>

      <h2>¿Importar años anteriores?</h2>
      <p>
        Spotify te deja descargar tu historial extendido (todos tus años). Sonora lo importa para que tu Wrapped cubra
        <strong> toda tu vida musical</strong>, no solo el último año.
      </p>

      <p>
        Mientras tanto, descubre tu arquetipo con el quiz{' '}
        <Link href="/tools/oyente">¿Qué tipo de oyente eres?</Link> — gratis y sin registrarte.
      </p>
    </ArticleShell>
  );
}
