import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

const ROOT = join(import.meta.dirname, '..');
const text = (path: string) => readFileSync(join(ROOT, path), 'utf8');

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
  permissions?: Record<string, string>;
  steps: Step[];
}

const workflow = parse(text('.github/workflows/deploy.yml'));
const jobs: Record<string, Job> = workflow.jobs;

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

describe('no dev environment, no Worker (task 015: prod is the container, task 014)', () => {
  it('has no wrangler.jsonc and no wrangler dependency or script', () => {
    expect(existsSync(join(ROOT, 'wrangler.jsonc'))).toBe(false);
    const pkg = JSON.parse(text('package.json'));
    const declared = JSON.stringify([pkg.scripts, pkg.dependencies, pkg.devDependencies]);
    expect(declared).not.toContain('wrangler');
    expect(text('package-lock.json')).not.toContain('wrangler');
  });

  it('names no dev host, no www-dev Worker and no Cloudflare secret in any workflow', () => {
    for (const file of ['deploy.yml', 'seo.yml', 'ci.yml']) {
      const source = text(`.github/workflows/${file}`);
      expect(source, file).not.toContain('dev.palicanon.app');
      expect(source, file).not.toContain('www-dev');
      expect(source, file).not.toMatch(/wrangler/i);
      expect(source, file).not.toContain('CLOUDFLARE_');
    }
  });

  it('keeps no dev-only script: scripts/noindex.sh is gone', () => {
    expect(existsSync(join(ROOT, 'scripts/noindex.sh'))).toBe(false);
  });
});

describe('deploy.yml: when it runs', () => {
  it('runs on a push to main, a v* tag, and by hand (no input)', () => {
    expect(workflow.on.push).toEqual({ branches: ['main'], tags: ['v*'] });
    expect(workflow.on).toHaveProperty('workflow_dispatch');
    expect(workflow.on.workflow_dispatch?.inputs).toBeUndefined();
  });

  it('reads the repository only', () => {
    expect(workflow.permissions).toEqual({ contents: 'read' });
  });

  it('has the image job only: no dev job, no prod job', () => {
    expect(Object.keys(jobs)).toEqual(['image']);
  });

  const cases = [
    { event: 'push', ref: 'branch', image: false },
    { event: 'push', ref: 'tag', image: true },
    { event: 'workflow_dispatch', ref: 'branch', image: false },
    { event: 'workflow_dispatch', ref: 'tag', image: true },
  ];
  for (const { event, ref, image } of cases) {
    it(`a ${event} on a ${ref} ${image ? 'builds the image' : 'does nothing'}`, () => {
      const ctx = { 'github.event_name': event, 'github.ref_type': ref };
      expect(evaluate(jobs.image.if, ctx)).toBe(image);
    });
  }

  it('uploads to no Worker: nothing calls wrangler', () => {
    for (const [name, job] of Object.entries(jobs))
      expect(at(job, uses('cloudflare/wrangler-action')), name).toBe(-1);
  });
});

describe('deploy.yml: the image job (the container of task 013)', () => {
  const image = jobs.image;
  const step = (match: (s: Step) => boolean) => image.steps[at(image, match)];
  const missing = (s: Step) => s.if === "steps.check-image.outputs.exists != 'true'";

  it('runs on a tag only, in a job that may ask for the identity token', () => {
    for (const [ref, want] of [
      ['tag', true],
      ['branch', false],
    ] as const)
      expect(evaluate(image.if, { 'github.ref_type': ref })).toBe(want);
    expect(image.permissions).toEqual({ contents: 'read', 'id-token': 'write' });
  });

  it('checks out the full history (lastmod) without keeping the credential', () => {
    expect(step(uses('actions/checkout')).with).toMatchObject({
      'fetch-depth': 0,
      'persist-credentials': false,
    });
  });

  it('authenticates with the workload identity of the repository variables', () => {
    expect(step(uses('google-github-actions/auth')).with).toEqual({
      workload_identity_provider: '${{ vars.WIF_PROVIDER }}',
      service_account: '${{ vars.DEPLOYER_SA }}',
    });
  });

  it('tags europe-west1-docker.pkg.dev/<project>/palicanon/www with a hash of the inputs', () => {
    const run = step(runs('git ls-files -s')).run ?? '';
    expect(run).toContain('palicanon/www"');
    expect(run).toContain('${{ vars.GCP_PROJECT }}');
    expect(run).toContain(':h-$HASH');
    expect(run).not.toMatch(/github\.(sha|ref)/);
  });

  it('builds and pushes only when the tag is missing, with no build argument', () => {
    expect(step(runs('docker images describe')).run ?? '').toContain('exists=false');
    for (const match of [uses('docker/setup-buildx-action'), uses('docker/build-push-action')])
      expect(missing(step(match))).toBe(true);
    const build = step(uses('docker/build-push-action')).with ?? {};
    expect(build).toMatchObject({ push: true, tags: '${{ steps.vars.outputs.image_hash }}' });
    expect(build).not.toHaveProperty('build-args');
  });

  it('is the only thing a tag does: no Worker upload, the host is checked by hand', () => {
    expect(at(image, uses('cloudflare/wrangler-action'))).toBe(-1);
    expect(text('.github/workflows/deploy.yml')).toContain(
      'scripts/deploy-check.sh https://palicanon.app index',
    );
    expect(text('.github/workflows/deploy.yml')).toContain('lsh-tech');
  });
});
