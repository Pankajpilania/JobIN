import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error', 'verbose', 'debug'],
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('app.port') || 3001;
  const corsOrigin = configService.get<string>('app.corsOrigin') || 'http://localhost:3000';

  // Global prefix
  app.setGlobalPrefix('api/v1');

  // CORS
  app.enableCors({
    origin: [corsOrigin, 'http://localhost:3000', 'http://localhost:3001'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Global interceptors
  app.useGlobalInterceptors(new LoggingInterceptor());

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('JobIN API')
    .setDescription(
      'Production-ready REST API for the JobIN SaaS platform.\n\n' +
        'Provides endpoints for authentication, resume management, job application tracking, and admin operations.',
    )
    .setVersion('1.0.0')
    .addServer(`http://localhost:${port}`, 'Local Development')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter your Clerk JWT or application JWT token',
        in: 'header',
      },
      'BearerAuth',
    )
    .addTag('Authentication', 'User registration, login and Clerk sync')
    .addTag('Users', 'User profile management')
    .addTag('Resumes', 'Resume upload and management')
    .addTag('Applications', 'Job application tracker')
    .addTag('Admin', 'Admin-only operations (requires SUPER_ADMIN or OPERATIONS_ADMIN role)')
    .addTag('Health', 'Health check endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/v1/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  await app.listen(port);
  console.log(`\n🚀 JobIN API is running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger docs available at: http://localhost:${port}/api/v1/docs\n`);
}

bootstrap();
