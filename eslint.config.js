import js from '@eslint/js';
import astro from 'eslint-plugin-astro';
import tseslint from 'typescript-eslint';

export default [
  { ignores: ['dist/', '.astro/', 'coverage/', 'node_modules/', 'content/', 'test/fixtures/'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astro.configs.recommended,
  {
    files: ['**/*.{js,mjs}'],
    languageOptions: { globals: { URL: 'readonly', process: 'readonly' } },
  },
  {
    // The quality bar of every repository: functions stay under 50 lines.
    files: ['**/*.{ts,js,mjs,astro}'],
    rules: {
      'max-lines-per-function': ['error', { max: 50, skipBlankLines: true, skipComments: true }],
    },
  },
  {
    // A test's describe block groups many short tests: the bar is per test.
    files: ['**/*.test.ts'],
    rules: { 'max-lines-per-function': 'off' },
  },
];
