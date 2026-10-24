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
  let s3: { deleteFileOrThrow: jest.Mock };
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn(), delete: jest.fn() },
      $transaction: jest.fn(),
    };
    config = { get: jest.fn() };
    s3 = { deleteFileOrThrow: jest.fn() };
    service = new AdminService(
      prisma as unknown as PrismaService,
      {} as EmailService,
      config as unknown as ConfigService,
      {} as AISettingsCrypto,
      s3 as unknown as S3Service,
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

  it('deletes an Auth0-only account without requiring legacy Supabase credentials', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'target-id',
      supabaseId: 'auth0|subject',
      auth0Sub: 'auth0|subject',
      email: 'user@example.com',
      fullName: 'Test User',
      roles: [],
      subscriptions: [],
      resumes: [],
    });
    config.get.mockImplementation(
      (key: string) =>
        ({
          AUTH0_DOMAIN: 'tenant.example.auth0.com',
          AUTH0_MANAGEMENT_CLIENT_ID: 'management-client-id',
          AUTH0_MANAGEMENT_CLIENT_SECRET: 'management-client-secret',
        })[key],
    );
    prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) =>
      callback({
        auditLog: { updateMany: jest.fn() },
        user: { delete: jest.fn() },
      }),
    );
    jest.spyOn(service, 'audit').mockResolvedValue(undefined);
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'management-token' }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response);

    try {
      await expect(service.deleteUser('admin-id', 'target-id')).resolves.toEqual({ deleted: true });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(s3.deleteFileOrThrow).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });

  it('requires OCI management credentials before deleting an OCI-linked user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'target-id',
      supabaseId: 'oci-user-subject',
      ociSub: 'oci-user-subject',
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

  it('deletes the OCI identity without treating its compatibility ID as a Supabase user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'target-id',
      supabaseId: 'oci-user-subject',
      ociSub: 'oci-user-subject',
      email: 'user@example.com',
      fullName: 'Test User',
      roles: [],
      subscriptions: [],
      resumes: [],
    });
    config.get.mockImplementation(
      (key: string) =>
        ({
          OCI_DOMAIN_URL: 'https://idcs.example.identity.oraclecloud.com',
          OCI_MANAGEMENT_CLIENT_ID: 'management-client-id',
          OCI_MANAGEMENT_CLIENT_SECRET: 'management-client-secret',
        })[key],
    );
    prisma.$transaction.mockImplementation(async (callback: (transaction: unknown) => unknown) =>
      callback({
        auditLog: { updateMany: jest.fn() },
        user: { delete: jest.fn() },
      }),
    );
    jest.spyOn(service, 'audit').mockResolvedValue(undefined);
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ access_token: 'management-token' }),
      } as Response)
      .mockResolvedValueOnce({ ok: true, status: 204 } as Response);

    try {
      await expect(service.deleteUser('admin-id', 'target-id')).resolves.toEqual({ deleted: true });
      expect(fetchSpy).toHaveBeenCalledTimes(2);
      expect(fetchSpy.mock.calls[0][0]).toBe(
        'https://idcs.example.identity.oraclecloud.com/oauth2/v1/token',
      );
      expect(fetchSpy.mock.calls[1][0]).toBe(
        'https://idcs.example.identity.oraclecloud.com/admin/v1/Users/oci-user-subject',
      );
      expect(s3.deleteFileOrThrow).not.toHaveBeenCalled();
    } finally {
      fetchSpy.mockRestore();
    }
  });
});

describe('AdminService updateUser role assignment', () => {
  let prisma: {
    user: { findUnique: jest.Mock };
    role: { findFirst: jest.Mock };
    userRole: { upsert: jest.Mock };
  };
  let service: AdminService;

  beforeEach(() => {
    prisma = {
      user: { findUnique: jest.fn() },
      role: { findFirst: jest.fn() },
      userRole: { upsert: jest.fn() },
    };
    service = new AdminService(
      prisma as unknown as PrismaService,
      {} as EmailService,
      {} as ConfigService,
      {} as AISettingsCrypto,
      {} as S3Service,
    );
    jest.spyOn(service, 'audit').mockResolvedValue(undefined);
  });

  it('rejects role assignment by lower-tier administrators before changing the target', async () => {
    prisma.user.findUnique.mockResolvedValue({
      roles: [{ role: { name: 'SUPPORT_ADMIN' } }],
    });

    await expect(
      service.updateUser('support-admin-id', 'target-user-id', { role: 'SUPER_ADMIN' }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.user.findUnique).toHaveBeenCalledTimes(1);
    expect(prisma.role.findFirst).not.toHaveBeenCalled();
    expect(prisma.userRole.upsert).not.toHaveBeenCalled();
  });

  it('allows a super admin to assign a valid role', async () => {
    prisma.user.findUnique
      .mockResolvedValueOnce({ roles: [{ role: { name: 'SUPER_ADMIN' } }] })
      .mockResolvedValueOnce({
        id: 'target-user-id',
        status: 'ACTIVE',
        roles: [],
      })
      .mockResolvedValueOnce({ id: 'target-user-id' });
    prisma.role.findFirst.mockResolvedValue({ id: 'role-id' });

    await service.updateUser('super-admin-id', 'target-user-id', { role: 'SUPPORT_ADMIN' });

    expect(prisma.userRole.upsert).toHaveBeenCalledWith({
      where: { userId_roleId: { userId: 'target-user-id', roleId: 'role-id' } },
      create: { userId: 'target-user-id', roleId: 'role-id' },
      update: {},
    });
  });
});
