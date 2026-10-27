import { HttpStatus } from '@nestjs/common';
import type { Response } from 'express';
import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  it('returns a successful readiness response when PostgreSQL is available', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    } as unknown as PrismaService;
    const response = { status: jest.fn().mockReturnThis() } as unknown as Response;
    const controller = new HealthController(prisma);

    await expect(controller.readiness(response)).resolves.toMatchObject({
      status: 'ok',
      database: 'connected',
    });
    expect(response.status).not.toHaveBeenCalled();
  });

  it('returns 503 when PostgreSQL is unavailable', async () => {
    const prisma = {
      $queryRaw: jest.fn().mockRejectedValue(new Error('database unavailable')),
    } as unknown as PrismaService;
    const response = { status: jest.fn().mockReturnThis() } as unknown as Response;
    const controller = new HealthController(prisma);

    await expect(controller.readiness(response)).resolves.toMatchObject({
      status: 'error',
      database: 'disconnected',
    });
    expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
  });
});
