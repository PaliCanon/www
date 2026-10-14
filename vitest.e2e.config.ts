import { defineConfig } from 'vitest/config';

// Builds small fixture sites with the real `astro build` (CONTENT_DIR): a
// broken rule must fail the build naming file, line and rule. One build at a
// time: they share Astro's content store.
export default defineConfig({
  test: { include: ['test/e2e/**/*.test.ts'], testTimeout: 180_000, fileParallelism: false },
});
