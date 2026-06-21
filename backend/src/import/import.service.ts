import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { IMPORT_QUEUE, ImportJob, ExtendedEntry, ExtendedImportJobData } from './import.constants';
import { parseExtendedHistory } from './extended-history.parser';

/** A file's worth of bytes — minimal shape so we don't need @types/multer. */
export interface UploadedFile {
  originalname: string;
  buffer: Buffer;
}

@Injectable()
export class ImportService {
  private readonly logger = new Logger(ImportService.name);

  constructor(
    @InjectQueue(IMPORT_QUEUE) private readonly queue: Queue<ExtendedImportJobData>,
  ) {}

  /**
   * Parse Spotify "Extended Streaming History" JSON files into normalized plays.
   * Keeps only audio tracks (rows with a `spotify_track_uri`); podcast episodes
   * and malformed rows are skipped. Tolerant of mixed/extra fields.
   */
  parseFiles(files: UploadedFile[]): ExtendedEntry[] {
    const entries: ExtendedEntry[] = [];
    for (const file of files) {
      const parsed = parseExtendedHistory(file.buffer.toString('utf8'));
      if (parsed.length === 0) {
        this.logger.warn(`No valid plays in ${file.originalname}`);
      }
      entries.push(...parsed);
    }
    return entries;
  }

  async enqueue(userId: string, entries: ExtendedEntry[]): Promise<string> {
    const job = await this.queue.add(
      ImportJob.EXTENDED_HISTORY,
      { userId, entries },
      { attempts: 1, removeOnComplete: 20, removeOnFail: 50 },
    );
    this.logger.log(`Enqueued import for ${userId}: ${entries.length} entries (job ${job.id})`);
    return String(job.id);
  }

  async status(jobId: string, userId: string) {
    const job = await this.queue.getJob(jobId);
    // Ownership check — a job belongs to the user that enqueued it (job.data.userId).
    // Without this, any logged-in user could poll another user's import by job id.
    if (!job || (job.data as { userId?: string })?.userId !== userId) return { found: false };
    return {
      found: true,
      state: await job.getState(),
      progress: job.progress,
      result: job.returnvalue,
      failedReason: job.failedReason,
    };
  }
}
