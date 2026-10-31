import { Module } from '@nestjs/common';
import { JobTrackerModule } from '../job-tracker/job-tracker.module';
import { JobSearchController } from './job-search.controller';
import { JobSearchService } from './job-search.service';

@Module({
  imports: [JobTrackerModule],
  controllers: [JobSearchController],
  providers: [JobSearchService],
})
export class JobSearchModule {}
