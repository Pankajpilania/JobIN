import { Test, TestingModule } from '@nestjs/testing';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ApplicationStatus } from './dto/create-application.dto';

const mockPrismaService = {
  jobApplication: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ApplicationsService', () => {
  let service: ApplicationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApplicationsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ApplicationsService>(ApplicationsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a job application for the authenticated user', async () => {
      const userId = 'user-uuid-1';
      const dto = {
        jobTitle: 'Senior Software Engineer',
        companyName: 'Acme Corp',
        location: 'London, UK',
        status: ApplicationStatus.SAVED,
      };

      const createdApp = {
        id: 'app-uuid-1',
        userId,
        ...dto,
        notes: null,
        jobListingId: null,
        resumeId: null,
        coverLetterId: null,
        appliedDate: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.jobApplication.create.mockResolvedValue(createdApp);

      const result = await service.create(userId, dto);

      expect(mockPrismaService.jobApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            jobTitle: dto.jobTitle,
            companyName: dto.companyName,
          }),
        }),
      );
      expect(result.id).toBe('app-uuid-1');
      expect(result.userId).toBe(userId);
    });

    it('should default status to SAVED when not specified', async () => {
      const userId = 'user-uuid-1';
      const dto = { jobTitle: 'Engineer', companyName: 'Corp' };

      mockPrismaService.jobApplication.create.mockResolvedValue({
        id: 'app-uuid-2',
        userId,
        status: 'SAVED',
        ...dto,
      });

      await service.create(userId, dto as any);

      expect(mockPrismaService.jobApplication.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SAVED' }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should return all applications for the authenticated user', async () => {
      const userId = 'user-uuid-1';
      const apps = [
        { id: 'app-1', userId, status: 'SAVED', jobTitle: 'Engineer', companyName: 'Corp A' },
        { id: 'app-2', userId, status: 'APPLIED', jobTitle: 'Developer', companyName: 'Corp B' },
      ];

      mockPrismaService.jobApplication.findMany.mockResolvedValue(apps);

      const result = await service.findAll(userId);

      expect(mockPrismaService.jobApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId } }),
      );
      expect(result).toHaveLength(2);
      expect(result.every((a) => a.userId === userId)).toBe(true);
    });

    it('should filter by status when provided', async () => {
      const userId = 'user-uuid-1';
      mockPrismaService.jobApplication.findMany.mockResolvedValue([
        { id: 'app-1', userId, status: 'INTERVIEW' },
      ]);

      await service.findAll(userId, 'INTERVIEW');

      expect(mockPrismaService.jobApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId, status: 'INTERVIEW' },
        }),
      );
    });

    it('should not apply status filter when status is undefined', async () => {
      const userId = 'user-uuid-1';
      mockPrismaService.jobApplication.findMany.mockResolvedValue([]);

      await service.findAll(userId);

      expect(mockPrismaService.jobApplication.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        }),
      );
    });
  });

  describe('update', () => {
    it('should update application status successfully', async () => {
      const userId = 'user-uuid-1';
      const appId = 'app-uuid-1';
      const existingApp = { id: appId, userId, status: 'SAVED' };
      const updatedApp = { id: appId, userId, status: 'APPLIED', appliedDate: new Date() };

      mockPrismaService.jobApplication.findUnique.mockResolvedValue(existingApp);
      mockPrismaService.jobApplication.update.mockResolvedValue(updatedApp);

      const result = await service.update(userId, appId, {
        status: ApplicationStatus.APPLIED,
        appliedDate: new Date().toISOString(),
      });

      expect(mockPrismaService.jobApplication.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: appId } }),
      );
      expect(result.status).toBe('APPLIED');
    });

    it('should throw ForbiddenException when updating another user\'s application', async () => {
      mockPrismaService.jobApplication.findUnique.mockResolvedValue({
        id: 'app-uuid-1',
        userId: 'other-user-id',
        status: 'SAVED',
      });

      await expect(
        service.update('user-uuid-1', 'app-uuid-1', { status: ApplicationStatus.APPLIED }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException for non-existent application', async () => {
      mockPrismaService.jobApplication.findUnique.mockResolvedValue(null);

      await expect(
        service.update('user-uuid-1', 'nonexistent', { status: ApplicationStatus.APPLIED }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete an application belonging to the user', async () => {
      const userId = 'user-uuid-1';
      const appId = 'app-uuid-1';

      mockPrismaService.jobApplication.findUnique.mockResolvedValue({
        id: appId,
        userId,
        status: 'SAVED',
      });
      mockPrismaService.jobApplication.delete.mockResolvedValue({ id: appId });

      const result = await service.delete(userId, appId);

      expect(mockPrismaService.jobApplication.delete).toHaveBeenCalledWith({ where: { id: appId } });
      expect(result.message).toContain('deleted');
    });

    it('should throw ForbiddenException when deleting another user\'s application', async () => {
      mockPrismaService.jobApplication.findUnique.mockResolvedValue({
        id: 'app-uuid-1',
        userId: 'different-user',
        status: 'SAVED',
      });

      await expect(service.delete('user-uuid-1', 'app-uuid-1')).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.jobApplication.delete).not.toHaveBeenCalled();
    });
  });
});
