import { createLocalJWKSet, jwtVerify, type JSONWebKeySet } from 'jose';

interface OciMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint: string;
  jwks_uri: string;
}

interface OciTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  id_token: string;
}

interface OciUserInfo {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function base64Url(value: Uint8Array) {
  let binary = '';
  value.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function randomValue(length: number) {
  return base64Url(crypto.getRandomValues(new Uint8Array(length)));
}

async function createCodeChallenge(verifier: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64Url(new Uint8Array(digest));
}

function launchAuthFlow(url: string) {
  return new Promise<string>((resolve, reject) => {
    chrome.identity.launchWebAuthFlow({ url, interactive: true }, (redirectUrl) => {
      const runtimeError = chrome.runtime.lastError;
      if (runtimeError) {
        reject(new Error(runtimeError.message || 'OCI sign-in was cancelled.'));
        return;
      }
      if (!redirectUrl) {
        reject(new Error('OCI did not return a sign-in response.'));
        return;
      }
      resolve(redirectUrl);
    });
  });
}

export async function signInWithOci(signUp: boolean, email?: string) {
  const metadataUrl = import.meta.env.VITE_OCI_METADATA_URL?.trim();
  const clientId = import.meta.env.VITE_OCI_CLIENT_ID?.trim();
  const apiScope = import.meta.env.VITE_OCI_API_SCOPE?.trim();
  const apiUrl = import.meta.env.VITE_API_URL?.trim();
  if (!metadataUrl || !clientId || !apiScope || !apiUrl) {
    throw new Error(
      'OCI extension sign-in requires VITE_OCI_METADATA_URL, VITE_OCI_CLIENT_ID, VITE_OCI_API_SCOPE, and VITE_API_URL.',
    );
  }

  const discoveryUrl = new URL(metadataUrl);
  const apiBase = new URL(`${apiUrl.replace(/\/+$/, '')}/`);
  if (discoveryUrl.protocol !== 'https:') {
    throw new Error('OCI OpenID discovery must use HTTPS.');
  }
  if (
    (apiBase.protocol !== 'https:' && apiBase.hostname !== 'localhost') ||
    apiBase.username ||
    apiBase.password ||
    apiBase.search ||
    apiBase.hash
  ) {
    throw new Error('The API URL for OCI signing-key retrieval is invalid.');
  }
  const jwksProxyUrl = new URL('auth/oci/jwks', apiBase);
  const metadataResponse = await fetch(discoveryUrl);
  if (!metadataResponse.ok) {
    throw new Error(`OCI OpenID discovery failed (${metadataResponse.status}).`);
  }
  const metadataPayload: unknown = await metadataResponse.json();
  if (!metadataPayload || typeof metadataPayload !== 'object') {
    throw new Error('OCI returned invalid OpenID discovery metadata.');
  }
  const metadataValues = metadataPayload as Record<string, unknown>;
  const {
    issuer,
    authorization_endpoint: authorizationEndpoint,
    token_endpoint: tokenEndpoint,
    userinfo_endpoint: userinfoEndpoint,
    jwks_uri: jwksUri,
  } = metadataValues;
  if (
    issuer !== 'https://identity.oraclecloud.com/' ||
    typeof authorizationEndpoint !== 'string' ||
    typeof tokenEndpoint !== 'string' ||
    typeof userinfoEndpoint !== 'string' ||
    typeof jwksUri !== 'string'
  ) {
    throw new Error('OCI returned invalid OpenID discovery metadata.');
  }
  const metadata: OciMetadata = {
    issuer,
    authorization_endpoint: authorizationEndpoint,
    token_endpoint: tokenEndpoint,
    userinfo_endpoint: userinfoEndpoint,
    jwks_uri: jwksUri,
  };

  const endpoints = [
    metadata.authorization_endpoint,
    metadata.token_endpoint,
    metadata.userinfo_endpoint,
    metadata.jwks_uri,
  ].map((value) => new URL(value));
  if (
    endpoints.some(
      (endpoint) => endpoint.protocol !== 'https:' || endpoint.origin !== discoveryUrl.origin,
    )
  ) {
    throw new Error('OCI OpenID endpoints must use the discovery host over HTTPS.');
  }

  const redirectUri = chrome.identity.getRedirectURL();
  const state = randomValue(32);
  const nonce = randomValue(32);
  const verifier = randomValue(64);
  const challenge = await createCodeChallenge(verifier);
  const authorizeUrl = new URL(metadata.authorization_endpoint);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: `openid profile email ${apiScope}`,
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...(signUp ? {} : { prompt: 'login' }),
    ...(email ? { login_hint: email } : {}),
  }).toString();

