import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const ROOT = join(import.meta.dirname, '..');
const text = (path: string) => readFileSync(join(ROOT, path), 'utf8');

/** wrangler.jsonc: whole-line `//` comments and trailing commas allowed. */
const jsonc = (source: string) =>
  JSON.parse(
    source
      .split('\n')
      .filter((line) => !line.trim().startsWith('//'))
      .join('\n')
      .replace(/,(\s*[}\]])/g, '$1'),
  );

interface Step {
  name?: string;
  uses?: string;
  run?: string;
  if?: string;
  with?: Record<string, unknown>;
  env?: Record<string, string>;
}
interface Job {
  if?: string;
  concurrency?: { group: string; 'cancel-in-progress': boolean };
  steps: Step[];
}

const wrangler = jsonc(text('wrangler.jsonc'));
const workflow = parse(text('.github/workflows/deploy.yml'));
const jobs: Record<string, Job> = workflow.jobs;
const ENVS = {
  dev: { site: 'https://dev.palicanon.app', worker: 'www-dev' },
  prod: { site: 'https://palicanon.app', worker: 'www-prod' },
} as const;

/** The index of the first step matching, -1 when none does. */
const at = (job: Job, match: (step: Step) => boolean) => job.steps.findIndex(match);
const runs = (command: string) => (step: Step) => (step.run ?? '').includes(command);
const uses = (action: string) => (step: Step) => (step.uses ?? '').startsWith(`${action}@`);

/**
 * A GitHub `if:` with the context given: only `==`, `!=`, `||`, `&&`,
 * strings, and the names of `ctx` (an absent name is null, as in GitHub).
 */
function evaluate(expression: string | undefined, ctx: Record<string, unknown>): boolean {
  if (expression === undefined) return true;
  const js = expression
    .replace(/^\$\{\{|\}\}$/g, '')
    .replace(/[a-z_]+\.[a-z_]+/g, (name) => JSON.stringify(ctx[name] ?? null))
    .replace(/==/g, '===')
    .replace(/!===/g, '!==');
  return Boolean(new Function(`return (${js});`)());
}

describe('wrangler.jsonc: static assets only, one Worker per env', () => {
  it('has no Worker script, only dist/ with 404.html for unknown paths', () => {
    expect(wrangler.main).toBeUndefined();
    expect(wrangler.assets).toEqual({
      directory: './dist',
      not_found_handling: '404-page',
      html_handling: 'auto-trailing-slash',
    });
  });

  it('serves no workers.dev address and no preview URL', () => {
    expect(wrangler.workers_dev).toBe(false);
    expect(wrangler.preview_urls).toBe(false);
  });

  it('names www-dev and www-prod, and declares no route (the domains are tofu’s)', () => {
    expect(Object.keys(wrangler.env).sort()).toEqual(['dev', 'prod']);
    for (const [env, { worker }] of Object.entries(ENVS)) {
      expect(wrangler.env[env].name).toBe(worker);
      expect(wrangler.env[env].routes ?? wrangler.env[env].route).toBeUndefined();
    }
    expect(wrangler.routes ?? wrangler.route).toBeUndefined();
  });
});

describe('deploy.yml: when it runs', () => {
  it('runs on a push to main, a v* tag, and by hand with a check input', () => {
    expect(workflow.on.push).toEqual({ branches: ['main'], tags: ['v*'] });
    expect(workflow.on.workflow_dispatch.inputs.check).toMatchObject({
      type: 'boolean',
      default: true,
    });
  });

  it('reads the repository only', () => {
    expect(workflow.permissions).toEqual({ contents: 'read' });
  });

  it('has a dev job and a prod job, each deploying one at a time, never cancelled', () => {
    expect(Object.keys(jobs).sort()).toEqual(['dev', 'prod']);
    for (const env of Object.keys(ENVS)) {
      expect(jobs[env].concurrency).toEqual({
        group: `deploy-${env}`,
        'cancel-in-progress': false,
      });
    }
  });

  const cases = [
    { event: 'push', ref: 'branch', dev: true, prod: false },
    { event: 'push', ref: 'tag', dev: false, prod: true },
    { event: 'workflow_dispatch', ref: 'branch', dev: true, prod: false },
    { event: 'workflow_dispatch', ref: 'tag', dev: false, prod: true },
  ];
  for (const { event, ref, dev, prod } of cases) {
    it(`a ${event} on a ${ref} deploys ${dev ? 'dev' : 'prod'} only`, () => {
      const ctx = { 'github.event_name': event, 'github.ref_type': ref };
      expect(evaluate(jobs.dev.if, ctx)).toBe(dev);
      expect(evaluate(jobs.prod.if, ctx)).toBe(prod);
    });
  }
});

