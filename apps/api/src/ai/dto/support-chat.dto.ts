import { Type } from 'class-transformer';
import { Transform } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsString,
  MaxLength,
  Matches,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class SupportChatMessageDto {
  @IsIn(['user', 'assistant'])
  role!: 'user' | 'assistant';

  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @MinLength(1)
  @MaxLength(2000)
  @Matches(/\S/)
  content!: string;
}

export class SupportChatDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => SupportChatMessageDto)
  messages!: SupportChatMessageDto[];
}
