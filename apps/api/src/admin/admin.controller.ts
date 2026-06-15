import {
  Controller, Get, Patch, Post, Body, Param, Query,
  UseGuards, Req, HttpCode, HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { AdminRoleGuard, RequireAdminRole } from './guards/admin-role.guard';
import {
  ListUsersDto, AdminUpdateUserDto,
  SendNotificationDto, ListSubscriptionsDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@ApiBearerAuth('SupabaseJWT')
@UseGuards(SupabaseAuthGuard, AdminRoleGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  // ─── GET /admin/metrics ────────────────────────────────────────────────────
  @Get('metrics')
  @ApiOperation({ summary: 'Platform-wide metrics dashboard' })
  getMetrics() {
    return this.adminService.getMetrics();
  }

  // ─── GET /admin/users ──────────────────────────────────────────────────────
  @Get('users')
  @ApiOperation({ summary: 'Paginated user list with filters' })
  listUsers(@Query() dto: ListUsersDto) {
    return this.adminService.listUsers(dto);
  }

  // ─── GET /admin/users/:id/activity ────────────────────────────────────────
  @Get('users/:id/activity')
  @ApiOperation({ summary: 'Login history, resume history, AI usage for a user' })
  getUserActivity(@Param('id') id: string) {
    return this.adminService.getUserActivity(id);
  }

  // ─── PATCH /admin/users/:id ────────────────────────────────────────────────
  @Patch('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Suspend/activate user, grant credits, change plan/role' })
  updateUser(
    @Param('id') id: string,
    @Body() dto: AdminUpdateUserDto,
    @Req() req: any,
  ) {
    const adminId   = req.adminUser?.id ?? 'system';
    const ipAddress = req.ip ?? req.headers?.['x-forwarded-for'];
    return this.adminService.updateUser(adminId, id, dto, ipAddress);
  }

  // ─── GET /admin/subscriptions ──────────────────────────────────────────────
  @Get('subscriptions')
  @ApiOperation({ summary: 'List subscriptions with status filter' })
  @RequireAdminRole('FINANCE_ADMIN')
  listSubscriptions(@Query() dto: ListSubscriptionsDto) {
    return this.adminService.listSubscriptions(dto);
  }

  // ─── GET /admin/billing ────────────────────────────────────────────────────
  @Get('billing')
  @ApiOperation({ summary: 'Revenue, payments, MRR/ARR, plan breakdown' })
  @RequireAdminRole('FINANCE_ADMIN')
  getBilling() {
    return this.adminService.getBilling();
  }

  // ─── GET /admin/ai-usage ──────────────────────────────────────────────────
  @Get('ai-usage')
  @ApiOperation({ summary: 'Token consumption by model, cost per user, daily trend' })
  getAIUsage() {
    return this.adminService.getAIUsage();
  }

  // ─── GET /admin/tickets ────────────────────────────────────────────────────
  @Get('tickets')
  @ApiOperation({ summary: 'Support tickets inbox' })
  listTickets(
    @Query('status') status?: string,
    @Query('page')   page?:   number,
    @Query('limit')  limit?:  number,
  ) {
    return this.adminService.listTickets(status, page, limit);
  }

  // ─── PATCH /admin/tickets/:id ─────────────────────────────────────────────
  @Patch('tickets/:id')
  @ApiOperation({ summary: 'Update ticket status / assignment' })
  updateTicket(
    @Param('id')   ticketId:   string,
    @Body('status') status:    string,
    @Body('assignedTo') assignedTo?: string,
    @Req() req?: any,
  ) {
    const adminId   = req?.adminUser?.id ?? 'system';
    const ipAddress = req?.ip;
    return this.adminService.updateTicket(adminId, ticketId, status, assignedTo, ipAddress);
  }

  // ─── POST /admin/tickets/:id/reply ────────────────────────────────────────
  @Post('tickets/:id/reply')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin reply to a support ticket' })
  replyToTicket(
    @Param('id')    ticketId: string,
    @Body('content') content: string,
    @Req() req: any,
  ) {
    return this.adminService.replyToTicket(req.adminUser?.id ?? 'system', ticketId, content);
  }

  // ─── POST /admin/notifications/send ───────────────────────────────────────
  @Post('notifications/send')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Send email campaign / in-app notification' })
  @RequireAdminRole('OPERATIONS_ADMIN')
  sendNotification(@Body() dto: SendNotificationDto, @Req() req: any) {
    const adminId   = req.adminUser?.id ?? 'system';
    const ipAddress = req.ip;
    return this.adminService.sendNotification(adminId, dto, ipAddress);
  }
}