describe('deploy.yml: both jobs build, test and upload', () => {
  for (const [env, { site, worker }] of Object.entries(ENVS)) {
    const job = jobs[env];
    const build = () => job.steps[at(job, runs('npm run build'))];

    it(`${env}: checks out the full history (lastmod) without keeping the credential`, () => {
      const checkout = job.steps[at(job, uses('actions/checkout'))];
      expect(checkout.with).toMatchObject({ 'fetch-depth': 0, 'persist-credentials': false });
      expect(job.steps[at(job, uses('actions/setup-node'))].with).toMatchObject({
        'node-version-file': '.nvmrc',
      });
    });

    it(`${env}: builds with SITE_URL ${site}, after npm ci`, () => {
      expect(at(job, runs('npm ci'))).toBeGreaterThanOrEqual(0);
      expect(at(job, runs('npm ci'))).toBeLessThan(at(job, runs('npm run build')));
      expect(build().env).toEqual({ SITE_URL: site });
    });

    it(`${env}: tests dist/ as built, before anything changes it`, () => {
      const tested = at(job, runs('npm run test:dist'));
      expect(tested).toBeGreaterThan(at(job, runs('npm run build')));
      expect(tested).toBeLessThan(at(job, uses('cloudflare/wrangler-action')));
      if (env === 'dev') expect(tested).toBeLessThan(at(job, runs('scripts/noindex.sh')));
    });

    it(`${env}: uploads to ${worker} with the two repository secrets and a pinned wrangler`, () => {
      const step = job.steps[at(job, uses('cloudflare/wrangler-action'))];
      expect(step.with).toEqual({
        apiToken: '${{ secrets.CLOUDFLARE_API_TOKEN }}',
        accountId: '${{ secrets.CLOUDFLARE_ACCOUNT_ID }}',
        wranglerVersion: expect.stringMatching(/^\d+\.\d+\.\d+$/),
        command: `deploy --env ${env}`,
      });
      expect(wrangler.env[env].name).toBe(worker);
    });
  }

  it('pins every action to a release tag', () => {
    for (const job of Object.values(jobs)) {
      for (const step of job.steps.filter((s) => s.uses))
        expect(step.uses).toMatch(/@v\d+(\.\d+){0,2}$/);
    }
  });

  it('uses one wrangler version in both jobs', () => {
    const versions = Object.values(jobs).map(
      (job) => job.steps[at(job, uses('cloudflare/wrangler-action'))].with?.wranglerVersion,
    );
    expect(new Set(versions).size).toBe(1);
  });
});

describe('deploy.yml: dev is noindex and checked, prod is neither (yet)', () => {
  it('dev adds noindex to dist/_headers between the build and the upload', () => {
    const step = at(jobs.dev, runs('scripts/noindex.sh dist'));
    expect(step).toBeGreaterThan(at(jobs.dev, runs('npm run build')));
    expect(step).toBeLessThan(at(jobs.dev, uses('cloudflare/wrangler-action')));
  });

  it('prod deploys _headers as written: no noindex', () => {
    expect(at(jobs.prod, runs('noindex'))).toBe(-1);
  });

  it('dev checks the host it was built for, noindex, after the upload', () => {
    const step = at(jobs.dev, runs('scripts/deploy-check.sh'));
    expect(jobs.dev.steps[step].run?.trim()).toBe(
      `scripts/deploy-check.sh ${ENVS.dev.site} noindex`,
    );
    expect(step).toBeGreaterThan(at(jobs.dev, uses('cloudflare/wrangler-action')));
  });

  const checkCases = [
    { event: 'push', check: undefined, runs: true },
    { event: 'workflow_dispatch', check: true, runs: true },
    { event: 'workflow_dispatch', check: false, runs: false },
  ];
  for (const { event, check, runs: expected } of checkCases) {
    it(`dev's check ${expected ? 'runs' : 'is skipped'} on a ${event}${check === undefined ? '' : ` with check: ${check}`}`, () => {
      const step = jobs.dev.steps[at(jobs.dev, runs('scripts/deploy-check.sh'))];
      expect(evaluate(step.if, { 'github.event_name': event, 'inputs.check': check })).toBe(
        expected,
      );
    });
  }

  it('prod runs no host check until it has a host (task 006)', () => {
    expect(at(jobs.prod, runs('deploy-check'))).toBe(-1);
  });
});
