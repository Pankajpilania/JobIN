import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ResumesService } from './resumes.service';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';

const mockPrismaService = {
  resume: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    count: jest.fn(),
  },
};

const mockS3Service = {
  uploadFile: jest.fn().mockResolvedValue('https://s3.example.com/resumes/user-1/file.pdf'),
  deleteFile: jest.fn().mockResolvedValue(undefined),
  getSignedUrl: jest.fn().mockResolvedValue('https://s3.example.com/signed-url'),
};

const mockFile: Express.Multer.File = {
  fieldname: 'file',
  originalname: 'my-resume.pdf',
  encoding: '7bit',
  mimetype: 'application/pdf',
  buffer: Buffer.from('mock pdf content'),
  size: 1024,
  destination: '',
  filename: '',
  path: '',
  stream: null as any,
};

describe('ResumesService', () => {
  let service: ResumesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResumesService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: S3Service, useValue: mockS3Service },
      ],
    }).compile();

    service = module.get<ResumesService>(ResumesService);
    jest.clearAllMocks();
  });

  describe('upload', () => {
    it('should upload a resume and create a DB record', async () => {
      const userId = 'user-uuid-1';
      const title = 'Software Engineer Resume';

      const createdResume = {
        id: 'resume-uuid-1',
        userId,
        title,
        s3Key: `resumes/${userId}/some-uuid.pdf`,
        s3Url: 'https://s3.example.com/resumes/user-1/file.pdf',
        fileSize: mockFile.size,
        mimeType: mockFile.mimetype,
        isDefault: false,
        atsScore: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.resume.create.mockResolvedValue(createdResume);
      mockPrismaService.resume.count.mockResolvedValue(1);
      mockPrismaService.resume.update.mockResolvedValue({ ...createdResume, isDefault: true });

      const result = await service.upload(userId, mockFile, title);

      expect(mockS3Service.uploadFile).toHaveBeenCalledWith(
        expect.stringContaining(`resumes/${userId}/`),
        mockFile.buffer,
        mockFile.mimetype,
      );
      expect(mockPrismaService.resume.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId,
            title,
            mimeType: 'application/pdf',
          }),
        }),
      );
      expect(result.id).toBe('resume-uuid-1');
    });

    it('should reject invalid file types', async () => {
      const invalidFile = { ...mockFile, mimetype: 'image/png' };

      await expect(
        service.upload('user-uuid-1', invalidFile as Express.Multer.File, 'My Resume'),
      ).rejects.toThrow(BadRequestException);

      expect(mockS3Service.uploadFile).not.toHaveBeenCalled();
    });

    it('should reject files exceeding 10MB', async () => {
      const largeFile = { ...mockFile, size: 11 * 1024 * 1024 };

      await expect(
        service.upload('user-uuid-1', largeFile as Express.Multer.File, 'My Resume'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when no file is provided', async () => {
      await expect(
        service.upload('user-uuid-1', null as any, 'My Resume'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return only resumes belonging to the requesting user', async () => {
      const userId = 'user-uuid-1';
      const resumes = [
        { id: 'resume-1', userId, title: 'Resume A', isDefault: true },
        { id: 'resume-2', userId, title: 'Resume B', isDefault: false },
      ];

      mockPrismaService.resume.findMany.mockResolvedValue(resumes);

      const result = await service.findAll(userId);

      expect(mockPrismaService.resume.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId },
        }),
      );
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.userId === userId)).toBe(true);
    });

    it('should return empty array when user has no resumes', async () => {
      mockPrismaService.resume.findMany.mockResolvedValue([]);

      const result = await service.findAll('user-with-no-resumes');

      expect(result).toEqual([]);
    });
  });

  describe('delete', () => {
    it('should delete a resume from S3 and DB', async () => {
      const userId = 'user-uuid-1';
      const resumeId = 'resume-uuid-1';
      const resume = {
        id: resumeId,
        userId,
        s3Key: 'resumes/user-uuid-1/file.pdf',
      };

      mockPrismaService.resume.findUnique.mockResolvedValue(resume);
      mockPrismaService.resume.delete.mockResolvedValue(resume);

      const result = await service.delete(userId, resumeId);

      expect(mockS3Service.deleteFile).toHaveBeenCalledWith(resume.s3Key);
      expect(mockPrismaService.resume.delete).toHaveBeenCalledWith({ where: { id: resumeId } });
      expect(result.message).toContain('deleted');
    });

    it('should throw ForbiddenException when user does not own the resume', async () => {
      mockPrismaService.resume.findUnique.mockResolvedValue({
        id: 'resume-uuid-1',
        userId: 'other-user-id',
        s3Key: 'resumes/other-user/file.pdf',
      });

      await expect(service.delete('user-uuid-1', 'resume-uuid-1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockS3Service.deleteFile).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when resume does not exist', async () => {
      mockPrismaService.resume.findUnique.mockResolvedValue(null);

      await expect(service.delete('user-uuid-1', 'nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
