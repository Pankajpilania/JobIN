import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OciJwksService } from './oci-jwks.service';

describe('OciJwksService', () => {
  const settings = {
    OCI_DOMAIN_URL: 'https://example.identity.oraclecloud.com',
    OCI_JWKS_URL: 'https://example.identity.oraclecloud.com/admin/v1/SigningCert/jwk',
  };
  const keys = { keys: [{ kty: 'RSA', kid: 'current-key' }] };

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('fetches public signing keys and caches them', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
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

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toBe(settings.OCI_JWKS_URL);
    expect(fetch.mock.calls[0][1]).toEqual(
      expect.objectContaining({
        headers: { Accept: 'application/json' },
      }),
    );
  });

  it('limits OCI RS256 key operations to signature verification', async () => {
    const ociJwks = {
      keys: [
        {
          kty: 'RSA',
          kid: 'current-key',
          alg: 'RS256',
          key_ops: ['verify', 'wrapKey', 'encrypt'],
        },
      ],
    };
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(ociJwks), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const service = new OciJwksService({
      get: jest.fn((key: string) => settings[key as keyof typeof settings]),
    } as unknown as ConfigService);

    await expect(service.getJwks()).resolves.toEqual({
      keys: [{ ...ociJwks.keys[0], key_ops: ['verify'] }],
    });
  });

  it('derives the domain origin from the JWKS URL when OCI_DOMAIN_URL is omitted', async () => {
    const fetch = jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(JSON.stringify(keys), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    const service = new OciJwksService({
      get: jest.fn((key: string) => (key === 'OCI_JWKS_URL' ? settings.OCI_JWKS_URL : undefined)),
    } as unknown as ConfigService);

    await expect(service.getJwks()).resolves.toEqual(keys);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(String(fetch.mock.calls[0][0])).toBe(settings.OCI_JWKS_URL);
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
      .mockResolvedValueOnce(new Response('unauthorized', { status: 401 }));
    const service = new OciJwksService({
      get: jest.fn((key: string) => settings[key as keyof typeof settings]),
    } as unknown as ConfigService);

    await expect(service.getJwks()).rejects.toThrow('OCI signing-key request failed (401).');
  });
});
