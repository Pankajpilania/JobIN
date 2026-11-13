import {
  Controller,
  Get,
  Patch,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { once } from 'node:events';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AdminService } from './admin.service';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import {
  AdminRoleGuard,
  RequireAdminRole,
  RequireAdminPermission,
} from './guards/admin-role.guard';
import {
  ListUsersDto,
  AdminUpdateUserDto,
  SendNotificationDto,
  ListSubscriptionsDto,
  UpdateStripePricesDto,
  UpdateAIPlatformSettingsDto,
  CreateDiscountCodeDto,
  ListDiscountCodesDto,
  CreateRefundDto,
  CreateSiteBannerDto,
  UpdateSiteBannerDto,
  UpdateRolePermissionsDto,
} from './dto/admin.dto';

type ReportName = 'users' | 'billing' | 'subscriptions' | 'ai-usage';

const REPORT_COLUMNS: Record<ReportName, string[]> = {
  users: ['id', 'email', 'full_name', 'status', 'roles', 'created_at', 'last_login_at'],
  billing: [
    'payment_id',
    'email',
    'full_name',
    'plan',
    'stripe_invoice_id',
    'stripe_payment_intent_id',
    'amount',
    'amount_refunded',
    'currency',
    'status',
    'failure_message',
    'created_at',
  ],
  subscriptions: [
    'subscription_id',
    'email',
    'full_name',
    'plan',
    'status',
    'is_complimentary',
    'period_start',
    'period_end',
    'cancel_at_period_end',
    'created_at',
  ],
  'ai-usage': [
    'usage_id',
    'email',
    'full_name',
    'feature',
    'model',
    'prompt_tokens',
    'completion_tokens',
    'total_tokens',
    'estimated_cost_usd',
    'created_at',
  ],
};

