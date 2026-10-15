import { statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/lib/languages';
import { ALLOWED_BOTS, DISALLOWED_BOTS } from '../../src/lib/seo/robots';
import { DIST, exists, htmlFiles, read } from './helpers';

/** The path a built file is served at: `about/index.html` is `/about/`. */
const pathOf = (file: string) => `/${file.replace(/index\.html$/, '')}`;
const files = htmlFiles().filter((file) => file !== '404.html');
const origin = /Sitemap: (https?:\/\/[^/]+)\/sitemap\.xml/.exec(read('robots.txt'))?.[1] ?? '';
const headOf = (file: string) => /<head>([\s\S]*?)<\/head>/.exec(read(file))?.[1] ?? '';
const unescape = (text: string) =>
  text.replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');
const metas = (head: string, attr: 'property' | 'name') =>
  [...head.matchAll(new RegExp(`<meta ${attr}="([^"]+)" content="([^"]*)"`, 'g'))].map(
    (m) => [m[1], unescape(m[2])] as const,
  );
const one = (head: string, attr: 'property' | 'name', key: string) => {
  const found = metas(head, attr).filter(([k]) => k === key);
  expect(found, `${key} appears once`).toHaveLength(1);
  return found[0][1];
};
const alternatesOf = (head: string) =>
  [...head.matchAll(/<link rel="alternate" hreflang="([^"]+)" href="([^"]+)"/g)].map(
    (m) => `${m[1]} ${m[2]}`,
  );
const jsonLd = (file: string) =>
  [...read(file).matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => JSON.parse(m[1]) as Record<string, unknown>,
  );
const langOf = (path: string) => LANGS.find((l) => l !== 'en' && path.startsWith(`/${l}/`)) ?? 'en';
/** The translation key of a path: `/fr/blog/welcome/` is `blog/welcome`, `/fr/` is `index`. */
const keyOf = (path: string) => {
  const rest = langOf(path) === 'en' ? path : path.slice(langOf(path).length + 1);
  return rest === '/' ? 'index' : rest.slice(1, -1);
};

describe('canonical', () => {
  it('has an origin from robots.txt', () => {
    expect(origin).toMatch(/^https?:\/\//);
  });

  for (const file of files) {
    it(`${file}: one canonical, equal to its own url`, () => {
      const canon = [...headOf(file).matchAll(/<link rel="canonical" href="([^"]+)"/g)];
      expect(canon).toHaveLength(1);
      expect(canon[0][1]).toBe(`${origin}${pathOf(file)}`);
    });
  }
});

describe('hreflang', () => {
  const byPath = new Map(files.map((file) => [pathOf(file), alternatesOf(headOf(file))]));

  for (const file of files) {
    const path = pathOf(file);
    it(`${file}: lists exactly the translations that exist, x-default = English`, () => {
      const key = keyOf(path);
      const existing = LANGS.filter((l) =>
        byPath.has(l === 'en' ? (key === 'index' ? '/' : `/${key}/`) : key === 'index' ? `/${l}/` : `/${l}/${key}/`),
      );
      const expected = existing.map(
        (l) => `${l} ${origin}${l === 'en' ? '' : `/${l}`}${key === 'index' ? '/' : `/${key}/`}`,
      );
      if (existing.includes('en')) expected.push(`x-default ${origin}${key === 'index' ? '/' : `/${key}/`}`);
      expect(byPath.get(path)).toEqual(expected);
    });

    it(`${file}: every alternate is a built page that lists the same set (reciprocity)`, () => {
      const mine = byPath.get(path)!;
      expect(mine.some((a) => a.endsWith(` ${origin}${path}`))).toBe(true);
      for (const alt of mine) {
        const target = new URL(alt.split(' ')[1]).pathname;
        expect(byPath.has(target), `${path} points at ${target}, which is not built`).toBe(true);
        expect(byPath.get(target)).toEqual(mine);
      }
    });
  }
});

describe('the sitemap', () => {
  const xml = read('sitemap.xml');
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);

  it('declares the xhtml namespace', () => {
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
  });

  for (const entry of entries) {
    const loc = /<loc>([^<]*)<\/loc>/.exec(entry)![1];
    it(`${loc}: a lastmod, and the alternates of the page's own head`, () => {
      expect(entry).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z<\/lastmod>/);
      const links = [
        ...entry.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g),
      ].map((m) => `${m[1]} ${m[2]}`);
      const path = new URL(loc).pathname;
      expect(links).toEqual(alternatesOf(headOf(`${path.slice(1)}index.html`)));
    });
  }
});

