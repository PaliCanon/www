import { spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../..');
const fixture = join(root, 'test/fixtures/site-ok');
const made: string[] = [];

/** Runs the real `astro build` on a copy of the fixture site, changed by `edit`. */
function build(edit: (dir: string) => void = () => {}) {
  const dir = mkdtempSync(join(tmpdir(), 'www-e2e-'));
  made.push(dir);
  cpSync(fixture, join(dir, 'content'), { recursive: true });
  edit(join(dir, 'content'));
  const out = join(dir, 'dist');
  const run = spawnSync(join(root, 'node_modules/.bin/astro'), ['build', '--outDir', out], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
    env: { ...process.env, CONTENT_DIR: join(dir, 'content'), SITE_URL: 'https://example.test' },
  });
  return { run, out, text: `${run.stdout}${run.stderr}`, dir };
}

/** Every `.html` file under `dir`; none when the folder was never made. */
function htmlIn(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { recursive: true, encoding: 'utf8' }).filter((f) => f.endsWith('.html'));
}

afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

describe('a broken rule fails astro build, naming the file, the line and the rule', () => {
  it('two h1', () => {
    const { run, text, out } = build((c) => {
      const file = join(c, 'en/about.md');
      writeFileSync(file, readFileSync(file, 'utf8') + '\n# A second title\n');
    });
    expect(run.status).not.toBe(0);
    expect(htmlIn(out), 'a broken build deploys nothing').toEqual([]);
    expect(text).toMatch(/en\/about\.md:10 \[one-h1\]/);
  });

  it('raw HTML', () => {
    const { run, text, out } = build((c) => {
      const file = join(c, 'vi/legal.md');
      writeFileSync(file, readFileSync(file, 'utf8') + '\n<div>x</div>\n');
    });
    expect(run.status).not.toBe(0);
    expect(htmlIn(out), 'a broken build deploys nothing').toEqual([]);
    expect(text).toMatch(/vi\/legal\.md:\d+ \[no-html\]/);
  });

  it('a page missing in one language', () => {
    const { run, text, out } = build((c) => rmSync(join(c, 'fr/search.md')));
    expect(run.status).not.toBe(0);
    expect(htmlIn(out), 'a broken build deploys nothing').toEqual([]);
    expect(text).toMatch(/fr\/search\.md:1 \[missing-page\]/);
    expect(existsSync(join(out, 'index.html'))).toBe(false);
  });

  it('a home section whose highlight is not in its title', () => {
    const { run, text, out } = build((c) =>
      cpSync(
        join(root, 'test/fixtures/home-rules/highlight-not-in-title.md'),
        join(c, 'fr/home/teaching.md'),
      ),
    );
    expect(run.status).not.toBe(0);
    expect(htmlIn(out), 'a broken build deploys nothing').toEqual([]);
    expect(text).toMatch(/fr\/home\/teaching\.md:4 \[highlight-not-in-title\]/);
    expect(existsSync(join(out, 'index.html'))).toBe(false);
  });

  it('a # heading in a home section', () => {
    const { run, text, out } = build((c) =>
      cpSync(join(root, 'test/fixtures/home-rules/h1-in-body.md'), join(c, 'vi/home/search.md')),
    );
    expect(run.status).not.toBe(0);
    expect(htmlIn(out), 'a broken build deploys nothing').toEqual([]);
    expect(text).toMatch(/vi\/home\/search\.md:7 \[section-h1\]/);
  });

  it('a CONTENT_DIR that is not a folder', () => {
    const { run, text, out } = build((c) => rmSync(c, { recursive: true }));
    expect(run.status).not.toBe(0);
    expect(text).toMatch(/content-missing|\[content-missing\]/);
    expect(text).not.toContain('ENOENT');
    expect(htmlIn(out), 'a broken build deploys nothing').toEqual([]);
  });

  it('a description over 160 characters', () => {
    const { run, text, out } = build((c) =>
      writeFileSync(
        join(c, 'en/support.md'),
        `---\ntitle: T\ndescription: ${'a'.repeat(170)}\n---\n\n# T\n`,
      ),
    );
    expect(run.status).not.toBe(0);
    expect(htmlIn(out), 'a broken build deploys nothing').toEqual([]);
    expect(text).toMatch(/en\/support\.md:3 \[front-matter\].*160/);
  });
});

describe('a valid fixture site', () => {
  const { run, out, text } = build();
  const html = (p: string) => readFileSync(join(out, p), 'utf8');

  it('builds, and the check for "no HTML left" sees what a build writes', () => {
    expect(run.status, text).toBe(0);
    expect(htmlIn(out).length).toBeGreaterThan(30);
  });

  it('shows the four sections on each home, in order, with the map page built', () => {
    for (const home of ['index.html', 'fr/index.html', 'vi/index.html']) {
      const seen = [...html(home).matchAll(/data-home-section="([a-z]+)"/g)].map((m) => m[1]);
      expect(seen).toEqual(['teaching', 'search', 'viz', 'learn']);
    }
    expect(existsSync(join(out, 'viz/index.html'))).toBe(true);
    expect(html('index.html')).toContain('<mark>Viz</mark>');
    expect(html('index.html')).not.toContain('<mark>Learn');
  });

  it('does not generate a post in a language it is missing from, and links nothing to it', () => {
    expect(existsSync(join(out, 'blog/solo/index.html'))).toBe(true);
    expect(existsSync(join(out, 'fr/blog/solo/index.html'))).toBe(false);
    expect(html('blog/solo/index.html')).not.toContain('hreflang="fr"');
    expect(html('blog/shared/index.html')).toContain('hreflang="fr"');
    expect(html('blog/shared/index.html')).not.toContain('hreflang="vi"');
  });

  it('has a blog index in every language, with an empty state where there is no post', () => {
    expect(html('vi/blog/index.html')).toContain('Chưa có bài viết nào.');
    expect(html('fr/blog/index.html')).toContain('/fr/blog/shared/');
  });

  it('serves the default language at / and the others under their code', () => {
    expect(html('index.html')).toContain('<html lang="en"');
    expect(html('fr/index.html')).toContain('<html lang="fr"');
    expect(html('vi/index.html')).toContain('<html lang="vi"');
  });

  it('optimises a Markdown image from content/images with its size', () => {
    const post = html('blog/solo/index.html');
    const img = /<img[^>]*alt="A single pixel"[^>]*>/.exec(post)?.[0] ?? '';
    expect(img).toMatch(/src="\/_astro\/dot\.[^"]+\.webp"/);
    expect(img).toContain('width="1"');
    expect(img).toContain('height="1"');
  });

  it('writes the sitemap with the SITE_URL of the build', () => {
    const sitemap = html('sitemap.xml');
    expect(sitemap).toContain('<loc>https://example.test/</loc>');
    expect(sitemap).toContain('<loc>https://example.test/fr/about/</loc>');
    expect(sitemap).not.toContain('/fr/blog/solo/');
  });
});
