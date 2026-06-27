import Link from 'next/link';
import { ArticleShell } from '@/components/ArticleShell';

export const metadata = {
  title: '¿Qué es Sonora Space? Tu identidad digital de música y gaming',
  description: 'Sonora convierte tu historial de Spotify y tu biblioteca de Steam en una identidad viva: estadísticas, eras, arquetipos y un perfil para compartir. Esto es Sonora Space.',
  alternates: { canonical: '/que-es-sonora' },
};

export default function Page() {
  return (
    <ArticleShell
      title="¿Qué es Sonora Space?"
      lead="Sonora convierte tu música y tus juegos en una identidad digital viva — no solo números, sino quién eres según tus datos."
    >
      <p>
        <strong>Sonora Space</strong> es una aplicación que conecta tu cuenta de Spotify y tu biblioteca de Steam para
        transformar tu actividad en estadísticas, historia y, sobre todo, <strong>identidad</strong>. Donde otras apps te
        muestran cuántos minutos escuchaste, Sonora te dice qué significan: en qué <em>era</em> estás, qué arquetipo de
        oyente eres y cómo ha cambiado tu universo con el tiempo.
      </p>

      <h2>Tu música, todo el año</h2>
      <p>
        En vez de esperar a diciembre, Sonora es un <Link href="/spotify-wrapped-permanente">Spotify Wrapped permanente</Link>:
        rankings, minutos, tus obsesiones del momento, canciones que amaste y abandonaste, y récords personales — actualizados
        en tiempo real.
      </p>

      <h2>Tu gaming, con sentido</h2>
      <p>
        Conecta Steam y Sonora analiza tu biblioteca: horas, backlog, joyas ocultas y hasta el valor real de tu colección.
        Por primera vez, tu música y tu gaming viven juntos en una sola identidad.
      </p>

      <h2>Tu identidad</h2>
      <ul>
        <li><strong>ADN musical</strong>: tus arquetipos — Looper, Nocturno, Explorador, Coleccionista…</li>
        <li><strong>Eras</strong>: cada mes es un capítulo con nombre propio.</li>
        <li><strong>Perfil público</strong>: una carta de identidad con nivel, rareza, vitrinas e insignias, lista para compartir.</li>
      </ul>

      <h2>¿En qué se diferencia?</h2>
      <p>
        Stats.fm te da estadísticas de música. SteamDB te da datos de juegos. <strong>Sonora une las dos mitades</strong> y
        las convierte en una historia que se siente tuya. Las estadísticas son solo la materia prima; lo que vendemos es
        identidad.
      </p>

      <p>
        ¿Quieres probar sin conectar nada? Empieza por el quiz{' '}
        <Link href="/tools/oyente">¿Qué tipo de oyente eres?</Link> o mira{' '}
        <Link href="/tools">todas las herramientas gratis</Link>.
      </p>
    </ArticleShell>
  );
}
