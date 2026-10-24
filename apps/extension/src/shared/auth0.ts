import { createRemoteJWKSet, jwtVerify } from 'jose';

interface Auth0Profile {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

interface Auth0TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
  id_token: string;
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
        reject(new Error(runtimeError.message || 'Auth0 sign-in was cancelled.'));
        return;
      }
      if (!redirectUrl) {
        reject(new Error('Auth0 did not return a sign-in response.'));
        return;
      }
      resolve(redirectUrl);
    });
  });
}

export async function signInWithAuth0(signUp: boolean, email?: string) {
  const domain = import.meta.env.VITE_AUTH0_DOMAIN?.trim();
  const clientId = import.meta.env.VITE_AUTH0_CLIENT_ID?.trim();
  const audience = import.meta.env.VITE_AUTH0_AUDIENCE?.trim();
  if (!domain || !clientId || !audience) {
    throw new Error(
      'Auth0 extension sign-in requires VITE_AUTH0_DOMAIN, VITE_AUTH0_CLIENT_ID, and VITE_AUTH0_AUDIENCE.',
    );
  }

  const issuer = `https://${domain.replace(/^https?:\/\//i, '').replace(/\/+$/, '')}/`;
  const issuerUrl = issuer.slice(0, -1);
  const redirectUri = chrome.identity.getRedirectURL();
  const state = randomValue(32);
  const nonce = randomValue(32);
  const verifier = randomValue(64);
  const challenge = await createCodeChallenge(verifier);
  const authorizeUrl = new URL(`${issuerUrl}/authorize`);
  authorizeUrl.search = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: redirectUri,
    audience,
    scope: 'openid profile email',
    state,
    nonce,
    code_challenge: challenge,
    code_challenge_method: 'S256',
    ...(signUp ? { screen_hint: 'signup' } : {}),
    ...(email ? { login_hint: email } : {}),
  }).toString();

  const callbackUrl = new URL(await launchAuthFlow(authorizeUrl.toString()));
  if (callbackUrl.searchParams.get('state') !== state) {
    throw new Error('Auth0 sign-in state validation failed.');
  }
  const authError = callbackUrl.searchParams.get('error_description') || callbackUrl.searchParams.get('error');
  if (authError) throw new Error(authError);
  const code = callbackUrl.searchParams.get('code');
  if (!code) throw new Error('Auth0 did not return an authorization code.');

  const tokenResponse = await fetch(`${issuerUrl}/oauth/token`, {
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
    throw new Error(`Auth0 token exchange failed (${tokenResponse.status}).`);
  }

  const tokens = (await tokenResponse.json()) as Auth0TokenResponse;
  if (!tokens.access_token || !tokens.id_token || !Number.isFinite(tokens.expires_in)) {
    throw new Error('Auth0 returned an invalid access token response.');
  }

  const { payload } = await jwtVerify(
    tokens.id_token,
    createRemoteJWKSet(new URL('.well-known/jwks.json', issuer)),
    { issuer, audience: clientId, algorithms: ['RS256'] },
  );
  if (payload.nonce !== nonce) throw new Error('Auth0 sign-in nonce validation failed.');
  if (payload.email_verified !== true) {
    throw new Error('Verify your email with Auth0 before using the extension.');
  }
  const user: Auth0Profile = {
    sub: payload.sub ?? '',
    email: typeof payload.email === 'string' ? payload.email : undefined,
    name: typeof payload.name === 'string' ? payload.name : undefined,
    picture: typeof payload.picture === 'string' ? payload.picture : undefined,
  };
  if (!user.sub) throw new Error('Auth0 profile is missing a subject identifier.');

  return { ...tokens, user };
}
