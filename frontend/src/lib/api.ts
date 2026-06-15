/** Thin fetch wrapper. Always sends cookies (httpOnly session) and, on a 401,
 *  transparently tries one refresh before giving up. */
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api';

async function request<T>(path: string, init?: RequestInit, retried = false): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });

  if (res.status === 401 && !retried) {
    const refreshed = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) return request<T>(path, init, true);
  }

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

/** Multipart upload of an image field (avatar/banner). Browser sets Content-Type. */
async function uploadImage(field: 'avatar' | 'banner', file: File): Promise<UserProfile> {
  const fd = new FormData();
  fd.append(field, file);
  const res = await fetch(`${API_URL}/users/me/${field}`, { method: 'POST', credentials: 'include', body: fd });
  if (!res.ok) throw new Error(`API ${res.status}: ${await res.text()}`);
  return res.json() as Promise<UserProfile>;
}

export const api = {
  me: () => request<UserProfile>('/users/me'),
  guestLogin: () => request<{ ok: boolean }>('/auth/guest', { method: 'POST' }),
  register: (body: { email: string; username: string; password: string }) =>
    request<{ ok: boolean }>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  loginAccount: (identifier: string, password: string) =>
    request<{ ok: boolean }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),
  updateProfile: (dto: Partial<UserProfile>) =>
    request<UserProfile>('/users/me', { method: 'PATCH', body: JSON.stringify(dto) }),
  uploadAvatar: (file: File) => uploadImage('avatar', file),
  uploadBanner: (file: File) => uploadImage('banner', file),
  deleteAccount: () => request<{ deleted: boolean }>('/users/me', { method: 'DELETE' }),
  exportData: () => request<unknown>('/users/me/export'),
  deleteInsights: () => request<{ deleted: number }>('/insights', { method: 'DELETE' }),
  connections: () => request<Connections>('/connections'),
  disconnectSpotify: () => request<{ ok: boolean }>('/connections/spotify', { method: 'DELETE' }),
  disconnectSteam: () => request<{ ok: boolean }>('/connections/steam', { method: 'DELETE' }),
  publicProfile: (username: string) => request<PublicProfile>(`/profiles/${username}`),
  setTimezone: (offsetMinutes: number) =>
    request<{ ok: boolean }>('/users/me/timezone', {
      method: 'PUT',
      body: JSON.stringify({ offsetMinutes }),
    }),
  syncNow: () => request<{ enqueued: boolean; jobId: string }>('/ingestion/sync', { method: 'POST' }),
  logout: () => request<{ ok: boolean }>('/auth/logout', { method: 'POST' }),

  // ── stats (Fase 2) ──
  summary: (range: Range = 'today') => request<Summary>(`/stats/summary?range=${range}`),
  top: (type: TopType, range: Range = '30d', limit = 10) =>
    request<TopItem[]>(`/stats/top?type=${type}&range=${range}&limit=${limit}`),
  series: (days = 14) => request<DayPoint[]>(`/stats/series?days=${days}`),
  monthlySeries: () => request<DayPoint[]>('/stats/monthly'),
  activityState: () => request<ActivityState>('/stats/activity-state'),
  weeklyRecap: () => request<WeeklyRecap>('/stats/weekly-recap'),
  todayTimeline: () => request<TodayTimeline>('/stats/today-timeline'),
  dayDetail: (day: string) => request<DayDetail>(`/stats/day?day=${day}`),
  compare: (period: 'month' | 'year' = 'month') => request<Compare>(`/stats/compare?period=${period}`),
  contributions: (days = 365) => request<ContribDay[]>(`/stats/contributions?days=${days}`),
  nowPlaying: () => request<NowPlaying>('/ingestion/now-playing'),
  clock: (range: Range = '30d') => request<ClockPoint[]>(`/stats/clock?range=${range}`),
  recentFeed: (limit = 30) => request<RecentPlay[]>(`/stats/recent?limit=${limit}`),

  // ── Window-scoped (preset / día / rango) — para la página de Actividad ──
  summaryW: (w: WindowParams) => request<Summary>(`/stats/summary?${winQS(w)}`),
  topW: (type: TopType, w: WindowParams, limit = 10) =>
    request<TopItem[]>(`/stats/top?type=${type}&limit=${limit}&${winQS(w)}`),
  clockW: (w: WindowParams) => request<ClockPoint[]>(`/stats/clock?${winQS(w)}`),
  weekdaysW: (w: WindowParams) => request<WeekdayPoint[]>(`/stats/weekdays?${winQS(w)}`),
  recentW: (w: WindowParams, limit = 40) =>
    request<RecentPlay[]>(`/stats/recent?limit=${limit}&${winQS(w)}`),

  // ── Fase 3 ──
  achievements: () => request<Achievement[]>('/achievements'),
  eras: () => request<Era[]>('/eras'),
  rebuildEras: () => request<{ eras: number }>('/eras/rebuild', { method: 'POST' }),

  // ── Fase 4 ──
  insights: () => request<AiInsight[]>('/insights'),
  insightCurrent: () => request<InsightResponse>('/insights/current'),
  insightGenerate: () => request<InsightResponse>('/insights/generate?manual=true', { method: 'POST' }),
  predictions: () => request<Prediction[]>('/predictions'),
  runPredictions: () => request<{ generated: number }>('/predictions/run', { method: 'POST' }),

  // ── Import (Extended Streaming History) ──
  importSpotify: async (files: File[]): Promise<{ accepted: number; jobId: string }> => {
    const form = new FormData();
    for (const f of files) form.append('files', f);
    // Multipart — can't use request() (it forces a JSON content-type).
    const send = () =>
      fetch(`${API_URL}/import/spotify`, { method: 'POST', credentials: 'include', body: form });
    let res = await send();
    if (res.status === 401) {
      await fetch(`${API_URL}/auth/refresh`, { method: 'POST', credentials: 'include' });
      res = await send();
    }
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  importStatus: (jobId: string) => request<ImportStatus>(`/import/status/${jobId}`),

  // ── Steam (multi-system) ──
  steamAvailable: () => request<{ available: boolean }>('/steam/available'),
  steamMe: () => request<SteamAccount | null>('/steam/me'),
  steamLink: (input: string) =>
    request<{ steamId: string; personaName: string; games: number }>('/steam/link', {
      method: 'POST',
      body: JSON.stringify({ input }),
    }),
  steamSync: () => request<{ games: number }>('/steam/sync', { method: 'POST' }),
  steamSyncFull: () => request<{ games: number }>('/steam/sync?full=true', { method: 'POST' }),
  steamSyncDebug: () => request<SteamSyncDebug>('/steam/sync-debug'),
  steamSnapshot: () => request<SteamSnapshot>('/steam/snapshot'),
  steamStats: () => request<SteamStats>('/steam/stats'),
  steamGenres: () => request<SteamGenres>('/steam/genres'),
  steamEvolution: () => request<SteamEvolution>('/steam/evolution'),
  steamMomentum: () => request<SteamMomentum>('/steam/momentum'),
  steamEconomy: () => request<SteamEconomy>('/steam/economy'),
  steamInsight: () => request<{ text: string | null; model: string | null }>('/steam/insight'),
  steamGames: () => request<SteamGame[]>('/steam/games'),
  steamLibrary: () => request<SteamGame[]>('/steam/library'),
  steamGame: (appId: number) => request<SteamGame>(`/steam/game/${appId}`),
  steamBacklog: () => request<SteamBacklog>('/steam/backlog'),

  // ── Admin / salud ──
  adminOverview: () => request<AdminOverview>('/admin/overview'),

  // ── ADN musical ──
  musicDna: () => request<MusicDna>('/dna'),

  // ── Tendencias ──
  trends: (days = 7) => request<Trends>(`/trends?days=${days}`),
  trendsMarket: (days = 7) => request<ArtistMarket>(`/trends/market?days=${days}`),
  songTrends: (days = 7) => request<SongMovers>(`/trends/songs?days=${days}`),
  songProfile: (trackId: string) => request<SongProfile>(`/songs/${trackId}`),
  artistProfile: (artistId: string) => request<ArtistProfile>(`/artists/${artistId}`),
  albumJourney: (albumId: string) => request<AlbumJourney>(`/albums/${albumId}`),
  search: (q: string) => request<SearchResults>(`/search?q=${encodeURIComponent(q)}`),
  brain: () => request<BrainResult>('/brain'),
  versus: (a: string, b: string) => request<Versus>(`/brain/versus?a=${a}&b=${b}`),
  evolution: (months = 12) => request<Evolution>(`/brain/evolution?months=${months}`),
  events: (limit = 30) => request<MusicEvent[]>(`/events?limit=${limit}`),
  refreshEvents: () => request<{ created: number }>('/events/refresh', { method: 'POST' }),
  graveyard: () => request<GraveyardPage>('/trends/graveyard'),
  graveyardCategories: () => request<GraveyardCategories>('/trends/graveyard/categories'),
  chartsRecords: () => request<ChartsRecords>('/charts/records'),
  chartsAlbums: () => request<AlbumCompletion[]>('/charts/albums'),
  eraNarrative: (id: string) => request<{ text: string | null; model: string | null }>(`/eras/${id}/narrative`),

  // ── Wrapped ──
  wrapped: (period: 'week' | 'month' | 'season' | 'year' | 'all' = 'month') =>
    request<Wrapped>(`/wrapped?period=${period}`),
};

