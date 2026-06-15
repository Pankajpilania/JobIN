import { defineConfig } from 'vite';
import react            from '@vitejs/plugin-react';
import { crx }          from '@crxjs/vite-plugin';
import { resolve }      from 'path';
import manifest         from './manifest.json';

export default defineConfig({
  plugins: [
    react(),
    crx({ manifest }),
  ],

  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },

  // Vite dev server is not used for extensions — the extension is loaded from dist/
  // Use `npm run dev` (vite build --watch) and then Load Unpacked from dist/
  build: {
    outDir:    'dist',
    emptyOutDir: true,
    sourcemap: process.env.NODE_ENV !== 'production',
    rollupOptions: {
      input: {
        popup:     resolve(__dirname, 'src/popup/index.html'),
        sidepanel: resolve(__dirname, 'src/sidepanel/index.html'),
        options:   resolve(__dirname, 'src/options/index.html'),
      },
    },
  },
});
