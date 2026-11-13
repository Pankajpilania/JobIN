import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { PublicContentController } from './public-content.controller';
import { AdminService } from './admin.service';
import { AdminRoleGuard } from './guards/admin-role.guard';
import { EmailModule } from '../email/email.module';
import { AIModule } from '../ai/ai.module';

@Module({
  imports: [EmailModule, AIModule],
  controllers: [AdminController, PublicContentController],
  providers: [AdminService, AdminRoleGuard],
  exports: [AdminService],
})
export class AdminModule {}
