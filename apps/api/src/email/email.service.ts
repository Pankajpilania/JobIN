import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class EmailService {
  private readonly logger   = new Logger(EmailService.name);
  private readonly resend:    Resend;
  private readonly fromEmail: string;
  private readonly fromName:  string;
  private readonly appUrl:    string;
  private readonly enabled:   boolean;

  constructor(private readonly config: ConfigService) {
    const key = config.get<string>('RESEND_API_KEY') || process.env.RESEND_API_KEY || '';
    this.fromEmail = config.get<string>('RESEND_FROM_EMAIL') || process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
    this.fromName  = config.get<string>('RESEND_FROM_NAME') || process.env.RESEND_FROM_NAME || 'JobIN';
    this.appUrl    = config.get<string>('NEXT_PUBLIC_URL') || process.env.NEXT_PUBLIC_URL || 'https://jobin.ai';
    this.enabled   = !!key;

    if (this.enabled) {
      this.resend = new Resend(key);
      this.logger.log('Resend email service initialised');
    } else {
      this.logger.warn('RESEND_API_KEY not set — emails will be logged to console only');
    }
  }

  // ─── Core send helper ─────────────────────────────────────────────────────

  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.enabled) {
      this.logger.debug(`[EMAIL MOCK] To: ${to} | Subject: ${subject}`);
      return;
    }
    try {
      const { data, error } = await this.resend.emails.send({
        from: `${this.fromName} <${this.fromEmail}>`,
        to: [to],
        subject,
        html,
      });

      if (error) {
        this.logger.error(`Resend error sending to ${to}: ${JSON.stringify(error)}`);
      } else {
        this.logger.debug(`Email sent to ${to} via Resend (ID: ${data?.id}): ${subject}`);
      }
    } catch (err: any) {
      this.logger.error(`Resend critical error to ${to}: ${err.message}`);
      // Don't throw — email failures should not break the API response
    }
  }

  // ─── Templates ───────────────────────────────────────────────────────────

  private wrap(content: string, preheader = ''): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>JobIN</title>
  <style>
    body { margin:0; padding:0; font-family:'Segoe UI',Helvetica,Arial,sans-serif; background:#07070f; color:#f1f5f9; }
    .container { max-width:600px; margin:0 auto; padding:0 20px; }
    .header { padding:32px 0 24px; text-align:center; }
    .logo { display:inline-flex; align-items:center; justify-content:center;
            width:44px; height:44px; border-radius:12px;
            background:linear-gradient(135deg,#6366f1,#8b5cf6);
            color:white; font-size:20px; font-weight:800; }
    .card { background:#0e0e1a; border:1px solid rgba(255,255,255,0.08); border-radius:16px; padding:32px; margin:16px 0; }
    h1 { font-size:24px; font-weight:800; margin:0 0 8px; }
    p  { font-size:15px; line-height:1.7; color:#94a3b8; margin:0 0 16px; }
    .btn { display:inline-block; padding:12px 28px; border-radius:10px;
           background:linear-gradient(135deg,#6366f1,#8b5cf6); color:white;
           font-size:15px; font-weight:700; text-decoration:none; margin:8px 0; }
    .footer { text-align:center; padding:24px 0; font-size:12px; color:rgba(255,255,255,0.3); }
    .divider { height:1px; background:rgba(255,255,255,0.06); margin:20px 0; }
    .highlight { color:#6366f1; font-weight:600; }
  </style>
</head>
<body>
  ${preheader ? `<span style="display:none;max-height:0;overflow:hidden;">${preheader}</span>` : ''}
  <div class="container">
    <div class="header">
      <div class="logo">J</div>
      <p style="font-size:18px;font-weight:800;color:#f1f5f9;margin:12px 0 0;">JobIN</p>
    </div>
    <div class="card">
      ${content}
    </div>
    <div class="footer">
      © ${new Date().getFullYear()} JobIN · <a href="${this.appUrl}/unsubscribe" style="color:rgba(255,255,255,0.3);">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`;
  }

  // ─── 1. Welcome email ─────────────────────────────────────────────────────

  async sendWelcome(to: string, firstName: string): Promise<void> {
    const html = this.wrap(`
      <h1>Welcome to JobIN, ${firstName}! 🎉</h1>
      <p>You're now part of the smartest job search platform in the UK. Here's what you can do:</p>
      <ul style="color:#94a3b8;line-height:2;padding-left:20px;">
        <li>📄 <span class="highlight">Upload your resume</span> and get an instant ATS health score</li>
        <li>🪄 <span class="highlight">Tailor your resume</span> to any job in seconds with Gemini</li>
        <li>✍️ <span class="highlight">Generate cover letters</span> in 4 styles</li>
        <li>📊 <span class="highlight">Track applications</span> on your Kanban board</li>
      </ul>
      <div class="divider"></div>
      <a href="${this.appUrl}/resumes" class="btn">Upload Your First Resume →</a>
      <p style="margin-top:20px;font-size:13px;">Need help? Reply to this email or visit our <a href="${this.appUrl}/support" style="color:#6366f1;">support centre</a>.</p>
    `, `Welcome to JobIN, ${firstName}!`);

    await this.send(to, `Welcome to JobIN, ${firstName}! 🚀`, html);
  }

  // ─── 2. Subscription confirmation ─────────────────────────────────────────

  async sendSubscriptionConfirmation(
    to:        string,
    firstName: string,
    planName:  string,
    amount:    number,
    currency:  string,
    nextBillingDate: string,
  ): Promise<void> {
    const symbol = currency === 'GBP' ? '£' : currency === 'USD' ? '$' : '€';
    const html = this.wrap(`
      <h1>Subscription Confirmed ✅</h1>
      <p>Hi ${firstName}, your <span class="highlight">${planName} plan</span> is now active. Thank you!</p>
      <div style="background:rgba(99,102,241,0.08);border:1px solid rgba(99,102,241,0.2);border-radius:10px;padding:16px 20px;margin:16px 0;">
        <p style="margin:4px 0;font-size:14px;">💳 Amount: <strong style="color:#f1f5f9;">${symbol}${amount}/month</strong></p>
        <p style="margin:4px 0;font-size:14px;">📅 Next billing: <strong style="color:#f1f5f9;">${nextBillingDate}</strong></p>
        <p style="margin:4px 0;font-size:14px;">📦 Plan: <strong style="color:#f1f5f9;">${planName}</strong></p>
      </div>
      <a href="${this.appUrl}/settings" class="btn">Manage Subscription →</a>
      <p style="margin-top:20px;font-size:13px;">To cancel or change your plan, visit <a href="${this.appUrl}/settings" style="color:#6366f1;">Account Settings</a>.</p>
    `, `Your ${planName} subscription is confirmed`);

    await this.send(to, `JobIN ${planName} — Subscription Confirmed`, html);
  }

  // ─── 3. Password reset ────────────────────────────────────────────────────

  async sendPasswordReset(to: string, firstName: string, resetLink: string): Promise<void> {
    const html = this.wrap(`
      <h1>Reset Your Password 🔐</h1>
      <p>Hi ${firstName}, we received a request to reset your JobIN password.</p>
      <p>Click the button below to choose a new password. This link expires in <strong style="color:#f1f5f9;">1 hour</strong>.</p>
      <a href="${resetLink}" class="btn">Reset Password →</a>
      <div class="divider"></div>
      <p style="font-size:13px;">If you didn't request this, you can safely ignore this email. Your password won't change.</p>
    `, 'Reset your JobIN password');

    await this.send(to, 'Reset your JobIN password', html);
  }

  // ─── 4. Subscription expiry alert ─────────────────────────────────────────

  async sendExpiryAlert(to: string, firstName: string, expiryDate: string, planName: string): Promise<void> {
    const html = this.wrap(`
      <h1>Your Subscription Expires Soon ⚠️</h1>
      <p>Hi ${firstName}, your <span class="highlight">${planName}</span> subscription expires on <strong style="color:#f1f5f9;">${expiryDate}</strong>.</p>
      <p>After that date, you'll lose access to AI tailoring, cover letter generation, and premium features.</p>
      <a href="${this.appUrl}/settings" class="btn">Renew Now →</a>
      <div class="divider"></div>
      <p style="font-size:13px;">Not sure if you want to renew? <a href="${this.appUrl}/pricing" style="color:#6366f1;">Compare plans</a> or <a href="${this.appUrl}/support" style="color:#6366f1;">contact us</a>.</p>
    `, `Your ${planName} expires on ${expiryDate}`);

    await this.send(to, `⚠️ Your JobIN ${planName} expires on ${expiryDate}`, html);
  }

  // ─── 5. Admin campaign ────────────────────────────────────────────────────

  async sendCampaign(to: string, firstName: string, subject: string, content: string): Promise<void> {
    const html = this.wrap(`
      <h1>Hi ${firstName},</h1>
      <div style="white-space:pre-line;font-size:15px;line-height:1.8;color:#94a3b8;">${content}</div>
      <div class="divider"></div>
      <a href="${this.appUrl}/dashboard" class="btn">Open JobIN →</a>
    `, subject);

    await this.send(to, subject, html);
  }

  // ─── 6. Support ticket reply ──────────────────────────────────────────────

  async sendSupportReply(to: string, firstName: string, ticketSubject: string, reply: string): Promise<void> {
    const html = this.wrap(`
      <h1>New Reply on Your Support Ticket</h1>
      <p>Hi ${firstName}, our team has replied to your ticket: <strong style="color:#f1f5f9;">${ticketSubject}</strong></p>
      <div style="background:rgba(255,255,255,0.04);border-left:3px solid #6366f1;padding:14px 18px;border-radius:0 8px 8px 0;margin:16px 0;">
        <p style="margin:0;white-space:pre-line;">${reply}</p>
      </div>
      <a href="${this.appUrl}/support" class="btn">View Full Ticket →</a>
    `, `Reply on: ${ticketSubject}`);

    await this.send(to, `Re: ${ticketSubject} — JobIN Support`, html);
  }

  // ─── 7. Subscription cancellation ────────────────────────────────────────

  async sendCancellationConfirm(to: string, firstName: string, planName: string, endDate: string): Promise<void> {
    const html = this.wrap(`
      <h1>Subscription Cancelled</h1>
      <p>Hi ${firstName}, your <span class="highlight">${planName}</span> subscription has been cancelled.</p>
      <p>You'll retain access to premium features until <strong style="color:#f1f5f9;">${endDate}</strong>.</p>
      <p>We're sorry to see you go. If you'd like to share feedback, <a href="${this.appUrl}/support" style="color:#6366f1;">let us know</a> — it helps us improve.</p>
      <a href="${this.appUrl}/settings" class="btn">Reactivate Anytime →</a>
    `, `Your ${planName} is cancelled`);

    await this.send(to, `JobIN — Subscription Cancellation Confirmed`, html);
  }
}
