import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma/prisma.module';
import { S3Module } from './s3/s3.module';
import { AIModule } from './ai/ai.module';
import { ExportModule } from './export/export.module';
import { EmailModule } from './email/email.module';
import { HealthModule } from './health/health.module';
import { UsersModule } from './users/users.module';
import { ResumesModule } from './resumes/resumes.module';
import { CoverLettersModule } from './cover-letters/cover-letters.module';
import { JobTrackerModule } from './job-tracker/job-tracker.module';
import { BillingModule } from './billing/billing.module';
import { AdminModule } from './admin/admin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),
    ThrottlerModule.forRoot([{ name: 'short', ttl: 60_000, limit: 60 }]),
    ScheduleModule.forRoot(),

    // ─── Global infrastructure ────────────────────────────────────────────
    PrismaModule,        // @Global
    S3Module,            // @Global
    AIModule,            // @Global
    ExportModule,        // @Global (Sprint 3)
    EmailModule,         // @Global (Sprint 6)

    // ─── Feature modules ──────────────────────────────────────────────────
    HealthModule,
    UsersModule,
    ResumesModule,       // Sprint 2
    CoverLettersModule,  // Sprint 3
    JobTrackerModule,    // Sprint 4
    BillingModule,       // Sprint 4 — Stripe
    AdminModule,         // Sprint 6 — Admin Portal
  ],
})
export class AppModule {}