  const callbackUrl = new URL(await launchAuthFlow(authorizeUrl.toString()));
  if (`${callbackUrl.origin}${callbackUrl.pathname}` !== redirectUri) {
    throw new Error('OCI returned an unexpected sign-in URL.');
  }
  if (callbackUrl.searchParams.get('state') !== state) {
    throw new Error('OCI sign-in state validation failed.');
  }
  const authError = callbackUrl.searchParams.get('error_description') || callbackUrl.searchParams.get('error');
  if (authError) throw new Error(authError);
  const code = callbackUrl.searchParams.get('code');
  if (!code) throw new Error('OCI did not return an authorization code.');

  const tokenResponse = await fetch(metadata.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: clientId,
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenResponse.ok) {
    throw new Error(`OCI token exchange failed (${tokenResponse.status}).`);
  }

  const tokenPayload: unknown = await tokenResponse.json();
  if (!tokenPayload || typeof tokenPayload !== 'object') {
    throw new Error('OCI returned an invalid access token response.');
  }
  const tokenValues = tokenPayload as Record<string, unknown>;
  const accessToken = tokenValues.access_token;
  const idToken = tokenValues.id_token;
  const tokenType = tokenValues.token_type;
  const expiresIn = tokenValues.expires_in;
  if (
    typeof accessToken !== 'string' ||
    !accessToken ||
    typeof idToken !== 'string' ||
    !idToken ||
    typeof tokenType !== 'string' ||
    tokenType.toLowerCase() !== 'bearer' ||
    typeof expiresIn !== 'number' ||
    !Number.isFinite(expiresIn) ||
    expiresIn <= 0
  ) {
    throw new Error('OCI returned an invalid access token response.');
  }
  const tokens: OciTokenResponse = {
    access_token: accessToken,
    expires_in: expiresIn,
    token_type: tokenType,
    id_token: idToken,
  };

  const jwksResponse = await fetch(jwksProxyUrl);
  if (!jwksResponse.ok) {
    throw new Error(`OCI signing-key request failed (${jwksResponse.status}).`);
  }
  const jwksPayload: unknown = await jwksResponse.json();
  if (
    !jwksPayload ||
    typeof jwksPayload !== 'object' ||
    !Array.isArray((jwksPayload as Record<string, unknown>).keys)
  ) {
    throw new Error('OCI returned an invalid signing-key set.');
  }

  const { payload } = await jwtVerify(
    tokens.id_token,
    createLocalJWKSet(jwksPayload as JSONWebKeySet),
    { issuer: metadata.issuer, audience: clientId, algorithms: ['RS256'] },
  );
  if (payload.nonce !== nonce || typeof payload.sub !== 'string' || !payload.sub) {
    throw new Error('OCI sign-in nonce or subject validation failed.');
  }

  const userInfoResponse = await fetch(metadata.userinfo_endpoint, {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!userInfoResponse.ok) {
    throw new Error(`OCI user profile request failed (${userInfoResponse.status}).`);
  }
  const userInfoPayload: unknown = await userInfoResponse.json();
  if (!userInfoPayload || typeof userInfoPayload !== 'object') {
    throw new Error('OCI returned an invalid user profile.');
  }
  const userInfoValues = userInfoPayload as Record<string, unknown>;
  if (
    typeof userInfoValues.sub !== 'string' ||
    userInfoValues.sub !== payload.sub ||
    userInfoValues.email_verified !== true ||
    typeof userInfoValues.email !== 'string' ||
    !userInfoValues.email
  ) {
    throw new Error('OCI profile must include the matching subject and a verified email address.');
  }
  const user: OciUserInfo = {
    sub: userInfoValues.sub,
    email: userInfoValues.email,
    email_verified: true,
    name: typeof userInfoValues.name === 'string' ? userInfoValues.name : undefined,
    picture: typeof userInfoValues.picture === 'string' ? userInfoValues.picture : undefined,
  };

  return { ...tokens, user };
}
