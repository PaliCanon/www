import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  headerTable,
  parseRedirects,
  renderConf,
  renderHeaders,
  renderRedirects,
} from '../scripts/nginx-conf.mjs';
import { effectiveHeaders, parseHeaders } from './headers-rules';

// scripts/nginx-conf.mjs writes the nginx config of the image from
// public/_headers and public/_redirects. The header maps must give a path
// the headers Cloudflare gives it (test/headers-rules.ts is that reading);
// the redirects are exact locations.

const headersText = readFileSync('public/_headers', 'utf8');
const redirectsText = readFileSync('public/_redirects', 'utf8');

/** What the generated maps give a path: the table, read the way nginx reads the maps. */
function served(text: string, pathname: string): Map<string, string> {
  const { patterns, headers } = headerTable(text);
  const bits = patterns.map((re: RegExp) => (re.test(pathname) ? '1' : '0')).join('');
  const out = new Map<string, string>();
  for (const { name, values } of headers) {
    const value = values.get(bits);
    if (value) out.set(name.toLowerCase(), value);
  }
  return out;
}

const synthetic = `
/*
  X-A: one
  Cache-Control: no-cache
/docs/*
  X-A: two
/_astro/*
  ! Cache-Control
  Cache-Control: immutable
/:lang/x
  ! X-A
`;

describe('headerTable: the same headers as Cloudflare', () => {
  const paths = ['/', '/fr/', '/_astro/a.js', '/docs/x', '/docs/', '/en/x', '/404.html', '/a.b+c'];
  for (const [label, text] of [
    ['public/_headers', headersText],
    ['a rule set with appends, removals and a placeholder', synthetic],
  ] as const) {
    for (const path of paths) {
      it(`${label}: ${path}`, () => {
        const want = effectiveHeaders(parseHeaders(text).rules, path);
        expect(Object.fromEntries(served(text, path))).toEqual(Object.fromEntries(want));
      });
    }
  }

  it('the real file: the long cache only under /_astro/, no other Cache-Control', () => {
    expect(served(headersText, '/_astro/a.js').get('cache-control')).toBe(
      'public, max-age=31536000, immutable',
    );
    expect(served(headersText, '/fr/').get('cache-control')).toBe('no-cache');
  });

  it('refuses a value nginx would read as a variable or a quote', () => {
    for (const bad of ['a$b', 'a"b', 'a\\b'])
      expect(() => headerTable(`/*\n  X-A: ${bad}\n`)).toThrow(/X-A/);
  });

  it('refuses more rules than the combination maps can hold', () => {
    const many = Array.from({ length: 13 }, (_, i) => `/r${i}\n  X-A: ${i}\n`).join('');
    expect(() => headerTable(many)).toThrow(/rules/);
  });

  it('refuses a header line before any path', () => {
    expect(() => headerTable('X-A: 1\n')).toThrow(/X-A: 1/);
  });
});

describe('renderHeaders: nginx directives', () => {
  const { maps, adds } = renderHeaders(headersText);

  it('maps whether each rule matches, then each header over the combination', () => {
    expect(maps).toContain('map $uri $www_rule0 {');
    expect(maps).toContain('map "$www_rule0$www_rule1" $www_header0 {');
    expect(maps).toContain('"~^/_astro/.*$"');
  });

  it('adds every header on every status (the 404 page and the redirects too)', () => {
    expect(adds).toContain('add_header X-Frame-Options $www_header0 always;');
    expect(adds).toContain('add_header Cache-Control $www_header5 always;');
  });

  it('takes every value from the file', () => {
    expect(maps).toContain('"11" "public, max-age=31536000, immutable"');
    expect(maps).toContain('"camera=(), microphone=(), geolocation=()"');
  });
});

describe('redirects', () => {
  it('parses the six lines of public/_redirects, both slash forms', () => {
    const redirects = parseRedirects(redirectsText);
    expect(redirects).toHaveLength(6);
    expect(redirects.map((r: { from: string }) => r.from)).toContain('/terms');
    expect(redirects.map((r: { from: string }) => r.from)).toContain('/terms/');
    expect(redirects.every((r: { status: number }) => r.status === 301)).toBe(true);
  });

  it('writes each as an exact location, answered before any file', () => {
    const conf = renderRedirects(redirectsText);
    for (const slug of ['acknowledgements', 'terms', 'privacy']) {
      for (const from of [`/${slug}`, `/${slug}/`]) {
        expect(conf).toContain(
          `location = ${from} {\n    return 301 https://search.palicanon.app/${slug};\n  }`,
        );
      }
    }
  });

  it('defaults to 302 like Cloudflare, skips comments and blank lines', () => {
    expect(parseRedirects('# c\n\n/a /b\n')).toEqual([{ from: '/a', to: '/b', status: 302 }]);
  });

  it('writes a splat as a regex location', () => {
    const conf = renderRedirects('/old/* https://x.test/new/:splat 308\n');
    expect(conf).toContain('location ~ "^/old/(?<www_splat>.*)$" {');
    expect(conf).toContain('return 308 https://x.test/new/$www_splat;');
  });

  it('refuses what it does not translate', () => {
    expect(() => parseRedirects('/a\n')).toThrow(/\/a/);
    expect(() => parseRedirects('/a /b 200\n')).toThrow(/200/);
    expect(() => parseRedirects('/a/:id /b/:id 301\n')).toThrow(/:id/);
    expect(() => parseRedirects('/a /b$c 301\n')).toThrow(/\$/);
    expect(() => parseRedirects('/a /b"c 301\n')).toThrow(/"/);
    expect(() => parseRedirects('/a /b\\c 301\n')).toThrow(/\\/);
    expect(() => parseRedirects('/a;b /c 301\n')).toThrow(/;/);
    expect(() => parseRedirects('a /b 301\n')).toThrow(/a/);
  });
});

describe('renderConf', () => {
  const template = 'x\n#@MAPS@\n  #@HEADERS@\n  #@REDIRECTS@\ny\n';

  it('replaces both markers and leaves the envsubst variables alone', () => {
    const out = renderConf(`${template}\${WWW_ENV}\n`, headersText, redirectsText);
    expect(out).not.toContain('#@');
    expect(out).toContain('${WWW_ENV}');
    expect(out).toContain('location = /terms {');
    expect(out).toContain('map $uri $www_rule0 {');
    expect(out).toContain('add_header X-Frame-Options');
  });

  it("renders the image's template: every marker used once, nothing left", () => {
    const template = readFileSync('docker/www.conf.template', 'utf8');
    const out = renderConf(template, headersText, redirectsText);
    expect(out).not.toContain('#@');
    expect(out).toContain('add_header Cache-Control $www_header5 always;');
    expect(out).toContain('location = /privacy/ {');
    expect(out).toContain('"service.version":"${WWW_ENV}"');
  });

  it('refuses a template without a marker', () => {
    expect(() => renderConf('x\n', headersText, redirectsText)).toThrow(/#@HEADERS@/);
  });
});

describe('headerTable: a path nginx would read as syntax', () => {
  it('is refused', () => {
    for (const bad of ['/a$b', '/a"b', '/a;b'])
      expect(() => headerTable(`${bad}\n  X-A: 1\n`)).toThrow(/path/);
  });
});
