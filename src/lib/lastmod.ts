import { execFileSync } from 'node:child_process';

/**
 * The date of the last git commit that touched `file` (UTC, `2026-10-14T09:30:00Z`, the form a sitemap takes), or
 * `null` when git does not know the file or `cwd` is not a repository. CI
 * checks out the full history (`fetch-depth: 0`): a shallow clone would date
 * every file with the clone's one commit.
 */
export function lastmod(file: string, cwd: string = process.cwd()): string | null {
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%ct', '--', file], {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
    return out === '' ? null : new Date(Number(out) * 1000).toISOString().replace('.000Z', 'Z');
  } catch {
    return null;
  }
}
