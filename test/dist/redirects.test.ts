import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { exists, read } from './helpers';

// N4, task 006: the old site's URLs that now live on the search. Workers
// static assets read dist/_redirects; the showcase serves /support/ and
// /legal/ itself, so no rule sends them away. Design v4's N4 wording:
// "/support and /legal keep html_handling's 307 to their slash form
// (same-host normalisation, like every page); N4's 301 rule is for paths that
// leave the host".
const SEARCH = 'https://search.palicanon.app';
const PATHS = ['acknowledgements', 'terms', 'privacy'];
const KEY = 'ea61cff5ec8386a25c60f8d2ea079010.txt';

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

describe('dist/_redirects: the old URLs go to the search', () => {
  it('holds exactly one 301 per old URL and slash form, and nothing else', () => {
    const expected = PATHS.flatMap((path) => [
      { from: `/${path}`, to: `${SEARCH}/${path}`, status: '301' },
      { from: `/${path}/`, to: `${SEARCH}/${path}`, status: '301' },
    ]);
    expect(rules).toEqual(expected);
  });

  it('every target is an absolute https URL', () => {
    expect(rules.length).toBeGreaterThan(0);
    for (const { to } of rules) expect(to).toMatch(/^https:\/\/[^/]+\//);
  });

  it('no rule that leaves the host for a path the site serves', () => {
    const leavesTheHost = (rule: Rule) => /^https?:\/\//.test(rule.to);
    for (const served of ['/', '/support', '/support/', '/legal', '/legal/']) {
      expect(
        rules.filter((rule) => rule.from === served && leavesTheHost(rule)),
        served,
      ).toEqual([]);
    }
    for (const lang of ['fr', 'vi']) {
      expect(rules.filter((rule) => rule.from.startsWith(`/${lang}`) && leavesTheHost(rule))).toEqual([]);
    }
  });
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
