import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exportJWK, generateKeyPair, SignJWT } from 'jose';
import { EmailService } from '../../email/email.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OciJwksService } from '../../oci-auth/oci-jwks.service';
import { SupabaseAuthGuard } from './supabase-auth.guard';

const issuer = 'https://identity.oraclecloud.com/';
const audience = 'https://api.jobin.today';
const fullScope = `${audience}/jobin-api`;

describe('SupabaseAuthGuard OCI token validation', () => {
  let privateKey: CryptoKey;
  let publicJwk: Record<string, unknown>;

  beforeAll(async () => {
    const keyPair = await generateKeyPair('RS256', { modulusLength: 2048 });
    privateKey = keyPair.privateKey as CryptoKey;
    publicJwk = {
      ...(await exportJWK(keyPair.publicKey)),
      kid: 'oci-test-key',
      alg: 'RS256',
      use: 'sig',
    };
  });

  async function createGuard(scope: string) {
    const user = {
      id: 'jobin-user-id',
      supabaseId: 'legacy-supabase-id',
      ociSub: 'oci-user-subject',
      email: 'candidate@example.com',
      fullName: 'Candidate Name',
      status: 'ACTIVE',
      roles: [],
    };
    const prisma = {
      user: { findUnique: jest.fn().mockResolvedValue(user) },
    };
    const jwks = { getJwks: jest.fn().mockResolvedValue({ keys: [publicJwk] }) };
    const config = {
      get: jest.fn(
        (key: string) =>
          ({
            AUTH_PROVIDER: 'oci',
            OCI_ISSUER: issuer,
            OCI_JWKS_URL: 'https://example.identity.oraclecloud.com/admin/v1/SigningCert/jwk',
            OCI_USERINFO_URL: 'https://example.identity.oraclecloud.com/oauth2/v1/userinfo',
            OCI_API_AUDIENCE: audience,
            OCI_API_SCOPE: fullScope,
          })[key],
      ),
    };
    const guard = new SupabaseAuthGuard(
      config as unknown as ConfigService,
      prisma as unknown as PrismaService,
      {} as EmailService,
      jwks as unknown as OciJwksService,
    );
    const token = await new SignJWT({ scope })
      .setProtectedHeader({ alg: 'RS256', kid: 'oci-test-key' })
      .setIssuer(issuer)
      .setAudience(audience)
      .setSubject('oci-user-subject')
      .setExpirationTime('5m')
      .sign(privateKey);

    return { guard, prisma, token, jwks };
  }

  it('accepts the OCI scope suffix after validating the JWT signature and audience', async () => {
    const { guard, token, jwks } = await createGuard('openid /jobin-api profile email');
    const request: { user?: Record<string, unknown> } = {};

    await expect(guard['activateOciUser'](token, request)).resolves.toBe(true);

    expect(jwks.getJwks).toHaveBeenCalledTimes(1);
    expect(request.user).toEqual(
      expect.objectContaining({
        sub: 'oci-user-subject',
        ociSub: 'oci-user-subject',
        email: 'candidate@example.com',
      }),
    );
  });

  it('rejects a valid OCI token without the JobIN API scope', async () => {
    const { guard, prisma, token } = await createGuard('openid profile email');

    await expect(guard['activateOciUser'](token, {})).rejects.toBeInstanceOf(UnauthorizedException);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });
});
