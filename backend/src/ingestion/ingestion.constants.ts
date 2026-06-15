export const SYNC_QUEUE = 'sync';

export const SyncJob = {
  /** Pull a single user's recently-played and ingest it. */
  RECENT_PLAYS: 'recent-plays',
} as const;

export interface RecentPlaysJobData {
  userId: string;
  reason: 'cron' | 'manual' | 'login';
}
