import { Global, Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AISettingsCrypto } from './ai-settings-crypto';

@Global()
@Module({
  providers: [AIService, AISettingsCrypto],
  exports: [AIService, AISettingsCrypto],
})
export class AIModule {}
