import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  Req,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { Request } from 'express';
import { AdminService } from './admin.service';
import { SuspendUserDto } from './dto/suspend-user.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class AssignCreditsDto {
  @ApiProperty({ example: 100, description: 'Number of credits to add' })
  @IsInt()
  @IsPositive()
  amount: number;
}

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(SupabaseAuthGuard, RolesGuard)
@Roles('SUPER_ADMIN', 'OPERATIONS_ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('users')
  @ApiOperation({ summary: 'Get paginated list of all users' })
  @ApiQuery({ name: 'search', required: false, description: 'Search by email or name' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'SUSPENDED', 'DELETED'] })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default 20)' })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  async listUsers(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.adminService.listUsers({ search, status, page, limit });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get full user details including credits and subscriptions' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDetails(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserDetails(id);
  }

  @Post('users/:id/suspend')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend a user account with reason and optional duration' })
  @ApiResponse({ status: 200, description: 'User suspended successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async suspendUser(
    @CurrentUser() admin: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SuspendUserDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || '0.0.0.0';
    return this.adminService.suspendUser(admin.id, id, dto, ipAddress);
  }

  @Post('users/:id/activate')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reactivate a suspended or deleted user' })
  @ApiResponse({ status: 200, description: 'User activated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async activateUser(
    @CurrentUser() admin: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || '0.0.0.0';
    return this.adminService.activateUser(admin.id, id, ipAddress);
  }

  @Post('users/:id/credits')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Assign additional AI credits to a user' })
  @ApiResponse({ status: 200, description: 'Credits assigned successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async assignCredits(
    @CurrentUser() admin: any,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: AssignCreditsDto,
    @Req() req: Request,
  ) {
    const ipAddress = req.ip || '0.0.0.0';
    return this.adminService.assignCredits(admin.id, id, body.amount, ipAddress);
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get dashboard metrics and platform statistics' })
  @ApiResponse({ status: 200, description: 'Platform metrics' })
  async getMetrics() {
    return this.adminService.getMetrics();
  }
}
