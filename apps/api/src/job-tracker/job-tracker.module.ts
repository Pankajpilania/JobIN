import { Module } from '@nestjs/common';
import { JobTrackerController } from './job-tracker.controller';
import { JobTrackerService } from './job-tracker.service';

@Module({
  controllers: [JobTrackerController],
  providers:   [JobTrackerService],
  exports:     [JobTrackerService],
})
export class JobTrackerModule {}
