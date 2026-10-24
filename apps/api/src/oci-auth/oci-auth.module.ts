import { Global, Module } from '@nestjs/common';
import { OciJwksController } from './oci-jwks.controller';
import { OciJwksService } from './oci-jwks.service';

@Global()
@Module({
  controllers: [OciJwksController],
  providers: [OciJwksService],
  exports: [OciJwksService],
})
export class OciAuthModule {}
