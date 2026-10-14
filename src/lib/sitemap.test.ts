import { describe, expect, it } from 'vitest';
import { LANGS, MAIN_PAGES } from './languages';
import { buildRoutes } from './routes';
import { robotsTxt, SITEMAP_PATH, sitemapXml } from './sitemap';
import { url } from './url';

const pages = LANGS.flatMap((l) => MAIN_PAGES.map((p) => `${l}/${p}`));
const routes = buildRoutes(pages, ['en/blog/welcome', 'fr/blog/welcome']);
const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

describe('sitemapXml', () => {
  it('lists the url() of every route once, in route order', () => {
    const xml = sitemapXml(routes, 'https://example.test');
    expect(locs(xml)).toEqual(routes.map((r) => url(r.lang, r.key, 'https://example.test')));
    expect(new Set(locs(xml)).size).toBe(routes.length);
  });

  it('writes the home page with its slash and the others under their language', () => {
    const l = locs(sitemapXml(routes, 'https://palicanon.app'));
    expect(l).toContain('https://palicanon.app/');
    expect(l).toContain('https://palicanon.app/fr/about/');
    expect(l).toContain('https://palicanon.app/vi/blog/');
    expect(l).toContain('https://palicanon.app/fr/blog/welcome/');
  });

  it('is an XML urlset', () => {
    const xml = sitemapXml(routes, 'https://example.test');
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<urlset ')).toBe(true);
    expect(xml.trimEnd().endsWith('</urlset>')).toBe(true);
  });

  it('escapes what XML reserves', () => {
    const xml = sitemapXml([{ ...routes[0], lang: 'en', key: 'a&b' }], 'https://example.test');
    expect(xml).toContain('<loc>https://example.test/a&amp;b/</loc>');
  });
});

describe('robotsTxt', () => {
  it('allows everything and points at the sitemap of the same site', () => {
    expect(SITEMAP_PATH).toBe('/sitemap.xml');
    expect(robotsTxt('https://example.test')).toBe(
      'User-agent: *\nAllow: /\n\nSitemap: https://example.test/sitemap.xml\n',
    );
  });
});
