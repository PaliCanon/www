import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { effectiveHeaders, parseHeaders } from '../headers-rules';
import { siteUrl } from '../../src/lib/url';
import { DIST, htmlFiles, read } from './helpers';

// P2, task 006: www-prod has no preview URL, so what prod will serve is
// tested on the build. The expected host is the one the build was asked for:
// `SITE_URL`, else Astro's default (src/lib/url.ts). The first test asserts
// that the home's canonical is on it, so a build made for another host fails
// by name; the form follows the expectation: `SITE_URL=https://palicanon.app`
// is indexable and on palicanon.app; any other build (the dev form) is
// noindex once scripts/noindex.sh has run on its copy of dist/_headers.
const PROD_ORIGIN = 'https://palicanon.app';
const headOf = (file: string) => /<head>([\s\S]*?)<\/head>/.exec(read(file))?.[1] ?? '';
const canonical = (file: string) => /<link rel="canonical" href="([^"]+)"/.exec(headOf(file))?.[1] ?? '';
const expected = siteUrl();
const built = canonical('index.html');
const origin = expected;
const prod = expected === PROD_ORIGIN;
const pages = htmlFiles().filter((file) => file !== '404.html');
const PATHS = ['/', '/fr/', '/vi/about/', '/404.html', '/sitemap.xml', '/robots.txt', '/_astro/x.css'];

describe(`the ${prod ? 'prod' : 'dev'} build (${origin})`, () => {
  it('is built for the origin SITE_URL names: the home canonical is on it', () => {
    const builtOrigin = built ? new URL(built).origin : '(none: the home has no canonical)';
    expect(builtOrigin, `the build's canonical is ${builtOrigin}, SITE_URL says ${expected}`).toBe(expected);
  });

  it('is built for one origin: every canonical, hreflang and og:url is on it', () => {
    for (const file of pages) {
      const head = headOf(file);
      expect(canonical(file).startsWith(`${origin}/`), `${file}: canonical`).toBe(true);
      const hrefs = [...head.matchAll(/<link rel="alternate" hreflang="[^"]+" href="([^"]+)"/g)].map((m) => m[1]);
      expect(hrefs.length, `${file}: hreflang`).toBeGreaterThan(0);
      for (const href of hrefs) expect(href.startsWith(`${origin}/`), `${file}: ${href}`).toBe(true);
    }
  });

  it('names the sitemap of its origin in robots.txt, and every sitemap URL is on it', () => {
    expect(read('robots.txt')).toContain(`Sitemap: ${origin}/sitemap.xml`);
    const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
    expect(locs.length).toBeGreaterThan(0);
    for (const loc of locs) expect(loc.startsWith(`${origin}/`), loc).toBe(true);
  });

  it('allows everyone else in robots.txt', () => {
    expect(read('robots.txt')).toMatch(/User-agent: \*\nAllow: \/\n/);
  });

  it('is built with no noindex: dist/_headers sets no X-Robots-Tag, no page says noindex', () => {
    const lines = read('_headers')
      .split('\n')
      .filter((line) => !line.trim().startsWith('#'));
    expect(lines.join('\n').toLowerCase()).not.toContain('x-robots-tag');
    const { rules } = parseHeaders(read('_headers'));
    for (const path of PATHS) expect(effectiveHeaders(rules, path).has('x-robots-tag'), path).toBe(false);
    for (const file of pages) expect(headOf(file), file).not.toMatch(/<meta name="robots"[^>]*noindex/);
  });

  if (!prod) {
    it('dev answers noindex everywhere once scripts/noindex.sh has run on its _headers', () => {
      const dir = mkdtempSync(join(tmpdir(), 'www-form-'));
      cpSync(join(DIST, '_headers'), join(dir, '_headers'));
      const script = join(import.meta.dirname, '../../scripts/noindex.sh');
      expect(spawnSync('bash', [script, dir]).status).toBe(0);
      const { rules } = parseHeaders(readFileSync(join(dir, '_headers'), 'utf8'));
      for (const path of PATHS) expect(effectiveHeaders(rules, path).get('x-robots-tag'), path).toBe('noindex');
    });
  }
});
