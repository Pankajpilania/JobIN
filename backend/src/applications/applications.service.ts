import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateApplicationDto, ApplicationStatus } from './dto/create-application.dto';
import { UpdateApplicationDto } from './dto/update-application.dto';

@Injectable()
export class ApplicationsService {
  private readonly logger = new Logger(ApplicationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateApplicationDto) {
    const application = await this.prisma.jobApplication.create({
      data: {
        userId,
        jobTitle: dto.jobTitle,
        companyName: dto.companyName,
        location: dto.location,
        status: (dto.status as any) || 'SAVED',
        notes: dto.notes,
        resumeId: dto.resumeId || null,
        coverLetterId: dto.coverLetterId || null,
      },
    });

    this.logger.log(`Application created for user ${userId}: ${application.id}`);
    return application;
  }

  async findAll(userId: string, status?: string) {
    const where: any = { userId };
    if (status) {
      where.status = status;
    }

    const applications = await this.prisma.jobApplication.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
    });

    return applications;
  }

  async findOne(userId: string, id: string) {
    const application = await this.prisma.jobApplication.findUnique({
      where: { id },
    });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    return application;
  }

  async update(userId: string, id: string, dto: UpdateApplicationDto) {
    const application = await this.prisma.jobApplication.findUnique({ where: { id } });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    const updated = await this.prisma.jobApplication.update({
      where: { id },
      data: {
        ...(dto.jobTitle !== undefined && { jobTitle: dto.jobTitle }),
        ...(dto.companyName !== undefined && { companyName: dto.companyName }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.status !== undefined && { status: dto.status as any }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.appliedDate !== undefined && { appliedDate: new Date(dto.appliedDate) }),
        ...(dto.resumeId !== undefined && { resumeId: dto.resumeId }),
        ...(dto.coverLetterId !== undefined && { coverLetterId: dto.coverLetterId }),
      },
    });

    this.logger.log(`Application updated: ${id} for user ${userId}`);
    return updated;
  }

  async delete(userId: string, id: string) {
    const application = await this.prisma.jobApplication.findUnique({ where: { id } });

    if (!application) {
      throw new NotFoundException('Application not found');
    }

    if (application.userId !== userId) {
      throw new ForbiddenException('You do not have access to this application');
    }

    await this.prisma.jobApplication.delete({ where: { id } });

    this.logger.log(`Application deleted: ${id} for user ${userId}`);
    return { message: 'Application deleted successfully' };
  }
}
