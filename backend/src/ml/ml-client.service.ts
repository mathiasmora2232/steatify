import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance, isAxiosError } from 'axios';
import type { Env } from '../config/env';

export interface TrackPlayPayload {
  track_id: string;
  title: string;
  artist: string;
  plays: number;
  valence?: number | null;
  energy?: number | null;
}

export interface WeeklyInsightPayload {
  user_id: string;
  period_start: string;
  period_end: string;
  total_minutes: number;
  top_tracks: TrackPlayPayload[];
  avg_valence?: number | null;
  avg_energy?: number | null;
  prev_total_minutes?: number | null;
  events?: string[]; // notable music_events this week (comebacks, records, …)
}

export interface WeeklyInsightResult {
  title: string;
  body: string;
  model: string;
}

export interface ObsessionScore {
  track_id: string;
  score: number;
  growth_rate?: number | null;
}

/**
 * Thin client for the FastAPI ML service. The backend stays the sole owner of
 * the database; this service only sends already-aggregated features and gets
 * back text/scores. Network failures degrade gracefully (callers handle null).
 */
@Injectable()
export class MlClientService {
  private readonly logger = new Logger(MlClientService.name);
  private readonly http: AxiosInstance;

  constructor(config: ConfigService<Env, true>) {
    this.http = axios.create({
      baseURL: config.get('ML_SERVICE_URL', { infer: true }),
      timeout: 60_000, // LLM calls can be slow
    });
  }

  async weeklyInsight(payload: WeeklyInsightPayload): Promise<WeeklyInsightResult | null> {
    try {
      const { data } = await this.http.post<WeeklyInsightResult>('/insights/weekly', payload);
      return data;
    } catch (err) {
      this.logger.warn(`ml-service weekly insight failed: ${this.describe(err)}`);
      return null;
    }
  }

  /** Generic narrative generation (wrapped, gamer insight, …). Null if unavailable. */
  async narrate(prompt: string, system?: string, maxTokens = 320): Promise<{ text: string; model: string } | null> {
    try {
      const { data } = await this.http.post<{ text: string | null; model: string }>('/narrate', {
        prompt,
        system,
        max_tokens: maxTokens,
      });
      return data.text ? { text: data.text, model: data.model } : null;
    } catch (err) {
      this.logger.warn(`ml-service narrate failed: ${this.describe(err)}`);
      return null;
    }
  }

  async predictObsessions(
    userId: string,
    candidates: TrackPlayPayload[],
  ): Promise<ObsessionScore[]> {
    try {
      const { data } = await this.http.post<{ scores: ObsessionScore[] }>('/predict/obsessions', {
        user_id: userId,
        candidates,
      });
      return data.scores;
    } catch (err) {
      this.logger.warn(`ml-service obsession prediction failed: ${this.describe(err)}`);
      return [];
    }
  }

  private describe(err: unknown): string {
    if (isAxiosError(err)) return `${err.code ?? err.response?.status} ${err.message}`;
    return err instanceof Error ? err.message : String(err);
  }
}
