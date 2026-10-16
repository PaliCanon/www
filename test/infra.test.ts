import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// infra/ read as text: the shape `tofu validate` cannot check (who owns
// what, the names shared with wrangler.jsonc and deploy.yml).
const ROOT = join(import.meta.dirname, '..');
const INFRA = join(ROOT, 'infra');
const read = (file: string) =>
  existsSync(join(INFRA, file)) ? readFileSync(join(INFRA, file), 'utf8') : '';
const tf = readdirSync(INFRA)
  .filter((file) => file.endsWith('.tf'))
  .map(read)
  .join('\n');

/** The body of `<kind> "<type>" "<name>" { … }`, up to the closing brace at column 0. */
function block(kind: string, ...labels: string[]): string {
  const head = `${kind} ${labels.map((label) => `"${label}"`).join(' ')} {`;
  const start = tf.indexOf(head);
  if (start < 0) return '';
  const end = tf.indexOf('\n}', start);
  return tf.slice(start, end + 2);
}
const attr = (body: string, name: string) =>
  body.match(new RegExp(`^\\s*${name}\\s*=\\s*(.+)$`, 'm'))?.[1].trim();

const wranglerNames = (() => {
  const source = readFileSync(join(ROOT, 'wrangler.jsonc'), 'utf8');
  return [...source.matchAll(/"(dev|prod)": \{ "name": "([^"]+)" \}/g)].map((m) => [m[1], m[2]]);
})();
const devSite = parse(
  readFileSync(join(ROOT, '.github/workflows/deploy.yml'), 'utf8'),
).jobs.dev.steps.find((step: { run?: string }) => step.run === 'npm run build').env.SITE_URL;

describe('infra/versions.tf', () => {
  it('keeps its own state: the shared bucket, prefix www', () => {
    const backend = block('backend', 'gcs');
    expect(attr(backend, 'bucket')).toBe('"palicanon-app-tofu-state"');
    expect(attr(backend, 'prefix')).toBe('"www"');
  });

  it('pins the cloudflare provider ~> 4.52 and needs no other provider', () => {
    expect(tf).toMatch(/source\s*=\s*"cloudflare\/cloudflare"\s*\n\s*version\s*=\s*"~> 4\.52"/);
    expect([...tf.matchAll(/source\s*=\s*"([^"]+)"/g)].map((m) => m[1])).toEqual([
      'cloudflare/cloudflare',
    ]);
  });
});

describe('infra/cloudflare.tf: the custom domains, and the www placeholder', () => {
  it('declares no Worker script (wrangler owns www-dev and www-prod)', () => {
    expect(tf).not.toMatch(/resource\s+"cloudflare_workers_script"/);
    expect(tf).not.toMatch(/resource\s+"cloudflare_workers_route"/);
  });

  it('holds one DNS record, the www placeholder (a Workers domain creates its own)', () => {
    expect(
      [...tf.matchAll(/resource\s+"cloudflare_record"\s+"([^"]+)"/g)].map((m) => m[1]),
    ).toEqual(['www']);
  });

  it('www is a proxied AAAA 100:: with no origin behind it (the zone Redirect Rule answers, task 006)', () => {
    const www = block('resource', 'cloudflare_record', 'www');
    expect(attr(www, 'zone_id')).toMatch(/^data\.cloudflare_zone\.site\.id\b/);
    expect(attr(www, 'name')).toBe('"www"');
    expect(attr(www, 'type')).toBe('"AAAA"');
    expect(attr(www, 'content')).toBe('"100::"');
    expect(attr(www, 'proxied')).toBe('true');
    expect(attr(www, 'ttl')).toBe('1');
    expect(attr(www, 'count')).toBeUndefined();
  });

  it('outputs the www record next to the attached hosts', () => {
    expect(read('outputs.tf')).toContain('cloudflare_record.www');
  });

  it('attaches the dev host to the dev Worker of wrangler.jsonc', () => {
    const dev = block('resource', 'cloudflare_workers_domain', 'dev');
    expect(attr(dev, 'hostname')).toBe('var.dev_host');
    expect(attr(dev, 'service')).toBe(`"${Object.fromEntries(wranglerNames).dev}"`);
    expect(attr(dev, 'count')).toBeUndefined();
  });

  it('dev_host is the host the dev build is made for', () => {
    expect(attr(block('variable', 'dev_host'), 'default')).toBe(`"${new URL(devSite).host}"`);
  });

  it('attaches prod only when prod_host is set (task 006), to the prod Worker', () => {
    const prod = block('resource', 'cloudflare_workers_domain', 'prod');
    expect(attr(prod, 'count')).toBe('var.prod_host == null ? 0 : 1');
    expect(attr(prod, 'hostname')).toBe('var.prod_host');
    expect(attr(prod, 'service')).toBe(`"${Object.fromEntries(wranglerNames).prod}"`);
    expect(attr(block('variable', 'prod_host'), 'default')).toBe('null');
  });

  it('holds no secret and no token', () => {
    expect(tf).not.toMatch(/secret|api_token\s*=/i);
  });
});
