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

  afterEach(() => {
    jest.restoreAllMocks();
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

  it('allows a verified Supabase account to replace the temporary identity after migration rollback', async () => {
    prisma.user.findFirst.mockResolvedValue({
      ...existingUser,
      supabaseId: 'auth0|temporary-subject',
      auth0Sub: 'auth0|temporary-subject',
    });
    prisma.user.update.mockResolvedValue({
      ...existingUser,
      supabaseId: 'restored-supabase-user',
      auth0Sub: 'auth0|temporary-subject',
    });

    const result = await guard['findOrCreateDbUser']({
      id: 'restored-supabase-user',
      email: 'candidate@example.com',
      email_confirmed_at: '2026-10-24T00:00:00.000Z',
    });

    expect(result.dbUser.supabaseId).toBe('restored-supabase-user');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { supabaseId: 'restored-supabase-user' },
      }),
    );
  });

  it('links an Auth0 subject to the verified email record without changing its legacy identity', async () => {
    const legacyUser = {
      ...existingUser,
      supabaseId: 'legacy-supabase-user',
      auth0Sub: null,
    };
    prisma.user.findFirst.mockResolvedValue(legacyUser);
    prisma.user.update.mockResolvedValue({
      ...legacyUser,
      auth0Sub: 'auth0|new-subject',
    });
    const auth0Guard = new SupabaseAuthGuard(
      {
        get: jest.fn(
          (key: string) =>
            ({
              AUTH_PROVIDER: 'auth0',
              AUTH0_DOMAIN: 'tenant.example.auth0.com',
              AUTH0_AUDIENCE: 'https://api.jobin.today',
            })[key],
        ),
      } as unknown as ConfigService,
      prisma as unknown as PrismaService,
      {} as EmailService,
    );

    const result = await auth0Guard['findOrCreateAuth0DbUser']({
      subject: 'auth0|new-subject',
      email: 'Candidate@Example.com',
      fullName: 'Candidate Name',
    });

    expect(result.created).toBe(false);
    expect(result.dbUser.supabaseId).toBe('legacy-supabase-user');
    expect(result.dbUser.auth0Sub).toBe('auth0|new-subject');
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: legacyUser.id },
        data: { auth0Sub: 'auth0|new-subject' },
      }),
    );
  });

  it('uses the Auth0 subject as the compatibility identifier when the existing row has no legacy identity', async () => {
    prisma.user.findFirst.mockResolvedValue(existingUser);
    prisma.user.update.mockResolvedValue({
      ...existingUser,
      supabaseId: 'auth0|new-subject',
      auth0Sub: 'auth0|new-subject',
    });
    const auth0Guard = new SupabaseAuthGuard(
      {
        get: jest.fn(
          (key: string) =>
            ({
              AUTH_PROVIDER: 'auth0',
              AUTH0_DOMAIN: 'tenant.example.auth0.com',
              AUTH0_AUDIENCE: 'https://api.jobin.today',
            })[key],
        ),
      } as unknown as ConfigService,
      prisma as unknown as PrismaService,
      {} as EmailService,
    );

    await auth0Guard['findOrCreateAuth0DbUser']({
      subject: 'auth0|new-subject',
      email: 'candidate@example.com',
    });

    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          auth0Sub: 'auth0|new-subject',
          supabaseId: 'auth0|new-subject',
        },
      }),
    );
  });

  it('creates a JobIN record with both current and legacy identity fields for a new Auth0 user', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      ...existingUser,
      supabaseId: 'auth0|new-subject',
      auth0Sub: 'auth0|new-subject',
    });
    const auth0Guard = new SupabaseAuthGuard(
      {
        get: jest.fn(
          (key: string) =>
            ({
              AUTH_PROVIDER: 'auth0',
              AUTH0_DOMAIN: 'tenant.example.auth0.com',
              AUTH0_AUDIENCE: 'https://api.jobin.today',
            })[key],
        ),
      } as unknown as ConfigService,
      prisma as unknown as PrismaService,
      {} as EmailService,
    );

    const result = await auth0Guard['findOrCreateAuth0DbUser']({
      subject: 'auth0|new-subject',
      email: 'new@example.com',
    });

    expect(result.created).toBe(true);
    expect(prisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          auth0Sub: 'auth0|new-subject',
          supabaseId: 'auth0|new-subject',
          email: 'new@example.com',
        }),
      }),
    );
  });

  it('links a verified OCI email to the existing JobIN account without replacing its Supabase ID', async () => {
    const legacyUser = {
      ...existingUser,
      supabaseId: 'legacy-supabase-user',
      ociSub: null,
    };
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.findFirst.mockResolvedValue(legacyUser);
    prisma.user.update.mockResolvedValue({
      ...legacyUser,
      ociSub: 'oci-user-subject',
    });
    const ociGuard = new SupabaseAuthGuard(
      {
        get: jest.fn(
          (key: string) =>
            ({
              AUTH_PROVIDER: 'oci',
              OCI_ISSUER: 'https://identity.oraclecloud.com/',
              OCI_JWKS_URL: 'https://example.identity.oraclecloud.com/jwks',
              OCI_USERINFO_URL: 'https://example.identity.oraclecloud.com/userinfo',
              OCI_API_AUDIENCE: 'https://api.jobin.today',
              OCI_API_SCOPE: 'https://api.jobin.today/jobin-api',
            })[key],
        ),
      } as unknown as ConfigService,
      prisma as unknown as PrismaService,
      {} as EmailService,
    );
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          sub: 'oci-user-subject',
          email: 'Candidate@Example.com',
          email_verified: true,
          name: 'Candidate Name',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const result = await ociGuard['findOrCreateOciDbUser']('oci-user-subject', 'access-token');

    expect(result.created).toBe(false);
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: legacyUser.id },
        data: { ociSub: 'oci-user-subject' },
      }),
    );
    expect(result.dbUser.supabaseId).toBe('legacy-supabase-user');
  });

  it('rejects an OCI profile without a verified email', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          sub: 'oci-user-subject',
          email: 'candidate@example.com',
          email_verified: false,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    const ociGuard = new SupabaseAuthGuard(
      {
        get: jest.fn(
          (key: string) =>
            ({
              AUTH_PROVIDER: 'oci',
              OCI_ISSUER: 'https://identity.oraclecloud.com/',
              OCI_JWKS_URL: 'https://example.identity.oraclecloud.com/jwks',
              OCI_USERINFO_URL: 'https://example.identity.oraclecloud.com/userinfo',
              OCI_API_AUDIENCE: 'https://api.jobin.today',
              OCI_API_SCOPE: 'https://api.jobin.today/jobin-api',
            })[key],
        ),
      } as unknown as ConfigService,
      prisma as unknown as PrismaService,
      {} as EmailService,
    );

    await expect(
      ociGuard['findOrCreateOciDbUser']('oci-user-subject', 'access-token'),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });
});
