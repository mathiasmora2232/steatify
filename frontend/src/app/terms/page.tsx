import Link from 'next/link';

export const metadata = {
  title: 'Terms of Service · Sonora',
  description: 'Terms for using Sonora.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/" className="text-sm text-[var(--color-accent)] hover:underline">← Sonora</Link>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">Términos de servicio</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">Última actualización: 15 de junio de 2026</p>

      <div className="mt-8 space-y-6 text-[15px] leading-relaxed">
        <Section title="1. Aceptación">
          <p>Al usar Sonora ("el servicio") aceptas estos términos. Si no estás de acuerdo, no uses el servicio.</p>
        </Section>

        <Section title="2. Qué es Sonora">
          <p>
            Sonora es una herramienta personal de estadísticas que conecta tus cuentas de Spotify y/o Steam
            (de forma opcional y con acceso de solo lectura) para mostrarte análisis de tu actividad de música
            y gaming. Es un proyecto independiente, <strong>no afiliado ni respaldado por Spotify o Valve/Steam</strong>.
          </p>
        </Section>

        <Section title="3. Tu cuenta y conexiones">
          <p>
            Eres responsable de tu cuenta y de las credenciales que uses. Al conectar Spotify/Steam, autorizas
            a Sonora a leer los datos descritos en la{' '}
            <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Política de privacidad</Link>.
            Puedes desconectar esos servicios o borrar tu cuenta cuando quieras desde Ajustes.
          </p>
        </Section>

        <Section title="4. Uso aceptable">
          <p>
            No uses Sonora para actividades ilegales, para extraer datos de otros usuarios sin permiso, ni para
            intentar vulnerar la seguridad del servicio. Respeta también los términos de Spotify y Steam.
          </p>
        </Section>

        <Section title="5. Disponibilidad y garantías">
          <p>
            El servicio se ofrece "tal cual", sin garantías. Puede haber interrupciones, cambios o pérdida de
            datos. Dependemos de APIs de terceros (Spotify, Steam) que pueden limitar o cambiar su acceso, lo
            que puede afectar funciones de Sonora.
          </p>
        </Section>

        <Section title="6. Limitación de responsabilidad">
          <p>
            En la medida que permita la ley, Sonora no será responsable de daños indirectos o pérdida de datos
            derivados del uso del servicio.
          </p>
        </Section>

        <Section title="7. Cambios y terminación">
          <p>
            Podemos actualizar estos términos o discontinuar el servicio. Puedes terminar tu uso borrando tu
            cuenta en cualquier momento.
          </p>
        </Section>

        <Section title="8. Contacto">
          <p>
            <a href="mailto:aitools@iguanadigital.com.ec" className="text-[var(--color-accent)] hover:underline">aitools@iguanadigital.com.ec</a>
          </p>
        </Section>
      </div>

      <p className="mt-10 text-sm text-[var(--color-muted)]">
        Ver también la <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Política de privacidad</Link>.
      </p>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-white">{title}</h2>
      <div className="space-y-2 text-[var(--color-muted)] [&_strong]:text-[var(--color-text)]">{children}</div>
    </section>
  );
}
