import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { crx } from '@crxjs/vite-plugin';
import { resolve } from 'path';
import manifest from './manifest.json';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const auth0Enabled = env.VITE_AUTH_PROVIDER === 'auth0';
  const ociEnabled = env.VITE_AUTH_PROVIDER === 'oci';
  const auth0Domain = env.VITE_AUTH0_DOMAIN?.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
  const ociMetadataUrl = env.VITE_OCI_METADATA_URL?.trim();
  if (auth0Enabled && !auth0Domain) {
    throw new Error('VITE_AUTH0_DOMAIN is required when VITE_AUTH_PROVIDER=auth0.');
  }
  if (ociEnabled && !ociMetadataUrl) {
    throw new Error('VITE_OCI_METADATA_URL is required when VITE_AUTH_PROVIDER=oci.');
  }
  const ociHostPermission = ociMetadataUrl ? `${new URL(ociMetadataUrl).origin}/*` : undefined;

  const apiHostPermission = env.VITE_API_URL
    ? `${new URL(env.VITE_API_URL).origin}/*`
    : undefined;
  const extensionManifest = {
    ...manifest,
    permissions: [
      ...manifest.permissions,
      ...((auth0Enabled || ociEnabled) && !manifest.permissions.includes('identity')
        ? ['identity']
        : []),
    ],
    host_permissions: [
      ...manifest.host_permissions,
      ...(auth0Enabled && auth0Domain ? [`https://${auth0Domain}/*`] : []),
      ...(ociEnabled && ociHostPermission ? [ociHostPermission] : []),
      ...(apiHostPermission && !manifest.host_permissions.includes(apiHostPermission)
        ? [apiHostPermission]
        : []),
    ],
  };

  return {
    plugins: [react(), crx({ manifest: extensionManifest })],

    resolve: {
      alias: { '@': resolve(__dirname, 'src') },
    },

    // Vite dev server is not used for extensions — the extension is loaded from dist/
    // Use `npm run dev` (vite build --watch) and then Load Unpacked from dist/
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      sourcemap: process.env.NODE_ENV !== 'production',
      rollupOptions: {
        input: {
          popup: resolve(__dirname, 'src/popup/index.html'),
          sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
          options: resolve(__dirname, 'src/options/index.html'),
        },
      },
    },
  };
});
