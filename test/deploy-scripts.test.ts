import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { effectiveHeaders, parseHeaders } from './headers-rules';

const ROOT = join(import.meta.dirname, '..');
const HEADERS = readFileSync(join(ROOT, 'public/_headers'), 'utf8');
const run = (script: string, ...args: string[]) =>
  spawnSync('bash', [join(ROOT, 'scripts', script), ...args], { encoding: 'utf8' });

/** A dist folder holding `_headers` (or nothing), as the build leaves it. */
function dist(headers?: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'www-noindex-'));
  if (headers !== undefined) writeFileSync(join(dir, '_headers'), headers);
  return dir;
}
const headersIn = (dir: string) => readFileSync(join(dir, '_headers'), 'utf8');

describe('scripts/noindex.sh: dev answers X-Robots-Tag: noindex', () => {
  it('adds the header to every path, _astro/ included', () => {
    const dir = dist(HEADERS);
    expect(run('noindex.sh', dir).status).toBe(0);
    const { rules, invalid } = parseHeaders(headersIn(dir));
    expect(invalid).toEqual([]);
    for (const path of ['/', '/fr/', '/404.html', '/sitemap.xml', '/_astro/Base.AbCd1234.css']) {
      expect(effectiveHeaders(rules, path).get('x-robots-tag'), path).toBe('noindex');
    }
  });

  it('keeps one /* rule (Cloudflare keys rules by path) and every other header', () => {
    const dir = dist(HEADERS);
    run('noindex.sh', dir);
    const before = parseHeaders(HEADERS).rules;
    const after = parseHeaders(headersIn(dir)).rules;
    expect(after.filter((rule) => rule.path === '/*')).toHaveLength(1);
    for (const path of ['/', '/_astro/Base.AbCd1234.css']) {
      const added = new Map(effectiveHeaders(after, path));
      added.delete('x-robots-tag');
      expect(added).toEqual(effectiveHeaders(before, path));
    }
  });

  it('adds it once when run twice', () => {
    const dir = dist(HEADERS);
    run('noindex.sh', dir);
    const once = headersIn(dir);
    expect(run('noindex.sh', dir).status).toBe(0);
    expect(headersIn(dir)).toBe(once);
  });

  it('fails, naming the file, when the build left no _headers', () => {
    const result = run('noindex.sh', dist());
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('_headers');
  });

  it('fails when _headers has no /* rule to carry it', () => {
    const dir = dist('/_astro/*\n  Cache-Control: no-cache\n');
    const result = run('noindex.sh', dir);
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('/*');
    expect(headersIn(dir)).toBe('/_astro/*\n  Cache-Control: no-cache\n');
  });

  it('fails with its usage when given no folder', () => {
    const result = run('noindex.sh');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain('usage');
  });
});

describe('scripts/deploy-check.sh', () => {
  it('passes its shell test (a stub curl over a fake site)', () => {
    const result = run('deploy-check.test.sh');
    expect(result.stdout + result.stderr).toMatch(/deploy-check\.test: \d+ passed, 0 failed/);
    expect(result.status).toBe(0);
    // 62 cases of process-heavy shell: 15 s measured at a load average of 21, past vitest's 5 s default.
  }, 60_000);
});
