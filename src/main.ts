import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log'],
  });
  // Behind a reverse proxy: use X-Forwarded-For for client IPs (rate limits, login history).
  app.set('trust proxy', 1);

  // ── Global prefix + versioning ──────────────────────────────────────────
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // ── CORS ─────────────────────────────────────────────────────────────────
  // FRONTEND_URL may list several origins (comma-separated); any subdomain of
  // BASE_DOMAIN (one per studio) is allowed too.
  const origins = (process.env.FRONTEND_URL ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  const baseDomain = process.env.BASE_DOMAIN?.toLowerCase();
  app.enableCors({
    origin: (origin, cb) => {
      if (!origin || origins.includes(origin)) return cb(null, true);
      try {
        const host = new URL(origin).hostname.toLowerCase();
        if (
          baseDomain &&
          (host === baseDomain || host.endsWith(`.${baseDomain}`))
        )
          return cb(null, true);
      } catch {
        /* malformed origin */
      }
      cb(null, false);
    },
    credentials: true,
  });

  // ── Global pipes & filters ───────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Swagger / OpenAPI ────────────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Studio Platform API')
      .setDescription(
        'Multi-studio booking, projects, billing and website API. Send X-Studio: <slug> on studio requests.',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.PORT ?? 4000;
  await app.listen(port);
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs:      http://localhost:${port}/api/docs`);
}

bootstrap();
