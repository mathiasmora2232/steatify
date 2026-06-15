import { z } from 'zod';

/**
 * Single source of truth for environment configuration.
 * Validated once at boot — the app refuses to start with a bad/missing var,
 * which is far better than discovering it at request time.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  BACKEND_PORT: z.coerce.number().default(4000),
  BACKEND_PUBLIC_URL: z.string().url().default('http://localhost:4000'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  DATABASE_URL: z.string().min(1),

  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.coerce.number().default(6379),

  JWT_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.coerce.number().default(900),
  JWT_REFRESH_TTL: z.coerce.number().default(2_592_000),
  TOKEN_ENC_KEY: z.string().min(32), // base64 of 32 raw bytes

  SPOTIFY_CLIENT_ID: z.string().min(1),
  SPOTIFY_CLIENT_SECRET: z.string().min(1),
  SPOTIFY_REDIRECT_URI: z.string().url(),

  // Steam Web API (optional second data source).
  STEAM_API_KEY: z.string().optional(),

  ML_SERVICE_URL: z.string().url().default('http://localhost:8000'),
});

export type Env = z.infer<typeof envSchema>;

/** Used by ConfigModule.validate — throws with a readable message on failure. */
export function validateEnv(raw: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  return parsed.data;
}
