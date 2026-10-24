import { Controller, Get, Header } from '@nestjs/common';
import { OciJwksService } from './oci-jwks.service';

@Controller('auth/oci')
export class OciJwksController {
  constructor(private readonly ociJwks: OciJwksService) {}

  @Get('jwks')
  @Header('Cache-Control', 'public, max-age=300')
  getJwks() {
    return this.ociJwks.getJwks();
  }
}
