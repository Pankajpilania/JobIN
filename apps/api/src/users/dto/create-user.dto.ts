import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ example: 'user_2abc123def456' })
  @IsString()
  clerkId: string;

  @ApiProperty({ example: 'alice@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Alice Johnson' })
  @IsString()
  @MinLength(2)
  fullName: string;

  @ApiPropertyOptional({ example: 'https://img.clerk.com/...' })
  @IsOptional()
  @IsString()
  avatarUrl?: string;
}
