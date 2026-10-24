import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OciJwksService } from './oci-jwks.service';

describe('OciJwksService', () => {
  const settings = {
    OCI_DOMAIN_URL: 'https://example.identity.oraclecloud.com',
    OCI_JWKS_URL: 'https://example.identity.oraclecloud.com/admin/v1/SigningCert/jwk',
    OCI_JWKS_CLIENT_ID: 'jwks-client-id',
    OCI_JWKS_CLIENT_SECRET: 'jwks-client-secret',
  };
  const keys = { keys: [{ kty: 'RSA', kid: 'current-key' }] };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('uses a confidential client to fetch and cache the signing keys', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify({ access_token: 'service-token', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    fetch.mockResolvedValueOnce(
      new Response(JSON.stringify(keys), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const service = new OciJwksService({
      get: jest.fn((key: string) => settings[key as keyof typeof settings]),
    } as unknown as ConfigService);

    await expect(service.getJwks()).resolves.toEqual(keys);
    await expect(service.getJwks()).resolves.toEqual(keys);

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(String(fetch.mock.calls[0][0])).toBe(
      'https://example.identity.oraclecloud.com/oauth2/v1/token',
    );
    expect(fetch.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        method: 'POST',
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'urn:opc:idm:__myscopes__',
        }),
      }),
    );
    expect(fetch.mock.calls[1][1]).toEqual(
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer service-token' }),
      }),
    );
  });

  it('rejects signing-key URLs outside the configured identity domain', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch');
    const service = new OciJwksService({
      get: jest.fn((key: string) =>
        key === 'OCI_JWKS_URL'
          ? 'https://attacker.example/admin/v1/SigningCert/jwk'
          : settings[key as keyof typeof settings],
      ),
    } as unknown as ConfigService);

    await expect(service.getJwks()).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('surfaces OCI signing-key authorization failures', async () => {
    jest
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ access_token: 'service-token', expires_in: 3600 }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));
    const service = new OciJwksService({
      get: jest.fn((key: string) => settings[key as keyof typeof settings]),
    } as unknown as ConfigService);

    await expect(service.getJwks()).rejects.toThrow('OCI signing-key request failed (401).');
  });
});