export interface PersonalityMix {
  key: string;
  label: string;
  emoji: string;
  pct: number;
}
export interface TimelineEvent {
  date: string | null;
  emoji: string;
  title: string;
  sub: string;
}
export interface WrappedAward {
  key: string;
  emoji: string;
  label: string;
  name: string;
  sub: string;
  imageUrl: string | null;
}

export interface WrappedItem {
  name: string;
  subtitle?: string;
  imageUrl: string | null;
  plays?: number;
}

export interface Wrapped {
  period: string;
  label: string;
  hasData: boolean;
  eraName: string;
  personalityName: string;
  personality: { key: string; label: string; emoji: string; tagline: string };
  mix: PersonalityMix[];
  timeline: TimelineEvent[];
  awards: { music: WrappedAward[]; gaming: WrappedAward[] };
  music: {
    minutes: number;
    plays: number;
    uniqueArtists: number;
    songOfPeriod: WrappedItem | null;
    topArtist: WrappedItem | null;
    newObsession: WrappedItem | null;
    personality: string;
  };
  gaming: {
    linked: boolean;
    hours: number;
    games: number;
    backlog: number;
    topGame: { name: string; headerUrl: string; hours: number } | null;
  } | null;
  narrative: string | null;
}

export interface ArtistStock {
  name: string;
  imageUrl: string | null;
  recent: number;
  prior: number;
  trendPct: number | null;
  direction: 'up' | 'down' | 'flat' | 'new';
}