function csvCell(value: string | number | boolean | Date | null | undefined): string {
  const text = value instanceof Date ? value.toISOString() : value == null ? '' : String(value);
  const safeText = typeof value === 'string' && /^[\s]*[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safeText.replace(/"/g, '""')}"`;
}

@ApiTags('Admin')
@ApiBearerAuth('SupabaseJWT')
@UseGuards(SupabaseAuthGuard, AdminRoleGuard)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('access')
  @ApiOperation({ summary: 'Confirm the signed-in user has an admin role' })
  checkAccess(@Req() req: any) {
    return {
      allowed: true,
      roles: (req.adminUser?.roles ?? []).map(({ role }: { role: { name: string } }) => role.name),
      permissions: [
        ...new Set(
          (req.adminUser?.roles ?? []).flatMap(({ role }: any) =>
            (role.permissions ?? []).map(({ permission }: any) => permission.action),
          ),
        ),
      ],
    };
  }

  @Get('roles')
  @RequireAdminRole('SUPER_ADMIN')
  @ApiOperation({ summary: 'List editable admin roles and permissions' })
  listAdminRoles() {
    return this.adminService.listAdminRoles();
  }

  @Patch('roles/:id/permissions')
  @RequireAdminRole('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update an admin role permission assignment' })
  updateAdminRolePermissions(
    @Param('id') id: string,
    @Body() dto: UpdateRolePermissionsDto,
    @Req() req: any,
  ) {
    return this.adminService.updateAdminRolePermissions(req.adminUser.id, id, dto, req.ip);
  }

  @Get('reports/users.csv')
  @RequireAdminPermission('reports:users')
  @ApiOperation({ summary: 'Export user and role records as a CSV report' })
  exportUsersReport(@Res() response: Response, @Req() req: any) {
    return this.streamReport('users', response, req.adminUser.id, req.ip);
  }

  @Get('reports/billing.csv')
  @RequireAdminPermission('reports:billing')
  @ApiOperation({ summary: 'Export payments, failures, and refunds as a CSV report' })
  exportBillingReport(@Res() response: Response, @Req() req: any) {
    return this.streamReport('billing', response, req.adminUser.id, req.ip);
  }

  @Get('reports/subscriptions.csv')
  @RequireAdminPermission('reports:subscriptions')
  @ApiOperation({ summary: 'Export subscriptions as a CSV report' })
  exportSubscriptionsReport(@Res() response: Response, @Req() req: any) {
    return this.streamReport('subscriptions', response, req.adminUser.id, req.ip);
  }

  @Get('reports/ai-usage.csv')
  @RequireAdminPermission('reports:ai')
  @ApiOperation({ summary: 'Export AI usage and cost records as a CSV report' })
  exportAIUsageReport(@Res() response: Response, @Req() req: any) {
    return this.streamReport('ai-usage', response, req.adminUser.id, req.ip);
  }

  private async streamReport(
    report: ReportName,
    response: Response,
    adminId: string,
    ipAddress?: string,
  ): Promise<void> {
    await this.adminService.audit(
      adminId,
      'ADMIN_EXPORT_REPORT',
      'Report',
      report,
      undefined,
      { report },
      undefined,
      ipAddress,
    );
    const date = new Date().toISOString().slice(0, 10);
    response.setHeader('Content-Type', 'text/csv; charset=utf-8');
    response.setHeader('Content-Disposition', `attachment; filename="jobin-${report}-${date}.csv"`);
    response.setHeader('Cache-Control', 'no-store');
    try {
      response.write(`\uFEFF${REPORT_COLUMNS[report].map(csvCell).join(',')}\r\n`);
      for await (const row of this.adminService.iterateReportRows(report)) {
        if (!response.write(`${row.map(csvCell).join(',')}\r\n`)) await once(response, 'drain');
      }
      response.end();
    } catch (error) {
      if (response.headersSent) response.destroy(error instanceof Error ? error : undefined);
      else throw error;
    }
  }

  // ─── GET /admin/metrics ────────────────────────────────────────────────────
  @Get('metrics')
  @RequireAdminPermission('reports:dashboard')
  @ApiOperation({ summary: 'Platform-wide metrics dashboard' })
  getMetrics() {
    return this.adminService.getMetrics();
  }

  @Get('stripe-prices')
  @RequireAdminPermission('billing:read')
  getStripePrices() {
    return this.adminService.getStripePrices();
  }

  @Post('stripe-prices')
  @HttpCode(HttpStatus.OK)
  @RequireAdminPermission('billing:write')
  updateStripePrices(@Body() dto: UpdateStripePricesDto, @Req() req: any) {
    return this.adminService.updateStripePrices(req.adminUser?.id ?? 'system', dto, req.ip);
  }

  @Get('discount-codes')
  @RequireAdminPermission('discounts:manage')
  @ApiOperation({ summary: 'List Stripe subscription discount codes' })
  getDiscountCodes(@Query() dto: ListDiscountCodesDto) {
    return this.adminService.getDiscountCodes(dto);
  }

  @Post('discount-codes')
  @HttpCode(HttpStatus.CREATED)
  @RequireAdminPermission('discounts:manage')
  @ApiOperation({ summary: 'Create a public percentage discount code for subscriptions' })
  createDiscountCode(@Body() dto: CreateDiscountCodeDto, @Req() req: any) {
    return this.adminService.createDiscountCode(
      req.adminUser?.id ?? 'system',
      dto,
      req.ip ?? req.headers?.['x-forwarded-for'],
    );
  }

  @Patch('discount-codes/:id/deactivate')
  @HttpCode(HttpStatus.OK)
  @RequireAdminPermission('discounts:manage')
  @ApiOperation({ summary: 'Deactivate a public Stripe promotion code' })
  deactivateDiscountCode(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deactivateDiscountCode(
      req.adminUser?.id ?? 'system',
      id,
      req.ip ?? req.headers?.['x-forwarded-for'],
    );
  }

  @Get('ai-settings')
  @RequireAdminRole('SUPER_ADMIN')
  getAIPlatformSettings() {
    return this.adminService.getAIPlatformSettings();
  }

  @Post('ai-settings')
  @HttpCode(HttpStatus.OK)
  @RequireAdminRole('SUPER_ADMIN')
  updateAIPlatformSettings(@Body() dto: UpdateAIPlatformSettingsDto, @Req() req: any) {
    return this.adminService.updateAIPlatformSettings(req.adminUser?.id ?? 'system', dto, req.ip);
  }

  // ─── GET /admin/users ──────────────────────────────────────────────────────
  @Get('users')
  @RequireAdminPermission('users:read')
  @ApiOperation({ summary: 'Paginated user list with filters' })
  listUsers(@Query() dto: ListUsersDto) {
    return this.adminService.listUsers(dto);
  }

  // ─── GET /admin/users/:id/activity ────────────────────────────────────────
  @Get('users/:id/activity')
  @RequireAdminPermission('users:read')
  @ApiOperation({ summary: 'Login history, resume history, AI usage for a user' })
  getUserActivity(@Param('id') id: string) {
    return this.adminService.getUserActivity(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @RequireAdminRole('SUPER_ADMIN')
  @ApiOperation({ summary: 'Permanently delete a user and their stored data' })
  deleteUser(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deleteUser(
      req.adminUser.id,
      id,
      req.ip ?? req.headers?.['x-forwarded-for'],
    );
  }

  // ─── PATCH /admin/users/:id ────────────────────────────────────────────────
  @Patch('users/:id')
  @HttpCode(HttpStatus.OK)
  @RequireAdminPermission('users:read')
  @ApiOperation({ summary: 'Suspend/activate user, grant credits, change plan/role' })
  updateUser(@Param('id') id: string, @Body() dto: AdminUpdateUserDto, @Req() req: any) {
    const adminId = req.adminUser?.id ?? 'system';
    const ipAddress = req.ip ?? req.headers?.['x-forwarded-for'];
    return this.adminService.updateUser(adminId, id, dto, ipAddress);
  }

  // ─── GET /admin/subscriptions ──────────────────────────────────────────────
  @Get('subscriptions')
  @ApiOperation({ summary: 'List subscriptions with status filter' })
  @RequireAdminPermission('billing:read')
  listSubscriptions(@Query() dto: ListSubscriptionsDto) {
    return this.adminService.listSubscriptions(dto);
  }

  // ─── GET /admin/billing ────────────────────────────────────────────────────
  @Get('billing')
  @ApiOperation({ summary: 'Revenue, payments, MRR/ARR, plan breakdown' })
  @RequireAdminPermission('billing:read')
  getBilling() {
    return this.adminService.getBilling();
  }

  @Post('payments/:id/refund')
  @HttpCode(HttpStatus.OK)
  @RequireAdminPermission('payments:refund')
  @ApiOperation({ summary: 'Create a full or partial refund through Stripe' })
  refundPayment(@Param('id') id: string, @Body() dto: CreateRefundDto, @Req() req: any) {
    return this.adminService.refundPayment(req.adminUser.id, id, dto, req.ip);
  }

  @Get('content/banners')
  @RequireAdminPermission('content:manage')
  listSiteBanners() {
    return this.adminService.listSiteBanners();
  }

  @Post('content/banners')
  @HttpCode(HttpStatus.CREATED)
  @RequireAdminPermission('content:manage')
  createSiteBanner(@Body() dto: CreateSiteBannerDto, @Req() req: any) {
    return this.adminService.createSiteBanner(req.adminUser.id, dto, req.ip);
  }

  @Patch('content/banners/:id')
  @RequireAdminPermission('content:manage')
  updateSiteBanner(@Param('id') id: string, @Body() dto: UpdateSiteBannerDto, @Req() req: any) {
    return this.adminService.updateSiteBanner(req.adminUser.id, id, dto, req.ip);
  }

  @Delete('content/banners/:id')
  @RequireAdminPermission('content:manage')
  deactivateSiteBanner(@Param('id') id: string, @Req() req: any) {
    return this.adminService.deactivateSiteBanner(req.adminUser.id, id, req.ip);
  }

  // ─── GET /admin/ai-usage ──────────────────────────────────────────────────
  @Get('ai-usage')
  @RequireAdminPermission('ai:read')
  @ApiOperation({ summary: 'Token consumption by model, cost per user, daily trend' })
  getAIUsage() {
    return this.adminService.getAIUsage();
  }

  // ─── GET /admin/tickets ────────────────────────────────────────────────────
  @Get('tickets')
  @RequireAdminPermission('support:read_tickets')
  @ApiOperation({ summary: 'Support tickets inbox' })
  listTickets(
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.adminService.listTickets(status, page, limit);
  }

  // ─── PATCH /admin/tickets/:id ─────────────────────────────────────────────
  @Patch('tickets/:id')
  @RequireAdminPermission('support:write_tickets')
  @ApiOperation({ summary: 'Update ticket status / assignment' })
  updateTicket(
    @Param('id') ticketId: string,
    @Body('status') status: string,
    @Body('assignedTo') assignedTo?: string,
    @Req() req?: any,
  ) {
    const adminId = req?.adminUser?.id ?? 'system';
    const ipAddress = req?.ip;
    return this.adminService.updateTicket(adminId, ticketId, status, assignedTo, ipAddress);
  }

  // ─── POST /admin/tickets/:id/reply ────────────────────────────────────────
  @Post('tickets/:id/reply')
  @RequireAdminPermission('support:write_tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin reply to a support ticket' })
  replyToTicket(@Param('id') ticketId: string, @Body('content') content: string, @Req() req: any) {
    return this.adminService.replyToTicket(req.adminUser?.id ?? 'system', ticketId, content);
  }

  // ─── POST /admin/notifications/send ───────────────────────────────────────
  @Post('notifications/send')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ short: { limit: 2, ttl: 60_000 } })
  @ApiOperation({ summary: 'Send email campaign / in-app notification' })
  @RequireAdminPermission('notifications:send')
  sendNotification(@Body() dto: SendNotificationDto, @Req() req: any) {
    const adminId = req.adminUser?.id ?? 'system';
    const ipAddress = req.ip;
    return this.adminService.sendNotification(adminId, dto, ipAddress);
  }
}
