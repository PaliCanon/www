import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/lib/languages';
import { pagePath } from '../../src/lib/url';
import { exists, read } from './helpers';

// N4, task 006, changed by task 017: palicanon.app is canonical for the old
// site's pages (acknowledgements, terms, privacy, support, legal), so no rule
// of dist/_redirects leaves the host any more. Workers static assets read
// dist/_redirects; the pages are files of dist.
const KEY = 'ea61cff5ec8386a25c60f8d2ea079010.txt';
const PAGES = ['acknowledgements', 'terms', 'privacy', 'support', 'legal'];

interface Rule {
  from: string;
  to: string;
  status: string;
}
const rules: Rule[] = exists('_redirects')
  ? read('_redirects')
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line !== '' && !line.startsWith('#'))
      .map((line) => {
        const [from, to, status] = line.split(/\s+/);
        return { from, to, status };
      })
  : [];

describe('dist/_redirects: no old URL leaves the host', () => {
  it('has no rule that sends a path to another host', () => {
    expect(rules.filter((rule) => /^https?:\/\//.test(rule.to))).toEqual([]);
  });

  it('has no rule at all for the pages the site serves, in any language', () => {
    for (const lang of LANGS) {
      for (const key of PAGES) {
        const path = pagePath(lang, key);
        const bare = path.slice(0, -1);
        expect(
          rules.filter((rule) => rule.from === path || rule.from === bare),
          path,
        ).toEqual([]);
      }
    }
  });

  it('never mentions the search host', () => {
    expect(exists('_redirects') ? read('_redirects') : '').not.toContain('search.palicanon.app');
  });
});

describe('the old pages are pages of dist, in every language', () => {
  for (const lang of LANGS) {
    for (const key of PAGES) {
      const path = pagePath(lang, key);
      it(`${path} is served as dist${path}index.html`, () => {
        expect(exists(`${path.slice(1)}index.html`)).toBe(true);
      });
    }
  }
});

describe('the IndexNow key of the old site', () => {
  it('is in dist with its content, unchanged', () => {
    expect(exists(KEY)).toBe(true);
    const source = readFileSync(join(import.meta.dirname, '../../public', KEY), 'utf8');
    expect(read(KEY)).toBe(source);
    expect(read(KEY).trim()).toBe(KEY.replace('.txt', ''));
  });

  // deploy-check.sh compares the served key with this file: the file itself is pinned.
  it('is exactly the 32 hex bytes of its name in public/, no trailing newline', () => {
    const bytes = readFileSync(join(import.meta.dirname, '../../public', KEY));
    expect(bytes.length).toBe(32);
    expect(bytes.toString('latin1')).toMatch(/^[0-9a-f]{32}$/);
    expect(bytes.toString('latin1')).toBe(KEY.replace('.txt', ''));
  });
});
