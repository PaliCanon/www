import { defineConfig } from 'vitest/config';

// Unit tests of src/lib (the content rules, urls, hashes), with v8 coverage.
// The tests over dist/ and the end-to-end builds have their own configs.
export default defineConfig({
  test: {
    include: ['src/lib/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts'],
      exclude: ['src/lib/**/*.test.ts'],
      reporter: ['text', 'lcov'],
      // A change does not lower coverage (quality.md).
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
  },
});
