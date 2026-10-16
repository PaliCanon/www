import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { effectiveHeaders, parseHeaders } from '../headers-rules';
import { DIST, read } from './helpers';

const SOURCE = readFileSync(join(import.meta.dirname, '../../public/_headers'), 'utf8');
const { rules, invalid } = parseHeaders(read('_headers'));
const headersOf = (path: string) => effectiveHeaders(rules, path);
const astroFiles = readdirSync(join(DIST, '_astro'));

const SECURITY: Record<string, string> = {
  'x-frame-options': 'DENY',
  'strict-transport-security': 'max-age=31536000',
  'x-content-type-options': 'nosniff',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};
const REVALIDATED = 'no-cache';
const IMMUTABLE = 'public, max-age=31536000, immutable';
const PAGES = ['/', '/fr/', '/vi/about/', '/404.html', '/sitemap.xml', '/robots.txt', '/favicon.ico'];

describe('the reading of _headers mirrors Cloudflare', () => {
  const sample = parseHeaders('/*\n  A: 1\n  B: 1\n/x/*\n  ! A\n  A: 2\n  B: 2\n').rules;

  it('appends a header a second rule sets again', () => {
    expect(effectiveHeaders(sample, '/x/y').get('b')).toBe('1, 2');
  });

  it('lets a rule remove a header before setting its own', () => {
    expect(effectiveHeaders(sample, '/x/y').get('a')).toBe('2');
    expect(effectiveHeaders(sample, '/y').get('a')).toBe('1');
  });
});

describe('dist/_headers', () => {
  it('is public/_headers as written, copied by the build', () => {
    expect(read('_headers')).toBe(SOURCE);
  });

  it('has no line Cloudflare would refuse', () => {
    expect(invalid).toEqual([]);
  });

  it('sets no Content-Security-Policy (the page meta holds it) and no X-Robots-Tag (dev adds it)', () => {
    for (const path of ['/', '/_astro/x.css']) {
      expect(headersOf(path).has('content-security-policy')).toBe(false);
      expect(headersOf(path).has('x-robots-tag')).toBe(false);
    }
  });
});

describe('every response carries the security headers', () => {
  for (const path of [...PAGES, `/_astro/${astroFiles[0]}`]) {
    it(path, () => {
      const headers = headersOf(path);
      for (const [name, value] of Object.entries(SECURITY)) expect(headers.get(name), name).toBe(value);
    });
  }
});

describe('caching: _astro/ is immutable, everything else revalidated', () => {
  for (const path of PAGES) {
    it(`${path} is revalidated`, () => {
      expect(headersOf(path).get('cache-control')).toBe(REVALIDATED);
    });
  }

  for (const file of astroFiles) {
    it(`/_astro/${file} is immutable for a year, never also no-cache`, () => {
      expect(headersOf(`/_astro/${file}`).get('cache-control')).toBe(IMMUTABLE);
    });
  }

  it('only files whose name carries a content hash are under _astro/', () => {
    expect(astroFiles.length).toBeGreaterThan(0);
    for (const file of astroFiles) expect(file).toMatch(/\.[\w-]{8,}\.\w+$/);
  });

  it('a path that only starts like _astro is revalidated', () => {
    expect(headersOf('/_astro-notes/').get('cache-control')).toBe(REVALIDATED);
  });
});
