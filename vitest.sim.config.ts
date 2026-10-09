import { defineConfig } from 'vitest/config';

export default defineConfig({ test: { environment: 'node', include: ['tools/**/*.sim.ts'], testTimeout: 600000 } });
