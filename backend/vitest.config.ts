import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['./src/vitest.setup.mjs'],
    coverage: {
      include: ['src/**/*.{ts,js}'],
      reportsDirectory: '../coverage',
    },
  },
});