export interface GraveItem {
  name: string;
  artist: string;
  imageUrl: string | null;
  plays: number;
  lastPlayedAt: string;
  daysSince: number;
}

export interface Trends {
  stocks: ArtistStock[];
  graveyard: GraveItem[];
}

export interface ArtistMarket {
  dominators: { name: string; imageUrl: string | null; months: number }[];
  constants: { name: string; imageUrl: string | null; months: number }[];
  fading: { name: string; imageUrl: string | null; peakPlays: number; recentPlays: number; dropPct: number }[];
  comebacks: { name: string; imageUrl: string | null; daysAway: number; oldPlays: number; newPlays: number; score: number }[];
}

export interface SongStock {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  recent: number;
  prior: number;
  trendPct: number | null;
}

export interface SongComeback {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  daysGone: number;
  lastBeforeAt: string;
}

export interface SongMovers {
  rising: SongStock[];
  comebacks: SongComeback[];
}

export interface DormantTrack {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  plays: number;
  daysSince: number;
  lastPlayedAt: string;
}

export interface GraveyardPage {
  dormant: DormantTrack[];
  resurrected: MusicEvent[];
}

export interface GraveCard {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  plays: number;
  daysSince: number;
  peakMonth: string | null;
  peakPlays: number;
  returnProb: number;
}

