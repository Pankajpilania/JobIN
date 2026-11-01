import { Global, Module } from '@nestjs/common';
import { AIService } from './ai.service';
import { AISettingsCrypto } from './ai-settings-crypto';
import { SupportAIController } from './support-ai.controller';

@Global()
@Module({
  controllers: [SupportAIController],
  providers: [AIService, AISettingsCrypto],
  exports: [AIService, AISettingsCrypto],
})
export class AIModule {}
