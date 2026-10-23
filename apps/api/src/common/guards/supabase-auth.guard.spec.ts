import { ConflictException, ForbiddenException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

describe('SupabaseAuthGuard user synchronization', () => {
  const existingUser = {
    id: 'db-user-id',
    supabaseId: null,
    email: 'candidate@example.com',
    fullName: 'Candidate Name',
    roles: [],
  };
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      update: jest.Mock;
      create: jest.Mock;
    };
  };
  let guard: SupabaseAuthGuard;

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(existingUser),
        update: jest.fn().mockResolvedValue({ ...existingUser, supabaseId: 'auth-user-id' }),
        create: jest.fn(),
      },
    };
    guard = new SupabaseAuthGuard(
      {
        get: jest.fn(
          (key: string) =>
            ({
              NEXT_PUBLIC_SUPABASE_URL: 'https://example.supabase.co',
              NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-key',
            })[key],
        ),
      } as unknown as ConfigService,
      prisma as unknown as PrismaService,
      {} as EmailService,
    );
  });

  it('links the authenticated Supabase user to the existing email record', async () => {
    const result = await guard['findOrCreateDbUser']({
      id: 'auth-user-id',
      email: 'Candidate@Example.com',
      email_confirmed_at: '2026-10-24T00:00:00.000Z',
    });

    expect(result.created).toBe(false);
    expect(result.dbUser.supabaseId).toBe('auth-user-id');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: existingUser.id },
        data: { supabaseId: 'auth-user-id' },
      }),
    );
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('does not link an existing email record before email confirmation', async () => {
    await expect(
      guard['findOrCreateDbUser']({
        id: 'auth-user-id',
        email: 'candidate@example.com',
      }),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('rejects an email already linked to another Supabase account', async () => {
    prisma.user.findFirst.mockResolvedValue({
      ...existingUser,
      supabaseId: 'different-auth-user',
    });

    await expect(
      guard['findOrCreateDbUser']({
        id: 'auth-user-id',
        email: 'candidate@example.com',
        email_confirmed_at: '2026-10-24T00:00:00.000Z',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
