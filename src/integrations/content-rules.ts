import { fileURLToPath } from 'node:url';
import type { AstroIntegration } from 'astro';
import { assertContent } from '../lib/content-check';
import { contentDir } from '../lib/content-dir';

/**
 * Runs the content rules (`src/lib/content-check.ts`) as the build starts,
 * before any route is generated: a broken rule fails `astro build`, `dev`,
 * `check` and `sync` with the file, the line and the rule of each one.
 */
export function contentRules(): AstroIntegration {
  return {
    name: 'content-rules',
    hooks: {
      'astro:config:setup': ({ config }) => {
        const dir = contentDir();
        assertContent(fileURLToPath(new URL(`${dir}/`, config.root)), dir.replace(/^\.\//, ''));
      },
    },
  };
}
