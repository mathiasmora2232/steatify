import type { PublicProfile } from '@/lib/api';

const steam = (id: number) => `https://cdn.cloudflare.steamstatic.com/steam/apps/${id}/header.jpg`;

/** A rich, fictional profile so visitors can see what their Sonora looks like
 *  without connecting anything. Read by <ProfileBody>. */
export const DEMO_PROFILE = {
  username: 'echo',
  displayName: 'Echo',
  avatarUrl: 'https://api.dicebear.com/7.x/bottts-neutral/png?seed=Echo&backgroundColor=1db954',
  bannerUrl: null,
  bio: 'Cuenta de ejemplo. Así se vería tu universo Sonora.',
  location: 'En tu pantalla',
  website: null,
  isPublic: true,
  createdAt: '2024-06-01T00:00:00.000Z',
  personalityName: 'Coleccionista 📦',
  personality: { key: 'collector', label: 'Coleccionista', emoji: '📦', tagline: 'No solo escuchas: atesoras.' },
  mood: { key: 'nostalgia', label: 'Modo Nostalgia', emoji: '🌙', detail: 'Reviviste 28 canciones de tu pasado' },
  mix: [
    { key: 'looper', label: 'Looper', emoji: '🔁', pct: 42 },
    { key: 'nocturno', label: 'Nocturno', emoji: '🌙', pct: 28 },
    { key: 'coleccionista', label: 'Coleccionista', emoji: '📦', pct: 18 },
    { key: 'explorador', label: 'Explorador', emoji: '🧭', pct: 12 },
  ],
  music: {
    minutes: 124500,
    plays: 38200,
    uniqueArtists: 612,
    songOfPeriod: { name: 'Self Care', imageUrl: null, plays: 240 },
    topArtist: { name: 'Mac Miller', imageUrl: null },
  },
  gaming: {
    linked: true,
    hours: 1480,
    games: 220,
    topGame: { name: 'Terraria', headerUrl: steam(105600), hours: 158 },
  },
  collections: { obsesiones: 740, mundos: 220, leyendas: 130, cementerio: 610 },
  exploration: 62,
  timeline: [
    { date: '2026-05-01', title: 'Era Bad Bunny', type: 'dominada' },
    { date: '2026-02-01', title: 'Indie nocturno melancólico', type: 'nocturna' },
    { date: '2025-11-01', title: 'Verano de descubrimiento', type: 'exploradora' },
    { date: '2025-07-01', title: 'Trap en bucle', type: 'obsesiva' },
  ],
  showcase: {
    title: 'loop_master',
    items: [
      { type: 'game', id: '105600', name: 'Terraria', image: steam(105600), sub: '158 horas' },
      { type: 'game', id: '271590', name: 'GTA V', image: steam(271590), sub: '142 horas' },
      { type: 'artist', id: 'mac', name: 'Mac Miller', image: null, sub: '9.640 min' },
      { type: 'song', id: 'sc', name: 'Self Care', image: null, sub: '240 reproducciones' },
      { type: 'game', id: '1145360', name: 'Hades', image: steam(1145360), sub: '96 horas' },
    ],
  },
} as unknown as PublicProfile;
