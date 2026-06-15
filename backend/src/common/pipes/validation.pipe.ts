import { Injectable, ValidationPipe as NestValidationPipe } from '@nestjs/common';

@Injectable()
export class AppValidationPipe extends NestValidationPipe {
  constructor() {
    super({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
      transformOptions: {
        enableImplicitConversion: true,
      },
    });
  }
}
