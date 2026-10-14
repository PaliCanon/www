import { describe, expect, it } from 'vitest';
import { exists, htmlFiles, read } from './helpers';

/** Internal links must reach a file of dist (lychee also checks them in CI). */
describe('internal links', () => {
  for (const file of htmlFiles()) {
    it(`${file}: every internal href exists`, () => {
      const html = read(file);
      const hrefs = [...html.matchAll(/(?:href|src)="(\/[^"#?]*)/g)].map((m) => m[1]);
      for (const href of hrefs) {
        const target = href.endsWith('/') ? `${href.slice(1)}index.html` : href.slice(1);
        expect(exists(target), `${file} links to ${href}`).toBe(true);
      }
    });
  }
});
