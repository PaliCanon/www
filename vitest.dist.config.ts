import { defineConfig } from 'vitest/config';

// Tests over dist/ after `npm run build` on the real content.
export default defineConfig({ test: { include: ['test/dist/**/*.test.ts'] } });
