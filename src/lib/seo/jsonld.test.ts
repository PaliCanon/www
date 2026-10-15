import { describe, expect, it } from 'vitest';
import { LANGS, MAIN_PAGES } from '../languages';
import { buildRoutes } from '../routes';
import { SERVICE_LINKS } from '../strings';
import { jsonLdFor, serializeJsonLd } from './jsonld';

const SITE = 'https://example.test';
const routes = buildRoutes(
  LANGS.flatMap((l) => MAIN_PAGES.map((p) => `${l}/${p}`)),
  ['en/blog/welcome', 'fr/blog/welcome'],
);
const make = (path: string, extra = {}) =>
  jsonLdFor({
    site: SITE,
    route: routes.find((r) => r.path === path)!,
    title: 'T',
    description: 'D',
    ...extra,
  }) as Array<Record<string, unknown>>;
const types = (path: string, extra = {}) => make(path, extra).map((o) => o['@type']);

describe('jsonLdFor: the type of each kind of page', () => {
  it('home pages: Organization and WebSite', () => {
    for (const path of ['/', '/fr/', '/vi/'])
      expect(types(path)).toEqual(['Organization', 'WebSite']);
  });

  it('the Tipiṭaka page of each language: MobileApplication', () => {
    for (const path of ['/tipitaka/', '/fr/tipitaka/', '/vi/tipitaka/']) {
      expect(types(path)).toEqual(['MobileApplication']);
    }
  });

  it('a blog post: BlogPosting', () => {
    expect(types('/blog/welcome/', { published: new Date('2026-10-14') })).toEqual(['BlogPosting']);
  });

  it('every other page: none', () => {
    for (const path of ['/about/', '/fr/search/', '/blog/', '/vi/legal/'])
      expect(types(path)).toEqual([]);
  });
});

describe('jsonLdFor: the content', () => {
  it('Organization: name, url, the lotus logo, the Instagram and Ko-fi profiles', () => {
    const org = make('/')[0];
    expect(org['@context']).toBe('https://schema.org');
    expect(org.name).toBe('PaliCanon');
    expect(org.url).toBe('https://example.test/');
    expect(org['@id']).toBe('https://example.test/#organization');
    expect(org.logo).toEqual({ '@type': 'ImageObject', url: 'https://example.test/og/lotus.png' });
    expect(org.sameAs).toEqual([
      'https://www.instagram.com/daily_sutta',
      'https://ko-fi.com/tipitaka',
    ]);
  });

  it('WebSite: the language home, its language, no SearchAction', () => {
    const site = make('/fr/')[1];
    expect(site.url).toBe('https://example.test/fr/');
    expect(site.inLanguage).toBe('fr');
    expect(site.name).toBe('PaliCanon');
    expect(site.description).toBe('D');
    expect(JSON.stringify(site)).not.toContain('SearchAction');
    expect(site.publisher).toEqual({ '@id': 'https://example.test/#organization' });
  });

  it('MobileApplication: iOS, the App Store url, no rating, no offer', () => {
    const app = make('/fr/tipitaka/')[0];
    expect(app.operatingSystem).toBe('iOS');
    expect(app.url).toBe('https://example.test/fr/tipitaka/');
    expect(app.installUrl).toBe(SERVICE_LINKS.tipitaka);
    expect(app.inLanguage).toBe('fr');
    const text = JSON.stringify(app);
    expect(text).not.toMatch(/aggregateRating|ratingValue|reviewCount|"offers"/);
  });

  it('BlogPosting: headline, date, language, image, publisher', () => {
    const post = make('/fr/blog/welcome/', {
      published: new Date('2026-10-14'),
      image: 'https://example.test/og/default-fr.png',
    })[0];
    expect(post.headline).toBe('T');
    expect(post.description).toBe('D');
    expect(post.datePublished).toBe('2026-10-14');
    expect(post.inLanguage).toBe('fr');
    expect(post.mainEntityOfPage).toBe('https://example.test/fr/blog/welcome/');
    expect(post.image).toBe('https://example.test/og/default-fr.png');
    expect((post.publisher as Record<string, unknown>).name).toBe('PaliCanon');
  });

  it('never carries a rating', () => {
    for (const route of routes) {
      const text = JSON.stringify(
        jsonLdFor({
          site: SITE,
          route,
          title: 'T',
          description: 'D',
          published: new Date('2026-10-14'),
        }),
      );
      expect(text).not.toMatch(/aggregateRating|ratingValue|reviewCount/);
    }
  });
});

describe('serializeJsonLd', () => {
  it('is JSON that parses back, with < escaped so a title cannot close the script', () => {
    const text = serializeJsonLd({ name: '</script><b>' });
    expect(text).not.toContain('<');
    expect(JSON.parse(text)).toEqual({ name: '</script><b>' });
  });
});
