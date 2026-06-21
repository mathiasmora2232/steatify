import Link from 'next/link';

export const metadata = {
  title: 'Privacy Policy · Sonora',
  description: 'How Sonora handles your data.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-[var(--color-accent)] hover:underline">← Sonora</Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Privacy Policy</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Última actualización: 15 de junio de 2026</p>

      <div className="prose-sonora mt-8 space-y-6 text-[15px] leading-relaxed text-[var(--color-text)]">
        <p>
          Sonora ("Sonora Space", "nosotros") es una app que convierte tu actividad de música y
          gaming en estadísticas personales: rankings, eras, tendencias, logros y un resumen tipo
          Wrapped. Esta política explica qué datos usamos, para qué, y cómo controlarlos.
          <strong> No vendemos tus datos ni modificamos tu cuenta de Spotify.</strong>
        </p>

        <Section title="1. Qué datos recogemos">
          <p>Cuando conectas Spotify (vía OAuth, acceso de solo lectura) accedemos a:</p>
          <ul>
            <li><code>user-read-email</code>, <code>user-read-private</code> — tu correo y perfil básico (nombre, id, imagen) para crear tu cuenta.</li>
            <li><code>user-read-recently-played</code> — tu historial de reproducciones recientes, para construir tus estadísticas a lo largo del tiempo.</li>
            <li><code>user-top-read</code> — tus artistas y canciones más escuchados.</li>
            <li><code>user-read-currently-playing</code> — lo que suena ahora, para el widget en vivo.</li>
          </ul>
          <p>
            <strong>Steam (opcional):</strong> si lo conectas, leemos tu biblioteca pública de juegos y horas
            jugadas. <strong>Cuenta:</strong> si pones email + contraseña, guardamos el email y un hash de la
            contraseña (nunca la contraseña en texto plano). <strong>Perfil:</strong> avatar/banner que subas
            (se procesan a una imagen pequeña).
          </p>
        </Section>

        <Section title="2. Para qué los usamos">
          <p>
            Únicamente para generar y mostrarte tus estadísticas dentro de Sonora: minutos, reproducciones,
            rankings, eras, arquetipos, comparaciones, tu Wrapped y tu perfil público (si lo activas). No
            usamos tus datos para publicidad, no los vendemos, no los compartimos con terceros con fines
            comerciales, y no escribimos ni alteramos nada en tu cuenta de Spotify (acceso de solo lectura).
          </p>
        </Section>

        <Section title="3. Dónde se guardan">
          <p>
            Tus datos se almacenan en una base de datos PostgreSQL gestionada (Supabase). Los tokens de
            acceso de Spotify/Steam se guardan <strong>cifrados</strong>. La app corre en Vercel (frontend) y
            Railway (backend). Estos proveedores procesan datos solo para alojar el servicio.
          </p>
        </Section>

        <Section title="4. Tu control: desconectar y borrar">
          <ul>
            <li><strong>Desconectar Spotify/Steam</strong> en Ajustes → Conexiones, cuando quieras.</li>
            <li><strong>Privacidad del perfil</strong>: eliges qué se muestra públicamente (música, gaming, o nada).</li>
            <li><strong>Borrar tu cuenta</strong> en Ajustes → Datos: elimina permanentemente tu cuenta y todos tus datos asociados.</li>
          </ul>
        </Section>

        <Section title="5. Spotify">
          <p>
            Sonora usa la Spotify Web API y cumple los Spotify Developer Terms. Spotify es responsable de los
            datos dentro de tu cuenta de Spotify. Puedes revocar el acceso de Sonora en cualquier momento desde{' '}
            <a href="https://www.spotify.com/account/apps/" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">tu cuenta de Spotify → Apps</a>.
          </p>
        </Section>

        <Section title="6. Menores y cambios">
          <p>
            Sonora no está dirigido a menores de 13 años. Podemos actualizar esta política; los cambios
            relevantes se reflejarán en esta página con su fecha.
          </p>
        </Section>

        <Section title="7. Contacto">
          <p>
            Dudas o solicitudes sobre tus datos:{' '}
            <a href="mailto:aitools@iguanadigital.com.ec" className="text-[var(--color-accent)] hover:underline">aitools@iguanadigital.com.ec</a>.
          </p>
        </Section>
      </div>

      <p className="mt-10 text-sm text-[var(--color-muted)]">
        Ver también los <Link href="/terms" className="text-[var(--color-accent)] hover:underline">Términos de servicio</Link>.
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-2 text-[var(--color-muted)] [&_a]:text-[var(--color-accent)] [&_code]:rounded [&_code]:bg-[var(--color-surface-2)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-[var(--color-text)] [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
