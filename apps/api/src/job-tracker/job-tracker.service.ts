import {
  Injectable, NotFoundException, ForbiddenException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto, ApplicationStatusDto } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

type AppStatus = ApplicationStatusDto;

// Statuses that count toward "in-pipeline" for interview rate calculation
const INTERVIEW_STATUSES: AppStatus[] = [
  ApplicationStatusDto.PHONE_SCREEN,
  ApplicationStatusDto.INTERVIEW,
  ApplicationStatusDto.TECHNICAL_ASSESSMENT,
  ApplicationStatusDto.FINAL_ROUND,
];

@Injectable()
export class JobTrackerService {
  private readonly logger = new Logger(JobTrackerService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async resolveUserId(supabaseId: string) {
    const user = await this.prisma.user.findUnique({ where: { supabaseId } });
    if (!user) throw new NotFoundException('User profile not found.');
    return user.id;
  }

  private async assertOwnership(id: string, userId: string) {
    const app = await this.prisma.jobApplication.findUnique({ where: { id } });
    if (!app)             throw new NotFoundException(`Application ${id} not found`);
    if (app.userId !== userId) throw new ForbiddenException('Access denied');
    return app;
  }

  // ─── Create ───────────────────────────────────────────────────────────────

  async create(supabaseId: string, dto: CreateApplicationDto) {
    const userId = await this.resolveUserId(supabaseId);

    // Auto-create company record if it doesn't exist
    let company: { id: string } | null = null;
    if (dto.companyName) {
      company = await this.prisma.company.upsert({
        where:  { name: dto.companyName },
        create: { name: dto.companyName, website: dto.jobUrl },
        update: {},
      });
    }

    const application = await this.prisma.jobApplication.create({
      data: {
        userId,
        companyId:     company?.id,
        jobTitle:      dto.jobTitle,
        companyName:   dto.companyName,
        location:      dto.location,
        jobUrl:        dto.jobUrl,
        salary:        dto.salary,
        status:        (dto.status ?? 'SAVED') as any,
        appliedDate:   dto.appliedDate ? new Date(dto.appliedDate) : null,
        followUpDate:  dto.followUpDate ? new Date(dto.followUpDate) : null,
        notes:         dto.notes,
        source:        dto.source,
        resumeId:      dto.resumeId,
        coverLetterId: dto.coverLetterId,
        jobDescription:dto.jobDescription,
      },
    });

    this.logger.log(`Created application ${application.id} for user ${userId}`);
    return application;
  }

  // ─── List (with optional status filter) ──────────────────────────────────

  async findAll(supabaseId: string, status?: AppStatus) {
    const userId = await this.resolveUserId(supabaseId);
    return this.prisma.jobApplication.findMany({
      where:   { userId, ...(status ? { status: status as any } : {}) },
      orderBy: { updatedAt: 'desc' },
      include: { company: { select: { id: true, name: true, logoUrl: true, website: true } } },
    });
  }

  // ─── Get single ───────────────────────────────────────────────────────────

  async findOne(supabaseId: string, id: string) {
    const userId = await this.resolveUserId(supabaseId);
    const app    = await this.assertOwnership(id, userId);
    return app;
  }

  // ─── Update (status + any other fields) ──────────────────────────────────

  async update(supabaseId: string, id: string, dto: UpdateApplicationDto) {
    const userId = await this.resolveUserId(supabaseId);
    await this.assertOwnership(id, userId);

    return this.prisma.jobApplication.update({
      where: { id },
      data:  {
        ...(dto.status        && { status:       dto.status as any }),
        ...(dto.jobTitle      && { jobTitle:      dto.jobTitle      }),
        ...(dto.companyName   && { companyName:   dto.companyName   }),
        ...(dto.location      !== undefined && { location:      dto.location      }),
        ...(dto.jobUrl        !== undefined && { jobUrl:        dto.jobUrl        }),
        ...(dto.salary        !== undefined && { salary:        dto.salary        }),
        ...(dto.notes         !== undefined && { notes:         dto.notes         }),
        ...(dto.source        !== undefined && { source:        dto.source        }),
        ...(dto.resumeId      !== undefined && { resumeId:      dto.resumeId      }),
        ...(dto.coverLetterId !== undefined && { coverLetterId: dto.coverLetterId }),
        ...(dto.appliedDate   !== undefined && { appliedDate:   dto.appliedDate ? new Date(dto.appliedDate) : null  }),
        ...(dto.followUpDate  !== undefined && { followUpDate:  dto.followUpDate ? new Date(dto.followUpDate) : null }),
      },
    });
  }

  // ─── Delete ───────────────────────────────────────────────────────────────

  async delete(supabaseId: string, id: string) {
    const userId = await this.resolveUserId(supabaseId);
    await this.assertOwnership(id, userId);
    await this.prisma.jobApplication.delete({ where: { id } });
  }

  // ─── Stats (for dashboard) ────────────────────────────────────────────────

  async getStats(supabaseId: string) {
    const userId = await this.resolveUserId(supabaseId);

    const all = await this.prisma.jobApplication.findMany({
      where:  { userId },
      select: { status: true, createdAt: true, updatedAt: true },
    });

    const byStatus: Record<string, number> = {};
    for (const app of all) {
      byStatus[app.status] = (byStatus[app.status] ?? 0) + 1;
    }

    const applied = byStatus['APPLIED'] ?? 0;
    const totalApplied = applied +
      (byStatus['PHONE_SCREEN'] ?? 0) +
      (byStatus['INTERVIEW'] ?? 0) +
      (byStatus['TECHNICAL_ASSESSMENT'] ?? 0) +
      (byStatus['FINAL_ROUND'] ?? 0) +
      (byStatus['OFFER'] ?? 0) +
      (byStatus['REJECTED'] ?? 0) +
      (byStatus['WITHDRAWN'] ?? 0);

    const inInterview = INTERVIEW_STATUSES.reduce((sum, s) => sum + (byStatus[s] ?? 0), 0);
    const offers      = byStatus['OFFER'] ?? 0;

    const interviewRate = totalApplied > 0
      ? Math.round((inInterview + offers) / totalApplied * 100)
      : 0;
    const offerRate = totalApplied > 0
      ? Math.round(offers / totalApplied * 100)
      : 0;

    // This week's applications
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const thisWeek = all.filter(a => new Date(a.createdAt) >= weekAgo).length;

    return {
      total:         all.length,
      totalApplied,
      byStatus,
      interviewRate,
      offerRate,
      thisWeek,
    };
  }

  // ─── Recent activity (for dashboard feed) ────────────────────────────────

  async getRecentActivity(supabaseId: string, limit = 8) {
    const userId = await this.resolveUserId(supabaseId);
    return this.prisma.jobApplication.findMany({
      where:   { userId },
      orderBy: { updatedAt: 'desc' },
      take:    limit,
      select:  { id: true, jobTitle: true, companyName: true, status: true, updatedAt: true, appliedDate: true, location: true },
    });
  }
}
