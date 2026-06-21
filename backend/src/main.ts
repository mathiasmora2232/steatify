import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import type { Env } from './config/env';

// BigInt (listening_history.id) is not JSON-serializable by default.
// Make Nest/JSON emit it as a string instead of throwing.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  const config = app.get(ConfigService<Env, true>);

  // Behind Vercel/Next + Railway proxies — trust X-Forwarded-For so req.ip is
  // the real client (used for session IP logging and rate-limit keying).
  (app.getHttpAdapter().getInstance() as { set: (k: string, v: unknown) => void }).set('trust proxy', true);

  app.setGlobalPrefix('api');
  app.use(helmet());
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.enableCors({
    origin: config.get('FRONTEND_URL', { infer: true }),
    credentials: true,
  });

  // Railway/Render/Heroku inject PORT and expect the app to bind it; fall back
  // to BACKEND_PORT (default 4000) for local dev.
  const port = process.env.PORT ? Number(process.env.PORT) : config.get('BACKEND_PORT', { infer: true });
  await app.listen(port, '0.0.0.0');
  Logger.log(`Sonora API listening on :${port}`, 'Bootstrap');
}

void bootstrap();
