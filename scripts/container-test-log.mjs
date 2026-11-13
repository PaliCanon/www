// The check of scripts/container-test.sh over the container's output: every
// access-log line is JSON in the PaliCanon schema, the health probe and the
// query, user agent and referer of the test requests are nowhere.
// Usage: node scripts/container-test-log.mjs <log file>
import { readFileSync } from 'node:fs';

const text = readFileSync(process.argv[2], 'utf8');
const lines = text.split('\n').filter((l) => l.startsWith('{'));
const errors = [];
const requests = lines
  .map((l) => JSON.parse(l))
  .filter((l) => l['event.name'] === 'http.request.completed');

const constant = {
  'service.namespace': 'palicanon',
  'service.name': 'www',
  'service.version': 'v9.9.9',
  'service.commit': 'abc1234',
  'deployment.environment.name': 'test',
  runtime: 'server',
};
const keys = [
  'timestamp',
  'event.name',
  'severity',
  'level',
  ...Object.keys(constant),
  'http.route',
  'http.request.method',
  'http.response.status_code',
  'duration_ms',
  'bytes',
].sort();

if (requests.length === 0) errors.push('no access-log line');
for (const r of requests) {
  if (JSON.stringify(Object.keys(r).sort()) !== JSON.stringify(keys))
    errors.push(`keys: ${Object.keys(r)}`);
  for (const [k, v] of Object.entries(constant)) if (r[k] !== v) errors.push(`${k}: ${r[k]}`);
  if (Number.isNaN(Date.parse(r.timestamp))) errors.push(`timestamp: ${r.timestamp}`);
  if (r.severity !== 'INFO' || r.level !== 'INFO')
    errors.push(`severity of a ${r['http.response.status_code']}`);
  for (const k of ['http.response.status_code', 'duration_ms', 'bytes'])
    if (!Number.isInteger(r[k])) errors.push(`${k} is not a number: ${r[k]}`);
  if (r['http.route'].includes('?')) errors.push(`query in the route: ${r['http.route']}`);
}
const routes = requests.map(
  (r) => `${r['http.request.method']} ${r['http.route']} ${r['http.response.status_code']}`,
);
for (const want of ['GET / 200', 'GET /no-such-page 404'])
  if (!routes.includes(want)) errors.push(`no line for "${want}"`);
if (routes.some((r) => r.includes('/healthz'))) errors.push('the health probe is logged');
for (const secret of ['query-secret', 'agent-secret', 'ref-secret', '127.0.0.1', 'token='])
  if (text.includes(secret)) errors.push(`"${secret}" is in the output`);

if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`);
  process.exit(1);
}
