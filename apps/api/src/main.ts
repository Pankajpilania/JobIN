import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger:  ['log', 'warn', 'error'],
    rawBody: true,   // needed for Stripe webhook signature verification
  });

  const config = app.get(ConfigService);
  const port = config.get<number>('PORT', 4000);
  const corsOrigin = config.get<string>('CORS_ORIGIN', 'http://localhost:3000');

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
    origin: [corsOrigin, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ─── Global pipes ────────────────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
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

  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);
  logger.log(`🚀 API running at http://localhost:${port}/api`);
  logger.log(`📚 Swagger at   http://localhost:${port}/api/docs`);
}

bootstrap();
