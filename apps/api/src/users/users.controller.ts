import {
  Controller,
  Get,
  Patch,
  Delete,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, SupabaseUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ─── GET /api/users/me ──────────────────────────────────────────────────────

  @Get('users/me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('SupabaseJWT')
  @ApiOperation({ summary: "Get the authenticated user's profile" })
  async getMe(@CurrentUser() user: SupabaseUserPayload) {
    return this.usersService.findBySupabaseId(user.id);
  }

  // ─── PATCH /api/users/me ────────────────────────────────────────────────────

  @Patch('users/me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('SupabaseJWT')
  @ApiOperation({ summary: "Update the authenticated user's profile" })
  async updateMe(
    @CurrentUser() user: SupabaseUserPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.usersService.updateBySupabaseId(user.id, dto);
  }

  // ─── DELETE /api/users/me ───────────────────────────────────────────────────

  @Delete('users/me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('SupabaseJWT')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Soft-delete the authenticated user account' })
  async deleteMe(@CurrentUser() user: SupabaseUserPayload) {
    await this.usersService.softDelete(user.id);
  }
}
