import Link from 'next/link';
import { LegalShell } from '@/components/LegalShell';

export const metadata = {
  title: 'Términos de Servicio · Sonora',
  description: 'Términos y condiciones de uso de Sonora.',
};

const EMAIL = 'codecanvas3dstudio@codecanvas3d.com';

export default function TermsPage() {
  return (
    <LegalShell title="Términos de Servicio" updated="Última actualización: 21 de junio de 2026 · Versión 2.0">
        <p className="text-[var(--color-muted)]">
          Estos Términos de Servicio ("Términos") regulan el acceso y uso de <strong className="text-[var(--color-text)]">Sonora</strong>{' '}
          ("Sonora Space", "el servicio", "nosotros"), operado por CodeCanvas 3D Studio. Al crear una cuenta, conectar
          un servicio o usar la aplicación, declaras haber leído, entendido y aceptado estos Términos y nuestra{' '}
          <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Política de Privacidad</Link>.
          Si no estás de acuerdo, no uses el servicio.
        </p>

        <Section n="1" title="Aceptación de los Términos">
          <p>
            El uso de Sonora está condicionado a la aceptación de estos Términos. Constituyen un acuerdo legalmente
            vinculante entre tú y el operador del servicio. Si usas Sonora en nombre de una organización, declaras tener
            autoridad para aceptar estos Términos en su nombre.
          </p>
        </Section>

        <Section n="2" title="Elegibilidad">
          <p>
            Debes tener al menos 13 años (o la edad mínima legal en tu jurisdicción) para usar Sonora. Al usarlo,
            declaras y garantizas que cumples este requisito y que la información que proporcionas es veraz y actual.
          </p>
        </Section>

        <Section n="3" title="Descripción del servicio">
          <p>
            Sonora es una herramienta personal de estadísticas que conecta, de forma opcional y con acceso de solo
            lectura, tus cuentas de Spotify y/o Steam para mostrarte análisis de tu actividad de música y gaming
            (rankings, eras, arquetipos, logros, comparaciones, resúmenes y perfil). El servicio puede cambiar,
            evolucionar o discontinuarse en cualquier momento.
          </p>
        </Section>

        <Section n="4" title="Tu cuenta">
          <p>
            Eres responsable de mantener la confidencialidad de tus credenciales y de toda actividad realizada bajo tu
            cuenta. Debes notificarnos de inmediato ante cualquier uso no autorizado. No nos hacemos responsables por
            pérdidas derivadas del incumplimiento de esta obligación.
          </p>
        </Section>

        <Section n="5" title="Conexiones de terceros (Spotify y Steam)">
          <p>
            Al conectar Spotify o Steam, nos autorizas a acceder en modo de <strong>solo lectura</strong> a los datos
            descritos en la <Link href="/privacy" className="text-[var(--color-accent)] hover:underline">Política de Privacidad</Link>.
            Sonora <strong>no está afiliado, patrocinado ni respaldado por Spotify AB ni por Valve Corporation/Steam</strong>.
            Tu uso de esos servicios se rige además por sus propios términos. Puedes revocar el acceso o desconectar esos
            servicios en cualquier momento desde Ajustes.
          </p>
        </Section>

        <Section n="6" title="Licencia de uso">
          <p>
            Te concedemos una licencia limitada, personal, no exclusiva, intransferible y revocable para usar Sonora con
            fines personales y no comerciales, conforme a estos Términos.
          </p>
        </Section>

        <Section n="7" title="Funciones de Inteligencia Artificial (IA) — descargo">
          <p>
            Sonora puede usar modelos de IA para generar resúmenes, narrativas e "insights". Dichos contenidos son{' '}
            <strong>generados automáticamente, con fines de entretenimiento e informativos</strong>, y:
          </p>
          <ul>
            <li>Pueden contener errores, imprecisiones o afirmaciones desactualizadas.</li>
            <li>No constituyen asesoría profesional, financiera, médica, psicológica ni de ningún otro tipo.</li>
            <li>No deben tomarse como hechos verificados ni como recomendaciones.</li>
          </ul>
          <p>Eres el único responsable de las decisiones que tomes basándote en dichos contenidos.</p>
        </Section>

        <Section n="8" title="Uso aceptable">
          <p>Te comprometes a NO:</p>
          <ul>
            <li>Usar Sonora para actividades ilegales o que infrinjan derechos de terceros.</li>
            <li>Acceder, extraer o recopilar datos de otros usuarios sin su consentimiento.</li>
            <li>Intentar vulnerar, sobrecargar o interferir con la seguridad o el funcionamiento del servicio.</li>
            <li>Realizar ingeniería inversa, copiar o revender el servicio sin autorización.</li>
            <li>Suplantar identidades o publicar contenido ofensivo, difamatorio o ilícito en tu perfil.</li>
          </ul>
          <p>Podemos suspender o cancelar cuentas que incumplan estas reglas.</p>
        </Section>

        <Section n="9" title="Propiedad intelectual">
          <p>
            El software, la marca, el diseño y el contenido original de Sonora son propiedad de sus titulares y están
            protegidos por las leyes aplicables. Tú conservas los derechos sobre el contenido que subes (avatar, biografía),
            y nos otorgas una licencia limitada para mostrarlo dentro del servicio según tu configuración de privacidad.
            Las marcas de Spotify, Steam y terceros pertenecen a sus respectivos dueños.
          </p>
        </Section>

        <Section n="10" title="Exención de garantías">
          <p>
            El servicio se proporciona <strong>"TAL CUAL" y "SEGÚN DISPONIBILIDAD"</strong>, sin garantías de ningún tipo,
            expresas o implícitas, incluidas las de comerciabilidad, idoneidad para un fin particular, exactitud o
            disponibilidad ininterrumpida. No garantizamos que el servicio sea seguro, libre de errores o que los datos
            de terceros (Spotify, Steam) estén siempre disponibles o sean exactos.
          </p>
        </Section>

        <Section n="11" title="Limitación de responsabilidad">
          <p>
            En la máxima medida permitida por la ley, ni Sonora, ni CodeCanvas 3D Studio, ni sus operadores o colaboradores
            serán responsables por daños indirectos, incidentales, especiales, punitivos o consecuentes, ni por pérdida de
            datos, de uso, de ingresos o de oportunidades, derivados de o relacionados con el uso o la imposibilidad de
            uso del servicio. En cualquier caso, nuestra responsabilidad total agregada se limita al mayor entre el monto
            que hayas pagado por el servicio (si lo hubiera) o USD 50.
          </p>
        </Section>

        <Section n="12" title="Indemnización">
          <p>
            Aceptas indemnizar y mantener indemne a Sonora y a sus operadores frente a cualquier reclamo, daño, pérdida o
            gasto (incluidos honorarios legales razonables) que surja de tu incumplimiento de estos Términos, de tu uso
            indebido del servicio o de la violación de derechos de terceros.
          </p>
        </Section>

        <Section n="13" title="Suspensión y terminación">
          <p>
            Puedes dejar de usar Sonora y eliminar tu cuenta en cualquier momento desde Ajustes. Podemos suspender o
            cancelar tu acceso si incumples estos Términos o si lo exige la ley. Tras la terminación, las cláusulas que
            por su naturaleza deban subsistir (propiedad intelectual, exenciones, limitación de responsabilidad,
            indemnización) seguirán vigentes.
          </p>
        </Section>

        <Section n="14" title="Modificaciones">
          <p>
            Podemos modificar el servicio o estos Términos. Publicaremos la versión vigente en esta página con su fecha y,
            cuando los cambios sean sustanciales, procuraremos avisarte dentro de la app. El uso continuado tras la
            entrada en vigor de los cambios constituye tu aceptación de los mismos.
          </p>
        </Section>

        <Section n="15" title="Ley aplicable y jurisdicción">
          <p>
            Estos Términos se rigen por las leyes de la República del Ecuador, sin perjuicio de las normas imperativas de
            protección al consumidor de tu lugar de residencia. Cualquier controversia se someterá a los tribunales
            competentes, salvo disposición legal en contrario.
          </p>
        </Section>

        <Section n="16" title="Disposiciones generales">
          <p>
            Si alguna cláusula se considera inválida, el resto seguirá vigente. La falta de ejercicio de un derecho no
            implica su renuncia. Estos Términos, junto con la Política de Privacidad, constituyen el acuerdo completo
            entre las partes respecto al servicio.
          </p>
        </Section>

        <Section n="17" title="Contacto">
          <p>
            Para consultas sobre estos Términos:{' '}
            <a href={`mailto:${EMAIL}`} className="text-[var(--color-accent)] hover:underline">{EMAIL}</a>.
          </p>
        </Section>
    </LegalShell>
  );
}

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-lg font-semibold text-white">{n}. {title}</h2>
      <div className="space-y-2 text-[var(--color-muted)] [&_a]:text-[var(--color-accent)] [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-[var(--color-text)] [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
