import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

@Injectable()
export class ResumesService {
  private readonly logger = new Logger(ResumesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3Service,
  ) {}

  async upload(
    userId: string,
    file: Express.Multer.File,
    title: string,
  ) {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only PDF and DOCX files are allowed',
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds the 10MB limit');
    }

    const ext = path.extname(file.originalname).toLowerCase() || '.pdf';
    const s3Key = `resumes/${userId}/${uuidv4()}${ext}`;

    const s3Url = await this.s3.uploadFile(s3Key, file.buffer, file.mimetype);

    const resume = await this.prisma.resume.create({
      data: {
        userId,
        title,
        originalName: file.originalname,
        s3Key,
        s3Url,
        fileSize: file.size,
        mimeType: file.mimetype,
        isDefault: false,
      },
    });

    // If this is user's first resume, set as default
    const count = await this.prisma.resume.count({ where: { userId } });
    if (count === 1) {
      await this.prisma.resume.update({
        where: { id: resume.id },
        data: { isDefault: true },
      });
      resume.isDefault = true;
    }

    this.logger.log(`Resume uploaded for user ${userId}: ${resume.id}`);

    return resume;
  }

  async findAll(userId: string) {
    const resumes = await this.prisma.resume.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    return resumes;
  }

  async findOne(userId: string, id: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id } });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resume');
    }

    // Generate a fresh signed URL for download
    const signedUrl = await this.s3.getSignedUrl(resume.s3Key, 3600);

    return { ...resume, downloadUrl: signedUrl };
  }

  async delete(userId: string, id: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id } });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resume');
    }

    await this.s3.deleteFile(resume.s3Key);
    await this.prisma.resume.delete({ where: { id } });

    this.logger.log(`Resume deleted: ${id} for user ${userId}`);

    return { message: 'Resume deleted successfully' };
  }

  async setDefault(userId: string, id: string) {
    const resume = await this.prisma.resume.findUnique({ where: { id } });

    if (!resume) {
      throw new NotFoundException('Resume not found');
    }

    if (resume.userId !== userId) {
      throw new ForbiddenException('You do not have access to this resume');
    }

    // Clear existing default
    await this.prisma.resume.updateMany({
      where: { userId, isDefault: true },
      data: { isDefault: false },
    });

    const updated = await this.prisma.resume.update({
      where: { id },
      data: { isDefault: true },
    });

    return updated;
  }
}
