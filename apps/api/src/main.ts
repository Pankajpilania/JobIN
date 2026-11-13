import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, new ExpressAdapter(), {
    logger: ['log', 'warn', 'error'],
    rawBody: true, // needed for Stripe webhook signature verification
  });

  const config = app.get(ConfigService);
  const isProduction = config.get<string>('NODE_ENV') === 'production';
  const port = config.get<number>('PORT', 4000);
  const corsOrigins = config
    .get<string>('CORS_ORIGIN', isProduction ? '' : 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  for (const origin of corsOrigins) {
    let parsed: URL;
    try {
      parsed = new URL(origin);
    } catch {
      throw new Error(`Invalid CORS origin configured: ${origin}`);
    }
    if (
      origin === '*' ||
      parsed.origin !== origin ||
      (isProduction &&
        (parsed.protocol !== 'https:' || ['localhost', '127.0.0.1'].includes(parsed.hostname)))
    ) {
      throw new Error('Production CORS_ORIGIN entries must be exact HTTPS origins.');
    }
  }

  // Honor only an explicitly configured, bounded proxy chain. Never trust all
  // forwarded headers, which would let clients spoof their address for limits.
  const trustProxyHops = Number(config.get<string>('TRUST_PROXY_HOPS', '0'));
  if (!Number.isInteger(trustProxyHops) || trustProxyHops < 0 || trustProxyHops > 10) {
    throw new Error('TRUST_PROXY_HOPS must be an integer between 0 and 10.');
  }
  if (trustProxyHops > 0) {
    app.getHttpAdapter().getInstance().set('trust proxy', trustProxyHops);
  }

  app.useSecurityHeaders({ contentSecurityPolicy: false });

  // ─── Sentry Initialization ───────────────────────────────────────────────
  const sentryDsn = config.get<string>('SENTRY_DSN') || process.env.SENTRY_DSN;
  if (sentryDsn) {
    Sentry.init({
      dsn: sentryDsn,
      environment: config.get<string>('NODE_ENV', 'development'),
    });
    logger.log('Sentry SDK initialised');
  }

  // ─── Global prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ─── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: [...new Set(corsOrigins)],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    exposedHeaders: ['X-PDF-Engine'],
    credentials: true,
  });

  // ─── Global pipes ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // ─── Global filters & interceptors ───────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // ─── Swagger ─────────────────────────────────────────────────────────────────
  const swagger = new DocumentBuilder()
    .setTitle('JobIN API')
    .setDescription(
      'REST API for the JobIN SaaS platform.\n\n' +
        'Authenticate using a Supabase-issued JWT in the Bearer token field.',
    )
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}`, 'Local')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'SupabaseJWT',
    )
    .addTag('Health', 'Liveness and readiness probes')
    .addTag('Users', 'User profile management')
    .build();

  const swaggerEnabled = config.get<string>('ENABLE_SWAGGER') === 'true';
  if (swaggerEnabled && !isProduction) {
    const document = SwaggerModule.createDocument(app, swagger);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: { persistAuthorization: false },
    });
  }

  await app.listen(port);
  logger.log(`🚀 API running at http://localhost:${port}/api`);
  if (swaggerEnabled && !isProduction) {
    logger.log(`📚 Swagger at   http://localhost:${port}/api/docs`);
  }
}

bootstrap();
