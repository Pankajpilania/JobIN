import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /api/health
   * Liveness probe — always returns 200 if the process is alive.
   */
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  liveness() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: Math.floor(process.uptime()),
    };
  }

  /**
   * GET /api/health/ready
   * Readiness probe — checks PostgreSQL connectivity via a lightweight query.
   */
  @Get('ready')
  @ApiOperation({ summary: 'Readiness probe — checks DB connectivity' })
  async readiness() {
    try {
      // Cheapest possible DB round-trip
      await this.prisma.$queryRaw`SELECT 1`;
      return {
        status: 'ok',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };
    } catch (err) {
      return {
        status: 'error',
        database: 'disconnected',
        error: err.message,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
