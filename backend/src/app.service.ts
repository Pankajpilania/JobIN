import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getRoot() {
    return {
      name: 'JobIN API',
      version: '1.0.0',
      status: 'running',
      docs: '/api/v1/docs',
      timestamp: new Date().toISOString(),
    };
  }
}