describe('robots.txt', () => {
  const text = read('robots.txt');
  const agents = (rule: string) => {
    const found: string[] = [];
    let current: string[] = [];
    let collecting = false;
    for (const line of text.split('\n').map((l) => l.trim())) {
      const agent = /^User-agent:\s*(.+)$/i.exec(line);
      if (agent) {
        if (!collecting) current = [];
        current.push(agent[1]);
        collecting = true;
      } else if (line !== '' && !line.startsWith('#')) {
        if (collecting && line === rule) found.push(...current.filter((a) => a !== '*'));
        collecting = false;
      }
    }
    return found;
  };

  it('allows exactly the search and answer bots', () => {
    expect(agents('Allow: /').sort()).toEqual([...ALLOWED_BOTS].sort());
  });

  it('disallows exactly the training bots', () => {
    expect(agents('Disallow: /').sort()).toEqual([...DISALLOWED_BOTS].sort());
  });

  it('pins the policy by name: GPTBot is refused, Googlebot is welcome', () => {
    expect(agents('Disallow: /')).toContain('GPTBot');
    expect(agents('Allow: /')).not.toContain('GPTBot');
    expect(agents('Allow: /')).toContain('Googlebot');
    expect(agents('Disallow: /')).not.toContain('Googlebot');
  });

  it('pins the Apple pair: Applebot is welcome, Applebot-Extended (training) is refused', () => {
    expect(agents('Allow: /')).toContain('Applebot');
    expect(agents('Allow: /')).not.toContain('Applebot-Extended');
    expect(agents('Disallow: /')).toContain('Applebot-Extended');
    expect(agents('Disallow: /')).not.toContain('Applebot');
  });

  it('holds nothing but the two lists and everyone else', () => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '' && !l.startsWith('#'));
    const names = lines.filter((l) => l.startsWith('User-agent:')).map((l) => l.slice(11).trim());
    expect(names.sort()).toEqual([...ALLOWED_BOTS, ...DISALLOWED_BOTS, '*'].sort());
    const rest = lines.filter((l) => !l.startsWith('User-agent:'));
    expect(rest.filter((l) => l === 'Allow: /')).toHaveLength(2);
    expect(rest.filter((l) => l === 'Disallow: /')).toHaveLength(1);
    expect(rest.filter((l) => l.startsWith('Sitemap:'))).toHaveLength(1);
    expect(rest).toHaveLength(4);
  });

  it('allows everyone else and names the sitemap', () => {
    expect(text).toMatch(/User-agent: \*\nAllow: \/\n/);
    expect(text).toContain(`Sitemap: ${origin}/sitemap.xml`);
  });
});

describe('structured data', () => {
  for (const file of files) {
    const path = pathOf(file);
    const key = keyOf(path);
    const expected =
      key === 'index'
        ? ['Organization', 'WebSite']
        : key === 'tipitaka'
          ? ['MobileApplication']
          : /^blog\/.+/.test(key)
            ? ['BlogPosting']
            : [];
    it(`${file}: JSON-LD parses and is ${expected.join(' + ') || 'absent'}, with no rating`, () => {
      const blocks = jsonLd(file);
      expect(blocks.map((b) => b['@type'])).toEqual(expected);
      for (const block of blocks) expect(block['@context']).toBe('https://schema.org');
      expect(JSON.stringify(blocks)).not.toMatch(/aggregateRating|ratingValue|SearchAction|potentialAction/);
    });
  }
});

describe('the head: title, preview, language', () => {
  for (const file of files) {
    it(`${file}: title, description, Open Graph and Twitter card agree`, () => {
      const head = headOf(file);
      const path = pathOf(file);
      const title = unescape(/<title>([\s\S]*?)<\/title>/.exec(head)![1]);
      expect(title).toMatch(keyOf(path) === 'index' ? /^PaliCanon ?: .+/ : /^.+ · PaliCanon$/);
      const description = one(head, 'name', 'description');
      expect(description.length).toBeGreaterThan(0);
      expect(one(head, 'property', 'og:title')).toBe(title);
      expect(one(head, 'property', 'og:description')).toBe(description);
      expect(one(head, 'property', 'og:url')).toBe(`${origin}${path}`);
      expect(one(head, 'name', 'twitter:card')).toBe('summary_large_image');
      expect(one(head, 'name', 'twitter:title')).toBe(title);
      expect(one(head, 'name', 'twitter:description')).toBe(description);
      expect(one(head, 'property', 'og:locale')).toBe({ en: 'en_US', fr: 'fr_FR', vi: 'vi_VN' }[langOf(path)]);
    });

    it(`${file}: the preview image is a 1200 x 630 file of dist`, () => {
      const head = headOf(file);
      const image = one(head, 'property', 'og:image');
      expect(one(head, 'name', 'twitter:image')).toBe(image);
      expect(image.startsWith(`${origin}/`)).toBe(true);
      const target = new URL(image).pathname.slice(1);
      expect(exists(target), `${image} is not in dist`).toBe(true);
      expect(statSync(join(DIST, target)).size).toBeGreaterThan(0);
      expect(one(head, 'property', 'og:image:width')).toBe('1200');
      expect(one(head, 'property', 'og:image:height')).toBe('630');
      expect(one(head, 'property', 'og:image:alt').length).toBeGreaterThan(0);
    });

    it(`${file}: a theme-color for each theme`, () => {
      const head = headOf(file);
      expect(head).toMatch(/<meta name="theme-color" content="#20262e" media="\(prefers-color-scheme: dark\)"/);
      expect(head).toMatch(/<meta name="theme-color" content="#f8f6f0" media="\(prefers-color-scheme: light\)"/);
      expect(head.match(/<meta name="theme-color"/g)).toHaveLength(2);
    });
  }

  it('the default image of each language and the logo exist', () => {
    for (const lang of LANGS) expect(exists(`og/default-${lang}.png`)).toBe(true);
    expect(exists('og/lotus.png')).toBe(true);
  });

  it('404.html is not indexed and names no canonical', () => {
    const head = headOf('404.html');
    expect(head).toContain('<meta name="robots" content="noindex"');
    expect(head).not.toContain('rel="canonical"');
    expect(head).not.toContain('rel="alternate"');
  });
});
