import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { lastmod } from './lastmod';

let repo: string;
const git = (args: string[], date = '') =>
  execFileSync('git', args, {
    cwd: repo,
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 't',
      GIT_AUTHOR_EMAIL: 't@t',
      GIT_COMMITTER_NAME: 't',
      GIT_COMMITTER_EMAIL: 't@t',
      GIT_COMMITTER_DATE: date,
    },
  });
const commit = (file: string, text: string, date: string) => {
  writeFileSync(join(repo, file), text);
  git(['add', file]);
  git(['commit', '-q', '-m', `edit ${file}`], date);
};

beforeAll(() => {
  repo = mkdtempSync(join(tmpdir(), 'www-lastmod-'));
  git(['init', '-q']);
  commit('a.md', 'one', '2026-01-02T03:04:05Z');
  commit('b.md', 'one', '2026-02-03T04:05:06Z');
  commit('a.md', 'two', '2026-03-04T05:06:07Z');
  commit('c.md', 'one', '2026-05-06T07:08:09+02:00');
});

describe('lastmod', () => {
  it('is the date of the last commit that touched the file', () => {
    expect(lastmod('a.md', repo)).toBe('2026-03-04T05:06:07Z');
    expect(lastmod('b.md', repo)).toBe('2026-02-03T04:05:06Z');
  });

  it('is in UTC whatever the committer offset was', () => {
    expect(lastmod('c.md', repo)).toBe('2026-05-06T05:08:09Z');
  });

  it('is null for a file git does not know', () => {
    writeFileSync(join(repo, 'new.md'), 'x');
    expect(lastmod('new.md', repo)).toBeNull();
    expect(lastmod('missing.md', repo)).toBeNull();
  });

  it('is null outside a git repository', () => {
    expect(lastmod('a.md', mkdtempSync(join(tmpdir(), 'www-nogit-')))).toBeNull();
  });
});
