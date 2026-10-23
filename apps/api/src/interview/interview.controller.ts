import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser, type SupabaseUserPayload } from '../common/decorators/current-user.decorator';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { EvaluateInterviewAnswerDto, GenerateInterviewQuestionDto } from './dto/interview.dto';
import { InterviewService } from './interview.service';

@ApiTags('Interview')
@ApiBearerAuth('SupabaseJWT')
@UseGuards(SupabaseAuthGuard)
@Controller('interview')
export class InterviewController {
  constructor(private readonly interviewService: InterviewService) {}

  @Post('question')
  @ApiOperation({ summary: 'Generate one personalized interview question for one AI credit' })
  generateQuestion(
    @CurrentUser() user: SupabaseUserPayload,
    @Body() dto: GenerateInterviewQuestionDto,
  ) {
    return this.interviewService.generateQuestion(user.id, dto);
  }

  @Post('evaluate')
  @ApiOperation({ summary: 'Evaluate an interview answer on a 1–10 scale' })
  evaluateAnswer(
    @CurrentUser() user: SupabaseUserPayload,
    @Body() dto: EvaluateInterviewAnswerDto,
  ) {
    return this.interviewService.evaluateAnswer(user.id, dto);
  }
}
