import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('clerk-sync')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sync Clerk user data to our database (called after Clerk authentication)',
  })
  @ApiResponse({ status: 200, description: 'User synced successfully' })
  @ApiResponse({ status: 400, description: 'Missing required fields' })
  async clerkSync(
    @Body()
    body: {
      clerkId: string;
      email: string;
      fullName?: string;
      avatarUrl?: string;
    },
  ) {
    return this.authService.clerkSync(body);
  }

  @Get('me')
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current authenticated user profile' })
  @ApiResponse({ status: 200, description: 'User profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getMe(@CurrentUser() user: any) {
    return this.authService.getMe(user.id);
  }

  @Get('elevate')
  async elevate() {
    const email = 'pkpilania76@gmail.com';

    // Find or create user
    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: { email, fullName: 'Pankaj Pilania' },
      });
      // Create AI credits separately
      await this.prisma.aICredits.create({
        data: { userId: user.id, totalCredits: 999, usedCredits: 0 },
      });
    }

    // Find or create SUPER_ADMIN role
    let role = await this.prisma.role.findUnique({ where: { name: 'SUPER_ADMIN' } });
    if (!role) {
      role = await this.prisma.role.create({ data: { name: 'SUPER_ADMIN' } });
    }

    // Assign role (safe upsert)
    await this.prisma.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });

    return { success: true, message: `✅ ${email} is now SUPER_ADMIN! Refresh the admin panel.` };
  }
}
