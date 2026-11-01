import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JSONWebKeySet } from 'jose';

function isJsonWebKeySet(value: unknown): value is JSONWebKeySet {
  if (!value || typeof value !== 'object') return false;
  const keys = (value as { keys?: unknown }).keys;
  return (
    Array.isArray(keys) &&
    keys.length > 0 &&
    keys.every(
      (key) =>
        !!key &&
        typeof key === 'object' &&
        !Array.isArray(key) &&
        typeof (key as Record<string, unknown>).kty === 'string',
    )
  );
}

function normalizeKeyOperations(jwks: JSONWebKeySet): JSONWebKeySet {
  return {
    ...jwks,
    keys: jwks.keys.map((key) =>
      key.kty === 'RSA' && key.alg === 'RS256' && key.key_ops?.includes('verify')
        ? { ...key, key_ops: ['verify'] }
        : key,
    ),
  };
}

@Injectable()
export class OciJwksService {
  private jwks?: { value: JSONWebKeySet; expiresAt: number };
  private jwksRequest?: Promise<JSONWebKeySet>;

  constructor(private readonly config: ConfigService) {}

  async getJwks(forceRefresh = false): Promise<JSONWebKeySet> {
    if (!forceRefresh && this.jwks && this.jwks.expiresAt > Date.now()) {
      return this.jwks.value;
    }
    if (!this.jwksRequest) {
      this.jwksRequest = this.fetchJwks();
    }

    try {
      const value = await this.jwksRequest;
      this.jwks = { value, expiresAt: Date.now() + 5 * 60_000 };
      return value;
    } finally {
      this.jwksRequest = undefined;
    }
  }

  private async fetchJwks(): Promise<JSONWebKeySet> {
    const { jwksUrl } = this.getSettings();
    let response: Response;
    try {
      response = await fetch(jwksUrl, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('OCI signing keys are unavailable.');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(`OCI signing-key request failed (${response.status}).`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ServiceUnavailableException('OCI returned an invalid signing-key response.');
    }
    if (!isJsonWebKeySet(payload)) {
      throw new ServiceUnavailableException('OCI returned an invalid signing-key response.');
    }
    return normalizeKeyOperations(payload);
  }

  private getSettings() {
    const domainValue = this.config.get<string>('OCI_DOMAIN_URL')?.trim();
    const jwksValue = this.config.get<string>('OCI_JWKS_URL')?.trim();
    if (!jwksValue) {
      throw new ServiceUnavailableException(
        'OCI_JWKS_URL is required to retrieve OCI signing keys.',
      );
    }

    let domainUrl: URL;
    let jwksUrl: URL;
    try {
      jwksUrl = new URL(jwksValue);
      // OCI_JWKS_URL already identifies the tenant-specific domain. Deriving the
      // origin avoids requiring a redundant setting in existing production envs.
      domainUrl = new URL(domainValue || jwksUrl.origin);
    } catch {
      throw new ServiceUnavailableException('OCI signing-key endpoint configuration is invalid.');
    }
    if (
      domainUrl.protocol !== 'https:' ||
      domainUrl.username ||
      domainUrl.password ||
      domainUrl.pathname !== '/' ||
      domainUrl.search ||
      domainUrl.hash ||
      jwksUrl.protocol !== 'https:' ||
      jwksUrl.origin !== domainUrl.origin ||
      jwksUrl.pathname !== '/admin/v1/SigningCert/jwk' ||
      jwksUrl.search ||
      jwksUrl.hash
    ) {
      throw new ServiceUnavailableException('OCI signing-key endpoint configuration is invalid.');
    }

    return { domainUrl, jwksUrl };
  }
}
