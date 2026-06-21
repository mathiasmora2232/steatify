import {
  LayoutDashboard,
  Users,
  Gift,
  Dna,
  Trophy,
  Layers,
  TrendingUp,
  CalendarDays,
  Medal,
  Sparkles,
  Gamepad2,
  Download,
  Settings,
  Gauge,
  Compass,
  Crown,
  Moon,
  Repeat,
  History,
  Headphones,
  Flame,
  Clock,
  Drama,
  Music,
  Disc3,
  Star,
  Zap,
  Sun,
  Sunset,
  Skull,
  TrendingDown,
  Minus,
  Plus,
  Lock,
  Share2,
  Heart,
  type LucideIcon,
  GitCompareArrows,
} from 'lucide-react';

/**
 * Central icon registry. The whole app draws from lucide-react so iconography
 * is consistent everywhere (no more mixed emoji). Data-driven surfaces map a
 * stable backend `key` (archetype, dna trait, etc.) to an icon here, so the
 * backend never has to know about presentation.
 */

export type { LucideIcon };

/** Left-nav route icons, keyed by href. */
export const navIcon: Record<string, LucideIcon> = {
  '/dashboard': LayoutDashboard,
  '/dashboard/wrapped': Gift,
  '/dashboard/dna': Dna,
  '/dashboard/rankings': Trophy,
  '/dashboard/eras': Layers,
  '/dashboard/versus': GitCompareArrows,
  '/dashboard/social': Users,
  '/dashboard/trends': TrendingUp,
  '/dashboard/graveyard': Skull,
  '/dashboard/activity': CalendarDays,
  '/dashboard/achievements': Medal,
  '/dashboard/insights': Sparkles,
  '/dashboard/steam': Gamepad2,
  '/dashboard/import': Download,
  '/dashboard/settings': Settings,
  '/dashboard/admin': Gauge,
};

/** DNA archetypes (dna.service keys). */
export const archetypeIcon: Record<string, LucideIcon> = {
  explorer: Compass,
  loyal: Crown,
  nocturnal: Moon,
  obsessive: Repeat,
  nostalgic: History,
  marathoner: Headphones,
};

/** Four headline DNA bars (wrapped-derive keys). */
export const dnaBarIcon: Record<string, LucideIcon> = {
  night: Moon,
  loop: Repeat,
  gamer: Gamepad2,
  explorer: Compass,
};

/** Time-of-day buckets. */
export const partOfDayIcon: Record<string, LucideIcon> = {
  morning: Sun,
  afternoon: Sunset,
  night: Moon,
};

/** Artist-stock trend directions. */
export const trendIcon: Record<string, LucideIcon> = {
  up: TrendingUp,
  rising: TrendingUp,
  down: TrendingDown,
  falling: TrendingDown,
  new: Plus,
  flat: Minus,
  stable: Minus,
};

/** Generic semantic icons used across cards/headers. */
export const I = {
  overview: LayoutDashboard,
  wrapped: Gift,
  dna: Dna,
  rankings: Trophy,
  eras: Layers,
  trends: TrendingUp,
  activity: CalendarDays,
  achievements: Medal,
  insights: Sparkles,
  steam: Gamepad2,
  music: Music,
  nowPlaying: Disc3,
  minutes: Clock,
  obsession: Flame,
  topArtist: Crown,
  mood: Drama,
  gaming: Gamepad2,
  energy: Zap,
  star: Star,
  cemetery: Skull,
  locked: Lock,
  share: Share2,
  heart: Heart,
  sparkle: Sparkles,
} satisfies Record<string, LucideIcon>;

/**
 * Render a lucide icon by semantic key with sensible defaults.
 * Usage: <Icon icon={I.minutes} className="h-4 w-4" />
 */
export function Icon({
  icon: IconCmp,
  className = 'h-4 w-4',
  strokeWidth = 2,
  style,
}: {
  icon: LucideIcon;
  className?: string;
  strokeWidth?: number;
  style?: React.CSSProperties;
}) {
  return <IconCmp className={className} strokeWidth={strokeWidth} style={style} aria-hidden />;
}
