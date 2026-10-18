export type PlanKey = 'FREE' | 'PLUS' | 'PRO';

export interface PlanDef {
  key: PlanKey;
  name: string;
  tagline: string;
  priceMonth: number;
  priceYear: number;
  accent: string;
  highlight?: boolean;
  features: string[];
}

export const PLANS: PlanDef[] = [
  {
    key: 'FREE',
    name: 'Free',
    tagline: 'Prueba tu universo',
    priceMonth: 0,
    priceYear: 0,
    accent: '#9ca3af',
    features: [
      'Spotify + Steam conectados',
      'Now Playing en vivo',
      'Historial de los últimos 30 días',
      'Rankings Top 10',
      'Wrapped mensual básico',
      'Perfil público + 1 vitrina',
      '3 comparaciones / mes',
    ],
  },
  {
    key: 'PLUS',
    name: 'Plus',
    tagline: 'Desbloquea tu historia completa',
    priceMonth: 3.99,
    priceYear: 35.99,
    accent: '#7c5cff',
    highlight: true,
    features: [
      'Todo lo de Free',
      'Import histórico completo (todos tus años)',
      'Estadísticas lifetime + rankings ilimitados',
      'Wrapped de cualquier periodo',
      'Todas tus eras',
      'Economía de biblioteca Steam (valor, precio/hora)',
      'Backlog inteligente + joyas ocultas',
      'Comparaciones ilimitadas',
      '5 vitrinas + temas premium + banners',
      '30 créditos de IA / mes',
    ],
  },
  {
    key: 'PRO',
    name: 'Pro',
    tagline: 'Tu identidad digital como plataforma',
    priceMonth: 8.99,
    priceYear: 79,
    accent: '#fbbf24',
    features: [
      'Todo lo de Plus',
      'Steatify Brain — asistente IA de tu universo (500 créditos)',
      'Vitrinas ilimitadas + temas animados + efectos',
      'Reportes y alertas inteligentes',
      'Más apps conectadas (PSN, Xbox, Letterboxd…)',
      'Export CSV / JSON + API personal',
      'URL especial + perfil totalmente editable',
    ],
  },
];

export function planByKey(key?: string): PlanDef | undefined {
  return PLANS.find((p) => p.key === key);
}
