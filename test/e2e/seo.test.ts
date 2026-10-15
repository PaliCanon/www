import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const root = join(import.meta.dirname, '../..');
const made: string[] = [];

/** The real `astro build` of the fixture site, whose posts exist in one or two languages only. */
function build() {
  const dir = mkdtempSync(join(tmpdir(), 'www-e2e-seo-'));
  made.push(dir);
  cpSync(join(root, 'test/fixtures/site-ok'), join(dir, 'content'), { recursive: true });
  // The edge case on top: a post in French alone.
  cpSync(join(root, 'test/fixtures/seo-edge'), join(dir, 'content'), { recursive: true });
  const out = join(dir, 'dist');
  const run = spawnSync(join(root, 'node_modules/.bin/astro'), ['build', '--outDir', out], {
    cwd: root,
    encoding: 'utf8',
    timeout: 120_000,
    env: { ...process.env, CONTENT_DIR: join(dir, 'content'), SITE_URL: 'https://example.test' },
  });
  return { run, out };
}

type Node = { '@type': string; image: string } & Record<string, unknown>;

/** Every JSON-LD node of a page, whatever its place. */
function nodesOf(page: string): Node[] {
  return [
    ...page.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ].map((m) => JSON.parse(m[1]) as Node);
}

/** The one BlogPosting node of a page, found by its type, not by its place. */
function blogPosting(page: string): Node {
  const posts = nodesOf(page).filter((n) => n['@type'] === 'BlogPosting');
  expect(posts, 'the page carries exactly one BlogPosting node').toHaveLength(1);
  return posts[0];
}

afterAll(() => {
  for (const d of made) rmSync(d, { recursive: true, force: true });
});

describe('the SEO of a site whose posts are not in every language', () => {
  const { run, out } = build();
  const html = (p: string) => readFileSync(join(out, p), 'utf8');
  const alternates = (p: string) =>
    [...html(p).matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(
      (m) => `${m[1]} ${m[2]}`,
    );

  it('builds', () => {
    expect(run.status, `${run.stdout}${run.stderr}`).toBe(0);
  });

  it('a post in two languages lists those two and x-default, from each of them', () => {
    const expected = [
      'en https://example.test/blog/shared/',
      'fr https://example.test/fr/blog/shared/',
      'x-default https://example.test/blog/shared/',
    ];
    expect(alternates('blog/shared/index.html')).toEqual(expected);
    expect(alternates('fr/blog/shared/index.html')).toEqual(expected);
  });

  it('a post in one language lists itself and x-default only, and names the vi blog nowhere', () => {
    expect(alternates('blog/solo/index.html')).toEqual([
      'en https://example.test/blog/solo/',
      'x-default https://example.test/blog/solo/',
    ]);
    expect(html('blog/solo/index.html')).not.toContain('og:locale:alternate');
  });

  it('the sitemap gives the same alternates, with the SITE_URL of the build', () => {
    const entry = /<url><loc>https:\/\/example\.test\/blog\/shared\/<\/loc>[\s\S]*?<\/url>/.exec(
      html('sitemap.xml'),
    )![0];
    for (const link of [
      '<xhtml:link rel="alternate" hreflang="en" href="https://example.test/blog/shared/"/>',
      '<xhtml:link rel="alternate" hreflang="fr" href="https://example.test/fr/blog/shared/"/>',
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://example.test/blog/shared/"/>',
    ]) {
      expect(entry).toContain(link);
    }
    expect(entry).not.toContain('hreflang="vi"');
    expect(html('index.html')).toContain('<link rel="canonical" href="https://example.test/"');
  });

  it('every page has a preview image that is a file of the build', () => {
    for (const page of ['index.html', 'fr/about/index.html', 'blog/solo/index.html']) {
      const image = /property="og:image" content="https:\/\/example\.test\/([^"]+)"/.exec(
        html(page),
      )?.[1];
      expect(image, page).toBeDefined();
      expect(() => readFileSync(join(out, image!))).not.toThrow();
    }
  });

  it('a post in French alone lists itself only: no x-default, its own canonical', () => {
    const page = 'fr/blog/seul/index.html';
    expect(alternates(page)).toEqual(['fr https://example.test/fr/blog/seul/']);
    expect(html(page)).toContain('<link rel="canonical" href="https://example.test/fr/blog/seul/"');
    expect(html(page)).not.toContain('x-default');
    expect(html(page)).not.toContain('og:locale:alternate');
    const entry = /<url><loc>https:\/\/example\.test\/fr\/blog\/seul\/<\/loc>[\s\S]*?<\/url>/.exec(
      html('sitemap.xml'),
    )![0];
    expect(entry).toContain(
      '<xhtml:link rel="alternate" hreflang="fr" href="https://example.test/fr/blog/seul/"/>',
    );
    expect(entry).not.toContain('x-default');
    expect(entry).not.toContain('hreflang="en"');
  });

  it('each home carries Organization and WebSite, once each', () => {
    for (const home of ['index.html', 'fr/index.html', 'vi/index.html']) {
      expect(
        nodesOf(html(home)).map((n) => n['@type']),
        home,
      ).toEqual(['Organization', 'WebSite']);
    }
  });

  it('the Tipitaka page carries one MobileApplication, with no rating and no search action', () => {
    for (const page of [
      'tipitaka/index.html',
      'fr/tipitaka/index.html',
      'vi/tipitaka/index.html',
    ]) {
      const nodes = nodesOf(html(page));
      expect(
        nodes.map((n) => n['@type']),
        page,
      ).toEqual(['MobileApplication']);
      expect(Object.keys(nodes[0])).not.toContain('aggregateRating');
      expect(Object.keys(nodes[0])).not.toContain('potentialAction');
    }
  });

  it('a post page carries no other node than its BlogPosting', () => {
    for (const page of ['blog/shared/index.html', 'fr/blog/seul/index.html']) {
      expect(
        nodesOf(html(page)).map((n) => n['@type']),
        page,
      ).toEqual(['BlogPosting']);
    }
  });

  it('a post whose image the head cannot optimise takes the default card everywhere', () => {
    // solo.md names images/dot.png, a file of the fixture's content dir, which is not the
    // repository's content/images/: the head falls back (a file missing from the content
    // dir altogether is refused at build, content-check.test.ts).
    const page = html('blog/solo/index.html');
    const card = 'https://example.test/og/default-en.png';
    expect(page).toContain(`<meta property="og:image" content="${card}"`);
    expect(page).toContain(`<meta name="twitter:image" content="${card}"`);
    expect(blogPosting(page).image).toBe(card);
    expect(page).not.toContain('dot.png');
  });

  it('a post with no image takes the default card of its own language everywhere', () => {
    const page = html('fr/blog/seul/index.html');
    const card = 'https://example.test/og/default-fr.png';
    expect(page).toContain(`<meta property="og:image" content="${card}"`);
    expect(page).toContain(`<meta name="twitter:image" content="${card}"`);
    expect(blogPosting(page).image).toBe(card);
  });
});
