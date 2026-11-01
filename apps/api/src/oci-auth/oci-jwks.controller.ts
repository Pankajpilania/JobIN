import { Controller, Get, Res } from '@nestjs/common';
import type { Response } from 'express';
import { OciJwksService } from './oci-jwks.service';

@Controller('auth/oci')
export class OciJwksController {
  constructor(private readonly ociJwks: OciJwksService) {}

  @Get('jwks')
  async getJwks(@Res({ passthrough: true }) response: Response) {
    // Prevent intermediaries from caching transient 503 responses as key sets.
    response.setHeader('Cache-Control', 'no-store');
    const jwks = await this.ociJwks.getJwks();
    response.setHeader('Cache-Control', 'public, max-age=300, stale-if-error=900');
    return jwks;
  }
}
