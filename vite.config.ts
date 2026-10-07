import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 1500 },
  server: { host: true },
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
});
