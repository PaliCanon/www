import { describe, expect, it } from 'vitest';
import { LANGS, MAIN_PAGES } from '../languages';
import { buildRoutes } from '../routes';
import { url } from '../url';
import { sitemapXml } from './sitemap';

const pages = LANGS.flatMap((l) => MAIN_PAGES.map((p) => `${l}/${p}`));
const routes = buildRoutes(pages, ['en/blog/welcome', 'fr/blog/welcome', 'en/blog/solo']);
const SITE = 'https://example.test';
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
const entryOf = (xml: string, loc: string) =>
  new RegExp(`<url><loc>${loc}</loc>[\\s\\S]*?</url>`).exec(xml)?.[0] ?? '';
const links = (entry: string) =>
  [...entry.matchAll(/<xhtml:link rel="alternate" hreflang="([^"]+)" href="([^"]+)"\/>/g)].map(
    (m) => `${m[1]} ${m[2]}`,
  );

describe('sitemapXml', () => {
  it('lists the url() of every route once, in route order', () => {
    const xml = sitemapXml(routes, SITE);
    expect(locs(xml)).toEqual(routes.map((r) => url(r.lang, r.key, SITE)));
    expect(new Set(locs(xml)).size).toBe(routes.length);
  });

  it('writes the home page with its slash and the others under their language', () => {
    const l = locs(sitemapXml(routes, 'https://palicanon.app'));
    expect(l).toContain('https://palicanon.app/');
    expect(l).toContain('https://palicanon.app/fr/about/');
    expect(l).toContain('https://palicanon.app/vi/blog/');
    expect(l).toContain('https://palicanon.app/fr/blog/welcome/');
  });

  it('is an XML urlset declaring the sitemap and the xhtml namespaces', () => {
    const xml = sitemapXml(routes, SITE);
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset ')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"');
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('escapes what XML reserves', () => {
    const xml = sitemapXml([{ ...routes[0], lang: 'en', key: 'a&b', translations: ['en'] }], SITE);
    expect(xml).toContain('<loc>https://example.test/a&amp;b/</loc>');
    expect(xml).toContain('href="https://example.test/a&amp;b/"');
  });
});

describe('sitemapXml: alternates', () => {
  const xml = sitemapXml(routes, SITE);

  it('gives every page its translations and x-default, itself included', () => {
    expect(links(entryOf(xml, `${SITE}/fr/about/`))).toEqual([
      `en ${SITE}/about/`,
      `fr ${SITE}/fr/about/`,
      `vi ${SITE}/vi/about/`,
      `x-default ${SITE}/about/`,
    ]);
  });

  it('has none for a language the post does not exist in', () => {
    expect(links(entryOf(xml, `${SITE}/blog/welcome/`))).toEqual([
      `en ${SITE}/blog/welcome/`,
      `fr ${SITE}/fr/blog/welcome/`,
      `x-default ${SITE}/blog/welcome/`,
    ]);
    expect(links(entryOf(xml, `${SITE}/blog/solo/`))).toEqual([
      `en ${SITE}/blog/solo/`,
      `x-default ${SITE}/blog/solo/`,
    ]);
  });
});

describe('sitemapXml: lastmod', () => {
  const lastmods: Record<string, string | null> = {
    '/about/': '2026-10-14T09:30:00Z',
    '/fr/about/': null,
  };
  const xml = sitemapXml(routes, SITE, (r) => lastmods[r.path] ?? null);

  it('writes the date of the page after its address', () => {
    expect(entryOf(xml, `${SITE}/about/`)).toContain(
      '<loc>https://example.test/about/</loc><lastmod>2026-10-14T09:30:00Z</lastmod>',
    );
  });

  it('leaves it out when the date is unknown', () => {
    expect(entryOf(xml, `${SITE}/fr/about/`)).not.toContain('<lastmod>');
    expect(sitemapXml(routes, SITE)).not.toContain('<lastmod>');
  });
});
