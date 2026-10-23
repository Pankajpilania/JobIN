import { ArrayMaxSize, IsArray, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class GenerateInterviewQuestionDto {
  @IsString()
  @MinLength(1)
  resumeId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  roleTitle: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyName: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  previousQuestions?: string[];
}

export class EvaluateInterviewAnswerDto {
  @IsString()
  @MinLength(1)
  resumeId: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  roleTitle: string;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  companyName: string;

  @IsString()
  @MinLength(5)
  @MaxLength(2000)
  question: string;

  @IsString()
  @MinLength(1)
  @MaxLength(6000)
  answer: string;
}
