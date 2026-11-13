import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// scripts/container-test-log.mjs is the log check of scripts/container-test.sh
// (which needs docker): here it runs over lines shaped like the image's.

const line = (over: Record<string, unknown> = {}) =>
  JSON.stringify({
    timestamp: '2026-11-13T10:00:00+00:00',
    'event.name': 'http.request.completed',
    severity: 'INFO',
    level: 'INFO',
    'service.namespace': 'palicanon',
    'service.name': 'www',
    'service.version': 'v9.9.9',
    'service.commit': 'abc1234',
    'deployment.environment.name': 'test',
    runtime: 'server',
    'http.route': '/',
    'http.request.method': 'GET',
    'http.response.status_code': 200,
    duration_ms: 0,
    bytes: 1234,
    ...over,
  });

const good = [line(), line({ 'http.route': '/no-such-page', 'http.response.status_code': 404 })];

function run(lines: string[]): { status: number | null; stderr: string } {
  const file = join(mkdtempSync(join(tmpdir(), 'www-log-')), 'log');
  writeFileSync(file, lines.join('\n') + '\n');
  const r = spawnSync('node', ['scripts/container-test-log.mjs', file], { encoding: 'utf8' });
  return { status: r.status, stderr: r.stderr };
}

describe('container-test-log.mjs', () => {
  it('accepts the schema', () => {
    expect(run(['nginx: start', ...good])).toEqual({ status: 0, stderr: '' });
  });

  it.each([
    ['a query in the route', [line({ 'http.route': '/?token=query-secret' })], /query/],
    ['a missing key', [line({ bytes: undefined })], /keys/],
    ['a string status', [line({ 'http.response.status_code': '200' })], /not a number/],
    ['a wrong service name', [line({ 'service.name': 'api' })], /service\.name/],
    ['a logged health probe', [...good, line({ 'http.route': '/healthz' })], /health probe/],
    ['an address', [...good, '{"x":"127.0.0.1"}'], /127\.0\.0\.1/],
    ['no line at all', ['nginx: start'], /no access-log line/],
    ['a missing request line', [line()], /no-such-page/],
  ])('refuses %s', (_name, lines, message) => {
    const r = run(lines as string[]);
    expect(r.status).toBe(1);
    expect(r.stderr).toMatch(message as RegExp);
  });
});
