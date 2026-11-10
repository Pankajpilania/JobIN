import { Module } from '@nestjs/common';
import { JobTrackerModule } from '../job-tracker/job-tracker.module';
import { JobSearchController } from './job-search.controller';
import { JobFeedSyncService } from './job-feed-sync.service';
import { JobSearchService } from './job-search.service';

@Module({
  imports: [JobTrackerModule],
  controllers: [JobSearchController],
  providers: [JobSearchService, JobFeedSyncService],
})
export class JobSearchModule {}
