import { Module } from '@nestjs/common';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { AdminRoleGuard } from '../admin/guards/admin-role.guard';

@Module({
  controllers: [BillingController],
  providers:   [BillingService, AdminRoleGuard],
  exports:     [BillingService],
})
export class BillingModule {}
