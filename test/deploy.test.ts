import { spawnSync } from 'node:child_process';
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

/**
 * Runs a step's `run:` as GitHub does (`bash -eo pipefail`), with the call of
 * `scripts/deploy-check.sh` replaced by a command that exits with `code`
 * (a stub file costs seconds on its first run); returns the step's exit code.
 */
function runStep(run: string, code: number): number {
  const script = 'scripts/deploy-check.sh';
  const stubbed = run.replaceAll(script, "bash -c 'exit $STUB_EXIT' --");
  expect(stubbed, 'the step calls the script').not.toBe(run);
  const env = { ...process.env, STUB_EXIT: String(code), GITHUB_STEP_SUMMARY: '/dev/null' };
  return spawnSync('bash', ['-eo', 'pipefail', '-c', stubbed], { env }).status ?? -1;
}

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

    it(`${env}: tests dist/ with the SITE_URL it was built with (${site})`, () => {
      const tested = job.steps[at(job, runs('npm run test:dist'))];
      expect(tested.env?.SITE_URL).toBe(build().env?.SITE_URL);
      expect(tested.env).toEqual({ SITE_URL: site });
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

describe('deploy.yml: dev is noindex, prod is not, both are checked', () => {
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
    const run = jobs.dev.steps[step].run ?? '';
    expect(run).toContain(`scripts/deploy-check.sh ${ENVS.dev.site} noindex`);
    expect(run).toContain('status=$?');
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

  it('prod checks its host, index, after the upload (task 006)', () => {
    const step = at(jobs.prod, runs('scripts/deploy-check.sh'));
    const run = jobs.prod.steps[step].run ?? '';
    expect(run).toContain(`scripts/deploy-check.sh ${ENVS.prod.site} index`);
    expect(run).not.toContain('noindex');
    expect(run).toContain('status=$?');
    expect(step).toBeGreaterThan(at(jobs.prod, uses('cloudflare/wrangler-action')));
  });

  it('prod runs its check on every tag, with no input to skip it', () => {
    const step = jobs.prod.steps[at(jobs.prod, runs('scripts/deploy-check.sh'))];
    expect(step.if).toBeUndefined();
  });

  for (const env of Object.keys(ENVS)) {
    it(`${env}'s check handles exit code 3 (Cloudflare challenge) as a warning, not a failure`, () => {
      const step = jobs[env].steps[at(jobs[env], runs('scripts/deploy-check.sh'))];
      expect(step.run).toContain('if [ "$status" = 3 ]');
      expect(step.run).toContain('::warning::deploy-check: Cloudflare challenged');
      expect(step.run).toContain('$GITHUB_STEP_SUMMARY');
      expect(step.run).toContain('exit 0');
      expect(step.run).toContain('exit "$status"');
    });

    it(`${env}'s check step exits with the script's status unless it is 3`, () => {
      const step = jobs[env].steps[at(jobs[env], runs('scripts/deploy-check.sh'))];
      const exits = [
        { script: 0, step: 0 },
        { script: 1, step: 1 },
        { script: 2, step: 2 },
        { script: 3, step: 0 },
      ];
      for (const { script, step: want } of exits) {
        expect(runStep(step.run ?? '', script), `deploy-check exits ${script}`).toBe(want);
      }
    });
  }
});
