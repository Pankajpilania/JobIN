import { UserManager, WebStorageStateStore } from 'oidc-client-ts';

export function createOciUserManager() {
  const metadataUrl = process.env.NEXT_PUBLIC_OCI_METADATA_URL?.trim();
  const clientId = process.env.NEXT_PUBLIC_OCI_CLIENT_ID?.trim();
  const apiScope = process.env.NEXT_PUBLIC_OCI_API_SCOPE?.trim();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (!metadataUrl || !clientId || !apiScope || !apiUrl) {
    throw new Error(
      'OCI sign-in requires NEXT_PUBLIC_OCI_METADATA_URL, NEXT_PUBLIC_OCI_CLIENT_ID, NEXT_PUBLIC_OCI_API_SCOPE, and NEXT_PUBLIC_API_URL.',
    );
  }

  const metadata = new URL(metadataUrl);
  const apiBase = new URL(`${apiUrl.replace(/\/+$/, '')}/`);
  if (metadata.protocol !== 'https:') {
    throw new Error('The OCI OpenID discovery URL must use HTTPS.');
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

  return new UserManager({
    authority: 'https://identity.oraclecloud.com/',
    metadataUrl,
    metadataSeed: { jwks_uri: jwksProxyUrl.toString() },
    client_id: clientId,
    redirect_uri: window.location.origin,
    post_logout_redirect_uri: window.location.origin,
    response_type: 'code',
    scope: `openid profile email offline_access ${apiScope}`,
    automaticSilentRenew: true,
    monitorSession: false,
    userStore: new WebStorageStateStore({ store: window.sessionStorage }),
    stateStore: new WebStorageStateStore({ store: window.sessionStorage }),
  });
}
