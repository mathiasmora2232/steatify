export type ChangeKind = 'new' | 'improved' | 'fixed';

export interface ChangeEntry {
  kind: ChangeKind;
  text: string;
}
export interface Release {
  version: string;
  title: string;
  date: string; // ISO
  changes: ChangeEntry[];
}

export const KIND_META: Record<ChangeKind, { label: string; emoji: string; color: string }> = {
  new: { label: 'Nuevo', emoji: '✨', color: '#1db954' },
  improved: { label: 'Mejorado', emoji: '⚡', color: '#7c5cff' },
  fixed: { label: 'Arreglado', emoji: '🔧', color: '#38bdf8' },
};

export const RELEASES: Release[] = [
  {
    version: '1.5',
    title: 'Negocio y administración',
    date: '2026-06-27',
    changes: [
      { kind: 'new', text: 'Panel de administración con métricas reales (usuarios, actividad, conexiones, sistema)' },
      { kind: 'new', text: 'Planes Free / Plus / Pro y página de precios' },
      { kind: 'new', text: 'Roles de usuario para operar el producto de forma segura' },
    ],
  },
  {
    version: '1.4',
    title: 'Tu identidad como carta RPG',
    date: '2026-06-25',
    changes: [
      { kind: 'new', text: 'Vitrinas estilo Steam: arma tu perfil con canciones, artistas, álbumes y juegos' },
      { kind: 'new', text: 'Insignias con rareza (común → mítico) y títulos equipables' },
      { kind: 'new', text: 'Perfil dinámico: tu “estado actual” cambia solo (Modo Nostalgia, Explorador…)' },
      { kind: 'new', text: 'Temas desbloqueables por logros y builder de secciones del perfil' },
      { kind: 'improved', text: 'Hero del perfil estilo Discord con tu portada' },
    ],
  },
  {
    version: '1.3',
    title: 'Social y Perfil 2.0',
    date: '2026-06-22',
    changes: [
      { kind: 'new', text: 'Compare Spaces: compatibilidad (Vibe Match) entre dos usuarios' },
      { kind: 'new', text: 'Seguir amigos y feed automático de su actividad' },
      { kind: 'new', text: 'Perfil 2.0: pasaporte, colecciones, línea temporal' },
      { kind: 'new', text: 'Imagen dinámica al compartir tu perfil + notificaciones narrativas' },
    ],
  },
  {
    version: '1.2',
    title: 'Cuenta y seguridad',
    date: '2026-06-20',
    changes: [
      { kind: 'new', text: 'Cerrar sesión y gestión de sesiones en varios dispositivos' },
      { kind: 'new', text: 'Contraseña para entrar sin depender de Spotify' },
      { kind: 'new', text: 'Temas de apariencia que se sincronizan entre tus dispositivos' },
      { kind: 'improved', text: 'Límites de peticiones y políticas de privacidad/términos' },
      { kind: 'fixed', text: 'Sesiones colgadas: el refresh ya no rota el token (no más logouts espurios)' },
    ],
  },
  {
    version: '1.1',
    title: 'Steatify en producción',
    date: '2026-06-15',
    changes: [
      { kind: 'new', text: 'Steatify en vivo en codecanvas3d.com' },
      { kind: 'new', text: 'Logo y favicon (la S que fusiona música y gaming)' },
      { kind: 'improved', text: 'App responsive con navegación móvil' },
    ],
  },
  {
    version: '1.0',
    title: 'Lanzamiento',
    date: '2026-06-10',
    changes: [
      { kind: 'new', text: 'Dashboard, Spotify, Steam, Wrapped, ADN Musical, Eras e Insights con IA' },
    ],
  },
];