export interface GraveyardCategories {
  legends: GraveCard[];
  flings: GraveCard[];
  kings: GraveCard[];
  endangered: GraveCard[];
  resurrected: MusicEvent[];
}

export interface ChartRecord {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  metric: string;
}

export interface HallOfFameEntry {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  plays: number;
  enteredYear: number;
  spanYears: number;
  reigns: number;
  alive: boolean;
}

export interface ChartsRecords {
  records: {
    mostPlayed: ChartRecord | null;
    mostNocturnal: ChartRecord | null;
    biggestLoop: ChartRecord | null;
    oldestAlive: ChartRecord | null;
  };
  hallOfFame: HallOfFameEntry[];
}

export interface AlbumCompletion {
  albumId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  listened: number;
  total: number;
  pct: number;
  plays: number;
}

export type MusicEventType =
  | 'FIRST_TIME'
  | 'COMEBACK'
  | 'NEW_OBSESSION'
  | 'NEW_RECORD'
  | 'ANNIVERSARY'
  | 'NEW_ARTIST'
  | 'ARTIST_COMEBACK'
  | 'GAME_OBSESSION';

export interface MusicEvent {
  id: string;
  type: MusicEventType;
  entityType: string;
  entityId: string | null;
  title: string;
  body: string;
  imageUrl: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface ArtistProfile {
  artistId: string;
  name: string;
  imageUrl: string | null;
  firstListenAt: string;
  lastListenAt: string;
  daysSinceLast: number;
  totalPlays: number;
  totalMinutes: number;
  totalHours: number;
  distinctTracks: number;
  recent30: number;
  allTimeRank: number;
  totalRankedArtists: number;
  pctOfLife: number;
  byYear: { year: number; plays: number }[];
  peakMonth: { ym: string; plays: number } | null;
  favoriteHour: number | null;
  topTracks: { trackId: string; name: string; plays: number; imageUrl: string | null }[];
  topAlbum: { id: string; name: string; plays: number; imageUrl: string | null } | null;
  status: string;
}

export interface AlbumTrack {
  trackId: string;
  name: string;
  durationMs: number;
  plays: number;
  heard: boolean;
}
export interface AlbumJourney {
  albumId: string;
  name: string;
  imageUrl: string | null;
  artist: { id: string; name: string } | null;
  releaseDate: string | null;
  totalTracks: number | null;
  heardTracks: number;
  completion: number | null;
  firstListenAt: string;
  lastListenAt: string;
  daysSinceLast: number;
  totalPlays: number;
  totalMinutes: number;
  totalHours: number;
  allTimeRank: number;
  totalRankedAlbums: number;
  peakMonth: { ym: string; plays: number } | null;
  byMonth: { ym: string; plays: number }[];
  tracks: AlbumTrack[];
  status: string;
}

export interface BrainDetection {
  kind: 'music' | 'gaming';
  changed: boolean;
  from: string;
  to: string;
  fromEmoji: string;
  toEmoji: string;
  reason: string;
}
export interface BrainResult {
  detections: BrainDetection[];
}

export interface PeriodSnapshot {
  ym: string;
  hasData: boolean;
  plays: number;
  minutes: number;
  uniqueArtists: number;
  topArtist: { id: string; name: string } | null;
  topTrack: { id: string; name: string; image: string | null } | null;
  topAlbum: { name: string; image: string | null } | null;
  archetype: { key: string; label: string; emoji: string };
}
export interface Versus {
  a: PeriodSnapshot;
  b: PeriodSnapshot;
}

export interface EvolutionPoint {
  ym: string;
  plays: number;
  minutes: number;
  uniqueArtists: number;
  newArtists: number;
  topArtist: string | null;
  archetype: { key: string; label: string; emoji: string };
}
export interface Evolution {
  timeline: EvolutionPoint[];
}

export interface SearchResults {
  query: string;
  artists: { artistId: string; name: string; plays: number; imageUrl: string | null }[];
  tracks: { trackId: string; name: string; artist: string | null; plays: number; imageUrl: string | null }[];
  albums: { albumId: string; name: string; plays: number; imageUrl: string | null }[];
  games: { appId: number; name: string; hours: number; headerUrl: string }[];
}

export interface SongProfile {
  trackId: string;
  name: string;
  artist: string | null;
  imageUrl: string | null;
  firstListenAt: string;
  lastListenAt: string;
  daysSinceLast: number;
  totalPlays: number;
  totalMinutes: number;
  totalHours: number;
  recent30: number;
  skips: number;
  skipRate: number;
  distinctDays: number;
  allTimeRank: number;
  totalRankedTracks: number;
  pctOfLife: number;
  byYear: { year: number; plays: number }[];
  peakMonth: { ym: string; plays: number } | null;
  favoriteHour: number | null;
  longestStreakDays: number;
  maxGapDays: number;
  states: string[];
}

export interface DnaArchetype {
  key: string;
  label: string;
  emoji: string;
  pct: number;
}

export interface MusicType {
  key: string;
  label: string;
  emoji: string;
  reason: string;
  score: number;
}

export interface ActivityState {
  state: string;
  label: string;
  reason: string;
  signals: { plays24: number; avgPerDay: number; nightPct: number; topTrackPlays: number; newArtists: number; gamingHours: number };
}

export interface WeeklyRecap {
  thisWeek: { plays: number; minutes: number; gamingHours: number; uniqueArtists: number; uniqueTracks: number; uniqueAlbums: number };
  lastWeek: { plays: number; minutes: number; gamingHours: number };
  deltas: { playsPct: number | null; minutesPct: number | null; gamingPct: number | null };
  vibe: { nightPct: number; nightShift: number; newArtists: number };
  recordWeekMinutes: number;
  isRecordWeek: boolean;
  topArtist: { name: string; plays: number } | null;
  comebackArtist: { name: string; gapDays: number; plays: number } | null;
  obsessionTrack: { name: string; artist: string | null; plays: number } | null;
}

export interface TodayTimeline {
  day: string | null;
  isToday: boolean;
  plays: number;
  first: { track: string; at: string } | null;
  last: { track: string; at: string } | null;
  peak: { hour: number; plays: number; track: string } | null;
}

export interface DayDetail {
  day: string;
  plays: number;
  minutes: number;
  topTrack: { name: string; artist: string | null } | null;
  topArtist: string | null;
  newEntry: string | null;
}

export interface MusicDna {
  hasData: boolean;
  type: MusicType | null;
  ranked: MusicType[];
  archetypes: DnaArchetype[];
  personality: string;
  patterns: {
    nightPct: number;
    repeatMultiplier: number;
    avgTrackAgeYears: number | null;
    playsPerActiveDay: number;
    newArtists30d: number;
    loyaltyPct: number;
    artistChurnPct: number;
    tracksPerAlbum: number;
  };
  totals: { plays: number; uniqueTracks: number; uniqueArtists: number; minutes: number };
}

export interface SteamBacklog {
  total: number;
  playedCount: number;
  neverPlayedCount: number;
  barelyTouchedCount: number;
  completionPct: number;
  neverPlayed: SteamGame[];
  message: string;
}

type JobCounts = Record<string, number> | null;
export interface AdminOverview {
  timestamp: string;
  services: { db: string; redis: string };
  queues: { sync: JobCounts; import: JobCounts };
  spotify: {
    lastSyncedAt: string | null;
    syncEnabled: boolean;
    tokenExpiresAt: string | null;
    tokenValid: boolean;
    scope: string | null;
  };
  steam: { lastSyncedAt: string | null };
  tzOffset: number;
  totals: {
    plays: number;
    tracks: number;
    artists: number;
    games: number;
    eras: number;
    achievementsUnlocked: number;
    insights: number;
  };
}

export interface SteamAccount {
  steamId: string;
  personaName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
  country: string | null;
  lastSyncedAt: string | null;
}

export interface SteamGame {
  appId: number;
  name: string;
  iconUrl: string | null;
  headerUrl: string;
  hoursForever: number;
  hours2Weeks: number;
  lastPlayedAt: string | null;
  genres?: string[];
  metacritic?: number | null;
  recommendations?: number | null;
  priceCents?: number | null;
  isFree?: boolean | null;
}

export interface SteamGenres {
  genres: { genre: string; hours: number }[];
  topGenre: string | null;
  enrichedPct: number;
}

export interface SteamSyncLog {
  id: string;
  gamesReceived: number;
  hoursBefore: number;
  hoursAfter: number;
  diffHours: number;
  durationMs: number;
  full: boolean;
  error: string | null;
  createdAt: string;
}

export interface SteamSyncDebug {
  lastSyncedAt: string | null;
  logs: SteamSyncLog[];
}

export interface SteamEvolution {
  points: { date: string; hours: number }[];
  monthly: { month: string; hours: number }[];
}

export interface SteamMomentum {
  gainedTodayHours: number;
  gainedWeekHours: number;
  hasBaseline: boolean;
  recentlyPlayed: SteamGame[];
  rose: (SteamGame & { gainedHours: number })[];
  resumed: SteamGame[];
}

export interface SteamSnapshot {
  account: {
    personaName: string | null;
    avatarUrl: string | null;
    profileUrl: string | null;
    country: string | null;
    steamLevel: number | null;
    memberSince: string | null;
    accountAgeYears: number | null;
    lastSyncedAt: string | null;
  } | null;
  totalGames: number;
  playedGames: number;
  unplayedGames: number;
  playedPercent: number;
  totalHours: number;
  avgHoursPerGame: number;
  avgHoursPerPlayedGame: number;
  medianHours: number;
  medianPlayedHours: number;
  topGame: { appId: number; name: string; iconUrl: string | null; hours: number } | null;
  estimatedValue: number;
  avgGamePrice: number;
  costPerHour: number;
  pricedCount: number;
  coveragePct: number;
  histogram: { label: string; key: string; count: number }[];
}

export interface SteamEconomy {
  totalValue: number;
  playedValue: number;
  unplayedValue: number;
  pricedCount: number;
  totalGames: number;
  coveragePct: number;
  totalHours: number;
  pricePerHour: number;
  buckets: { pending: number; barely: number; tried: number; played: number; heavy: number; legend: number };
}

export interface SteamStats {
  totalMinutes: number;
  totalHours: number;
  gameCount: number;
  playedCount: number;
  unplayedCount: number;
  avgHoursPlayed: number;
  topGames: SteamGame[];
  recentGames: SteamGame[];
}

export interface ImportStatus {
  found: boolean;
  state?: string;
  progress?: number;
  result?: { imported: number; total: number };
  failedReason?: string;
}

export const loginUrl = `${API_URL}/auth/spotify/login`;

export interface WindowParams {
  range?: Range;
  day?: string; // YYYY-MM-DD
  from?: string; // YYYY-MM-DD
  to?: string; // YYYY-MM-DD
}

function winQS(w: WindowParams): string {
  const p = new URLSearchParams();
  if (w.day) p.set('day', w.day);
  else if (w.from && w.to) {
    p.set('from', w.from);
    p.set('to', w.to);
  } else if (w.range) p.set('range', w.range);
  return p.toString();
}

export interface UserProfile {
  id: string;
  email?: string | null;
  username?: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl?: string | null;
  bio?: string | null;
  location?: string | null;
  website?: string | null;
  isPublic?: boolean;
  showSteam?: boolean;
  showMusic?: boolean;
  aiAuto?: boolean;
  country: string | null;
  product: string | null;
  createdAt: string;
  lastSyncedAt: string | null;
  syncEnabled: boolean;
  tzOffset?: number;
  spotifyId?: string | null;
}

export interface Connections {
  spotify: { connected: boolean; displayName: string | null; country: string | null };
  steam: { connected: boolean; steamId: string | null; personaName: string | null; avatarUrl: string | null };
}

export interface PublicProfile {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bannerUrl: string | null;
  bio: string | null;
  location: string | null;
  website: string | null;
  isPublic: boolean;
  private?: boolean;
  createdAt: string;
  personalityName?: string;
  music?: Wrapped['music'];
  gaming?: Wrapped['gaming'];
  dna?: { archetypes: DnaArchetype[]; personality: string };
  hallOfFame?: HallOfFameEntry[];
  records?: ChartsRecords['records'];
}

// ── stats types (espejo del backend) ──
export type Range = 'today' | '24h' | '7d' | '30d' | '365d' | 'all';
export type TopType = 'tracks' | 'artists' | 'albums' | 'genres';

export interface TopItem {
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string | null;
  plays: number;
  minutes: number;
}

export interface Summary {
  label: string;
  minutes: number;
  plays: number;
  uniqueTracks: number;
  uniqueArtists: number;
  uniqueAlbums: number;
  mood: { key: string; label: string } | null;
  topTrack: TopItem | null;
  topArtist: TopItem | null;
}

export interface DayPoint {
  day: string;
  minutes: number;
  plays?: number;
}

export interface NowPlaying {
  playing: boolean;
  progressMs?: number;
  durationMs?: number;
  name?: string;
  artist?: string;
  imageUrl?: string | null;
  trackUrl?: string;
}

export interface ClockPoint {
  hour: number;
  plays: number;
}

export interface WeekdayPoint {
  dow: number; // 0=Sun … 6=Sat
  plays: number;
}

export interface RecentPlay {
  playedAt: string;
  name: string;
  artist: string;
  imageUrl: string | null;
}

export interface Compare {
  period: 'month' | 'year';
  current: { label: string; minutes: number };
  previous: { label: string; minutes: number };
  deltaPct: number | null;
}

// ── Fase 3 ──
export interface ContribDay {
  day: string; // YYYY-MM-DD
  minutes: number;
  mood: string | null;
}

export interface Achievement {
  code: string;
  name: string;
  description: string;
  emoji: string | null;
  category: string;
  points: number;
  secret: boolean;
  progress: number;
  unlocked: boolean;
  unlockedAt: string | null;
  meta: { value?: number; threshold?: number } | null;
}

export interface Era {
  id: string;
  startDate: string;
  endDate: string | null;
  title: string;
  summary: string | null;
  dominantGenres: string[] | null;
  dominantArtists: string[] | null;
  dominantMood: string | null;
  peakHour: number | null;
  confidence: number | null;
  eraType: string | null;
  topTracks: { name: string; artist: string | null; plays: number }[] | null;
  badges: string[] | null;
  signals: {
    dominantArtistShare: number;
    top3Share: number;
    repeatScore: number;
    explorationScore: number;
    nostalgiaScore: number;
    nightScore: number;
  } | null;
}

// ── Fase 4 ──
export interface InsightSignals {
  week: { minutes: number; plays: number; uniqueArtists: number; prevMinutes: number; deltaPct: number | null };
  topTracks: { name: string; artist: string | null; plays: number }[];
  topArtists: { name: string; plays: number }[];
  rising: { name: string; artist: string | null; growthPct: number }[];
  comeback: { name: string; gapDays: number } | null;
  drops: { name: string; dropPct: number }[];
  gaming: {
    hoursGained: number;
    topGrowthGame: { name: string; hours: number } | null;
    recentlyPlayed: string[];
    unplayedCount: number;
    notableUnplayed: string | null;
    obsessionGames: { name: string; score: number }[];
  };
  obsessions: {
    songs: { name: string; artist: string | null; score: number }[];
    artists: { name: string; score: number }[];
    games: { name: string; score: number }[];
  };
}

export interface InsightNarrative {
  summary: string;
  music: string[];
  gaming: string[];
  predictions: string[];
  recommendation: string;
  model: string | null;
}

export interface InsightRow {
  id: string;
  model: string | null;
  createdAt: string;
  data: { signals: InsightSignals; narrative: InsightNarrative; generatedAt: string } | null;
}

export interface InsightResponse {
  insight: InsightRow | null;
  rateLimited: boolean;
  remaining: number;
}

export interface AiInsight {
  id: string;
  kind: string;
  periodStart: string;
  periodEnd: string;
  title: string;
  body: string;
  model: string | null;
  createdAt: string;
}

export interface Prediction {
  trackId: string;
  name: string;
  artist: string;
  imageUrl: string | null;
  score: number;
  recentPlays: number;
  growthRate: number | null;
}
