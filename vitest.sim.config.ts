import { defineConfig } from 'vitest/config';

// Simulaciones de balance (no forman parte de `npm test`): npm run sim
export default defineConfig({ test: { environment: 'node', include: ['tools/**/*.sim.ts'], testTimeout: 600000 } });
