import {
  Controller, Post, Body, Req, Headers, UseGuards,
  HttpCode, HttpStatus, RawBodyRequest,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { SupabaseAuthGuard } from '../common/guards/supabase-auth.guard';
import { CurrentUser, type SupabaseUserPayload } from '../common/decorators/current-user.decorator';

@ApiTags('Billing')
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  // ─── POST /api/billing/create-checkout-session ────────────────────────────
  // Requires Supabase JWT
  @Post('create-checkout-session')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('SupabaseJWT')
  @ApiOperation({
    summary: 'Create a Stripe Checkout session for the Premium plan',
    description: 'Returns a Stripe-hosted checkout URL. Redirect the user to this URL to complete payment.',
  })
  createCheckout(@CurrentUser() user: SupabaseUserPayload, @Body() dto: CreateCheckoutDto) {
    return this.billingService.createCheckoutSession(user.id, dto);
  }

  // ─── POST /api/billing/portal ──────────────────────────────────────────────
  // Requires Supabase JWT
  @Post('portal')
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(SupabaseAuthGuard)
  @ApiBearerAuth('SupabaseJWT')
  @ApiOperation({
    summary: 'Create a Stripe Customer Portal session',
    description: 'Returns a URL for the user to manage their subscription, payment methods, and invoices.',
  })
  createPortal(@CurrentUser() user: SupabaseUserPayload) {
    return this.billingService.createPortalSession(user.id);
  }

  // ─── POST /api/billing/webhook ─────────────────────────────────────────────
  // NO auth guard — Stripe calls this directly; signature verifies authenticity
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Stripe webhook receiver',
    description:
      'Receives Stripe events (checkout.session.completed, customer.subscription.updated, etc.) ' +
      'and updates the database accordingly. Must be called with raw body (not JSON-parsed).',
  })
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('stripe-signature') signature: string,
  ) {
    const rawBody = req.rawBody;
    if (!rawBody) {
      return { received: false, error: 'rawBody not available — ensure rawBody: true in NestFactory.create()' };
    }
    return this.billingService.handleWebhook(rawBody, signature);
  }
}
