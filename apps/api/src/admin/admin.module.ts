import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService }    from './admin.service';
import { AdminRoleGuard }  from './guards/admin-role.guard';
import { EmailModule }     from '../email/email.module';

@Module({
  imports:     [EmailModule],
  controllers: [AdminController],
  providers:   [AdminService, AdminRoleGuard],
  exports:     [AdminService],
})
export class AdminModule {}
