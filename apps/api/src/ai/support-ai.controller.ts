import { BadRequestException, Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AIService } from './ai.service';
import { SupportChatDto } from './dto/support-chat.dto';

@ApiTags('Support')
@Controller('support')
export class SupportAIController {
  constructor(private readonly aiService: AIService) {}

  @Post('chat')
  @Throttle({ short: { limit: 6, ttl: 60_000 } })
  @ApiOperation({ summary: 'Answer a public JobIN support question' })
  chat(@Body() dto: SupportChatDto) {
    if (dto.messages[dto.messages.length - 1]?.role !== 'user') {
      throw new BadRequestException('The latest support chat message must be from the user.');
    }

    return this.aiService.answerSupportQuestion(dto.messages);
  }
}
