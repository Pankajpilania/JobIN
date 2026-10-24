import { ForbiddenException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { EmailService } from '../email/email.service';
import { AISettingsCrypto } from '../ai/ai-settings-crypto';
import { AdminService } from './admin.service';

describe('AdminService deleteUser', () => {
  let prisma: {
    user: { findUnique: jest.Mock; delete: jest.Mock };
    $transaction: jest.Mock;
  };
  let config: { get: jest.Mock };
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn(),
    };
    config = { get: jest.fn() };
    service = new AdminService(
      prisma as unknown as PrismaService,
      {} as EmailService,
      config as unknown as ConfigService,
      {} as AISettingsCrypto,
      { deleteFileOrThrow: jest.fn() } as unknown as S3Service,
    );
  });

  it('prevents an administrator from deleting their own account', async () => {
    await expect(service.deleteUser('admin-id', 'admin-id')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  it('protects all admin accounts from deletion', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'target-id',
      roles: [{ role: { name: 'SUPER_ADMIN' } }],
    });

    await expect(service.deleteUser('admin-id', 'target-id')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('requires Supabase admin credentials before deleting a linked account', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'target-id',
      supabaseId: 'supabase-id',
      email: 'user@example.com',
      fullName: 'Test User',
      roles: [],
      subscriptions: [],
      resumes: [],
    });

    await expect(service.deleteUser('admin-id', 'target-id')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
