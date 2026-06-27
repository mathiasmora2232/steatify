import Link from 'next/link';
import { LegalShell } from '@/components/LegalShell';

export const metadata = {
  title: 'Política de Privacidad · Sonora',
  description: 'Cómo Sonora recopila, usa y protege tus datos.',
};

const EMAIL = 'codecanvas3dstudio@codecanvas3d.com';

export default function PrivacyPage() {
  return (
    <LegalShell title="Política de Privacidad" updated="Última actualización: 21 de junio de 2026 · Versión 2.0">
        <p className="text-[var(--color-muted)]">
          Esta Política de Privacidad describe cómo <strong className="text-[var(--color-text)]">Sonora</strong> ("Sonora Space",
          "la aplicación", "nosotros") recopila, utiliza, almacena, comparte y protege la información de las personas que
          usan el servicio ("tú", "el usuario"). Al crear una cuenta o usar Sonora aceptas las prácticas descritas aquí.
          Léela junto con nuestros <Link href="/terms" className="text-[var(--color-accent)] hover:underline">Términos de Servicio</Link>.
          <strong className="text-[var(--color-text)]"> No vendemos tus datos personales, no publicamos en tu nombre y no
          modificamos tu cuenta de Spotify ni de Steam.</strong>
        </p>

        <Section n="1" title="Responsable del tratamiento">
          <p>
            El responsable del tratamiento de tus datos es el equipo operador de Sonora (CodeCanvas 3D Studio). Para
            cualquier asunto relacionado con privacidad puedes escribirnos a{' '}
            <a href={`mailto:${EMAIL}`} className="text-[var(--color-accent)] hover:underline">{EMAIL}</a>.
          </p>
        </Section>

        <Section n="2" title="Información que recopilamos">
          <p>Recopilamos únicamente la información necesaria para ofrecerte tus estadísticas:</p>
          <Sub title="a) Datos de tu cuenta Sonora">
            <ul>
              <li>Correo electrónico y nombre de usuario (handle público).</li>
              <li>Contraseña, almacenada siempre como un <em>hash</em> criptográfico (scrypt) — nunca en texto plano.</li>
              <li>Datos de perfil que elijas añadir: nombre visible, biografía, ubicación, sitio web, avatar y banner.</li>
            </ul>
          </Sub>
          <Sub title="b) Datos de Spotify (con tu autorización vía OAuth, solo lectura)">
            <ul>
              <li><code>user-read-email</code> y <code>user-read-private</code>: tu correo y perfil básico (nombre, país, tipo de cuenta, imagen).</li>
              <li><code>user-read-recently-played</code>: tu historial de reproducciones recientes.</li>
              <li><code>user-top-read</code>: tus artistas y canciones más escuchados.</li>
              <li><code>user-read-currently-playing</code>: lo que reproduces en el momento, para el widget en vivo.</li>
            </ul>
            <p>No solicitamos permisos de escritura ni de control de reproducción. Nunca modificamos tu biblioteca, listas ni reproducción.</p>
          </Sub>
          <Sub title="c) Datos de Steam (opcional)">
            <p>Si conectas Steam, leemos tu identificador, tu biblioteca pública de juegos y las horas jugadas, para generar tus estadísticas de gaming.</p>
          </Sub>
          <Sub title="d) Datos técnicos">
            <p>
              Para operar y proteger el servicio podemos registrar datos técnicos básicos como dirección IP, tipo de
              dispositivo/navegador y registros de actividad (logs). Usamos cookies y almacenamiento local
              estrictamente necesarios para mantener tu sesión iniciada; no usamos cookies publicitarias ni de
              rastreo de terceros.
            </p>
          </Sub>
        </Section>

        <Section n="3" title="Para qué usamos tus datos y base legal">
          <p>Tratamos tus datos con base en tu <strong>consentimiento</strong> y en la <strong>ejecución del servicio</strong> que solicitas, para:</p>
          <ul>
            <li>Generar y mostrarte tus estadísticas: minutos, reproducciones, rankings, eras, arquetipos, logros, Wrapped y tu perfil.</li>
            <li>Construir tu perfil público e identidad (si decides hacerlo público) y funciones sociales (seguir, comparar, feed de actividad).</li>
            <li>Mantener la seguridad, prevenir fraude/abuso y operar la infraestructura.</li>
            <li>Comunicarte avisos esenciales del servicio.</li>
          </ul>
          <p><strong className="text-[var(--color-text)]">No usamos tus datos para publicidad, no los vendemos ni los cedemos con fines comerciales.</strong></p>
        </Section>

        <Section n="4" title="Uso de Inteligencia Artificial (IA)">
          <p>
            Algunas funciones de Sonora (por ejemplo resúmenes, narrativas de tu Wrapped, "insights" y descripciones
            de eras) se generan con modelos de Inteligencia Artificial, que pueden ser operados por proveedores externos.
            En esos casos:
          </p>
          <ul>
            <li>Enviamos a dichos proveedores únicamente datos agregados y estadísticos necesarios para generar el texto (por ejemplo, nombres de artistas/juegos y conteos). No enviamos tu contraseña ni tus tokens de acceso.</li>
            <li>Solicitamos que tus datos <strong>no se utilicen para entrenar</strong> sus modelos.</li>
            <li>Los textos generados por IA son <strong>orientativos y automáticos</strong>: pueden contener imprecisiones y no constituyen asesoría profesional de ningún tipo.</li>
            <li>No tomamos decisiones automatizadas que produzcan efectos jurídicos o significativos sobre ti.</li>
          </ul>
        </Section>

        <Section n="5" title="Con quién compartimos información (encargados)">
          <p>No vendemos tus datos. Solo los procesan proveedores de infraestructura ("encargados del tratamiento") que nos permiten operar, bajo obligaciones de confidencialidad:</p>
          <ul>
            <li><strong>Spotify</strong> y <strong>Steam/Valve</strong>: fuentes de los datos que tú autorizas conectar.</li>
            <li><strong>Vercel</strong> (alojamiento del frontend) y <strong>Railway</strong> (alojamiento del backend).</li>
            <li><strong>Supabase</strong> (base de datos PostgreSQL gestionada).</li>
            <li>Proveedores de modelos de IA, solo para las funciones descritas en la sección 4.</li>
          </ul>
          <p>También podríamos divulgar información si la ley lo exige o para proteger derechos, seguridad o integridad del servicio.</p>
        </Section>

        <Section n="6" title="Transferencias internacionales">
          <p>
            Nuestros proveedores pueden procesar datos en servidores ubicados fuera de tu país. Al usar Sonora aceptas
            dichas transferencias, que se realizan con las garantías razonables ofrecidas por estos proveedores.
          </p>
        </Section>

        <Section n="7" title="Conservación de datos">
          <p>
            Conservamos tus datos mientras tu cuenta esté activa. Si desconectas Spotify o Steam, dejamos de sincronizar
            esa fuente. Si eliminas tu cuenta, borramos de forma permanente tu cuenta y los datos asociados, salvo lo que
            debamos conservar por obligaciones legales o de seguridad durante un periodo limitado.
          </p>
        </Section>

        <Section n="8" title="Seguridad">
          <p>
            Aplicamos medidas técnicas y organizativas razonables: los tokens de acceso de Spotify/Steam se almacenan
            <strong> cifrados</strong> (AES-256-GCM), las contraseñas se guardan como hash, y el acceso a la base de datos
            está restringido. Ningún sistema es 100% infalible; no podemos garantizar seguridad absoluta, pero trabajamos
            para protegerte.
          </p>
        </Section>

        <Section n="9" title="Tus derechos y controles">
          <p>Tienes control directo desde la app y puedes ejercer estos derechos:</p>
          <ul>
            <li><strong>Acceso y portabilidad</strong>: ver tus estadísticas y solicitar una copia de tus datos.</li>
            <li><strong>Rectificación</strong>: editar tu perfil en Ajustes.</li>
            <li><strong>Privacidad</strong>: elegir qué se muestra públicamente (música, gaming o nada) en Ajustes → Privacidad.</li>
            <li><strong>Desconexión</strong>: desvincular Spotify/Steam en Ajustes → Conexiones.</li>
            <li><strong>Supresión</strong>: eliminar tu cuenta y todos tus datos en Ajustes → Datos.</li>
            <li><strong>Revocación</strong>: retirar el acceso de Sonora desde{' '}
              <a href="https://www.spotify.com/account/apps/" target="_blank" rel="noopener noreferrer" className="text-[var(--color-accent)] hover:underline">tu cuenta de Spotify → Apps</a>.</li>
          </ul>
          <p>Para cualquier solicitud escríbenos a <a href={`mailto:${EMAIL}`} className="text-[var(--color-accent)] hover:underline">{EMAIL}</a>.</p>
        </Section>

        <Section n="10" title="Menores de edad">
          <p>
            Sonora no está dirigido a menores de 13 años (o la edad mínima que exija tu jurisdicción) y no recopilamos
            conscientemente sus datos. Si crees que un menor nos facilitó datos, contáctanos para eliminarlos.
          </p>
        </Section>

        <Section n="11" title="Cambios a esta política">
          <p>
            Podemos actualizar esta Política. Publicaremos la versión vigente en esta página con su fecha; los cambios
            sustanciales podrán comunicarse dentro de la app. El uso continuado tras una actualización implica su aceptación.
          </p>
        </Section>

        <Section n="12" title="Contacto">
          <p>
            Dudas, solicitudes o reclamos sobre privacidad:{' '}
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
      <div className="space-y-2 text-[var(--color-muted)] [&_a]:text-[var(--color-accent)] [&_code]:rounded [&_code]:bg-[var(--color-surface-2)] [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs [&_em]:not-italic [&_em]:text-[var(--color-text)] [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-[var(--color-text)] [&_ul]:space-y-1">
        {children}
      </div>
    </section>
  );
}
function Sub({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-3">
      <p className="mb-1 font-semibold text-[var(--color-text)]">{title}</p>
      {children}
    </div>
  );
}
