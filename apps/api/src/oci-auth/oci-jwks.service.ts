import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { JSONWebKeySet } from 'jose';

interface OciClientTokenResponse {
  access_token: string;
  expires_in: number;
}

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

function isOciClientTokenResponse(value: unknown): value is OciClientTokenResponse {
  if (!value || typeof value !== 'object') return false;
  const token = value as Record<string, unknown>;
  return (
    typeof token.access_token === 'string' &&
    Boolean(token.access_token) &&
    typeof token.expires_in === 'number' &&
    Number.isFinite(token.expires_in) &&
    token.expires_in > 0
  );
}

@Injectable()
export class OciJwksService {
  private accessToken?: { value: string; expiresAt: number };
  private accessTokenRequest?: Promise<string>;
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
    const accessToken = await this.getAccessToken();
    let response: Response;
    try {
      response = await fetch(jwksUrl, {
        headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
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
    return payload;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.accessToken.expiresAt > Date.now() + 30_000) {
      return this.accessToken.value;
    }
    if (!this.accessTokenRequest) {
      this.accessTokenRequest = this.requestAccessToken();
    }

    try {
      return await this.accessTokenRequest;
    } finally {
      this.accessTokenRequest = undefined;
    }
  }

  private async requestAccessToken(): Promise<string> {
    const { domainUrl, clientId, clientSecret } = this.getSettings();
    let response: Response;
    try {
      response = await fetch(new URL('/oauth2/v1/token', domainUrl), {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'client_credentials',
          scope: 'urn:opc:idm:__myscopes__',
        }),
        signal: AbortSignal.timeout(10_000),
      });
    } catch {
      throw new ServiceUnavailableException('OCI signing-key client authentication failed.');
    }

    if (!response.ok) {
      throw new ServiceUnavailableException(
        `OCI signing-key client authentication failed (${response.status}).`,
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new ServiceUnavailableException('OCI returned an invalid client-token response.');
    }
    if (!isOciClientTokenResponse(payload)) {
      throw new ServiceUnavailableException('OCI returned an invalid client-token response.');
    }

    this.accessToken = {
      value: payload.access_token,
      expiresAt: Date.now() + payload.expires_in * 1000,
    };
    return payload.access_token;
  }

  private getSettings() {
    const domainValue = this.config.get<string>('OCI_DOMAIN_URL')?.trim();
    const jwksValue = this.config.get<string>('OCI_JWKS_URL')?.trim();
    const clientId = this.config.get<string>('OCI_JWKS_CLIENT_ID')?.trim();
    const clientSecret = this.config.get<string>('OCI_JWKS_CLIENT_SECRET')?.trim();
    if (!domainValue || !jwksValue || !clientId || !clientSecret) {
      throw new ServiceUnavailableException('OCI signing-key client configuration is incomplete.');
    }

    let domainUrl: URL;
    let jwksUrl: URL;
    try {
      domainUrl = new URL(domainValue);
      jwksUrl = new URL(jwksValue);
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

    return { domainUrl, jwksUrl, clientId, clientSecret };
  }
}
