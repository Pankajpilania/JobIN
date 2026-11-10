import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [{ find: /^(\.{1,2}\/.*)\.js$/, replacement: '$1' }],
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./src/jest.setup.mjs'],
    coverage: {
      include: ['src/**/*.{ts,js}'],
      reportsDirectory: '../coverage',
    },
  },
});
