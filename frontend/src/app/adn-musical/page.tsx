import Link from 'next/link';
import { ArticleShell } from '@/components/ArticleShell';

export const metadata = {
  title: '¿Qué es tu ADN musical? Los arquetipos de oyente, explicados',
  description: 'Tu ADN musical revela qué tipo de oyente eres: Looper, Nocturno, Explorador, Coleccionista o Nostálgico. Descubre qué dice tu forma de escuchar sobre ti.',
  alternates: { canonical: '/adn-musical' },
};

export default function Page() {
  return (
    <ArticleShell
      title="¿Qué es tu ADN musical?"
      lead="Tu forma de escuchar dice más de ti de lo que crees. El ADN musical traduce tus hábitos en arquetipos."
    >
      <p>
        Dos personas pueden escuchar al mismo artista de formas completamente distintas: una lo pone en repeat cien veces,
        otra lo escucha una vez y sigue explorando. El <strong>ADN musical</strong> de Steatify analiza <em>cómo</em> escuchas —
        no solo <em>qué</em> — y lo traduce en una mezcla de arquetipos que te describen.
      </p>

      <h2>Los arquetipos de oyente</h2>
      <ul>
        <li><strong>🔁 El Looper</strong> — cuando una canción te atrapa, la quemas sin piedad.</li>
        <li><strong>🧭 El Explorador</strong> — siempre tres artistas más adelante; tu sed de descubrir no para.</li>
        <li><strong>🌙 El Nocturno</strong> — tu mejor música suena cuando el mundo duerme.</li>
        <li><strong>📦 El Coleccionista</strong> — no solo escuchas: curas, organizas y atesoras.</li>
        <li><strong>🕰️ El Nostálgico</strong> — la música es tu máquina del tiempo.</li>
      </ul>

      <h2>¿Cómo se calcula?</h2>
      <p>
        Steatify mira señales reales de tu historial: cuánto repites una misma canción, a qué horas escuchas, cuántos
        artistas nuevos descubres, qué tan seguido revives temas viejos. De ahí sale una <strong>mezcla</strong> — casi
        nadie es 100% un solo arquetipo — que forma tu ADN.
      </p>

      <h2>Pruébalo ahora</h2>
      <p>
        ¿No tienes ganas de conectar Spotify todavía? Haz el quiz{' '}
        <Link href="/tools/oyente">¿Qué tipo de oyente eres?</Link> y obtén una primera versión de tu arquetipo en 6
        preguntas. Cuando conectes tu cuenta, Steatify lo calcula <strong>de verdad</strong> con tu historial real.
      </p>
    </ArticleShell>
  );
}
