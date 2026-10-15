import { describe, expect, it } from 'vitest';
import { LANGS, MAIN_PAGES } from '../languages';
import { buildRoutes } from '../routes';
import { headData } from './head';

const SITE = 'https://example.test';
const routes = buildRoutes(
  LANGS.flatMap((l) => MAIN_PAGES.map((p) => `${l}/${p}`)),
  ['en/blog/welcome', 'fr/blog/welcome', 'en/blog/solo', 'fr/blog/seul'],
);
const at = (path: string) => routes.find((r) => r.path === path)!;
const IMAGE = { url: `${SITE}/og/default-en.png`, width: 1200, height: 630, alt: 'x' };
const input = (path: string, extra = {}) => ({
  site: SITE,
  title: 'About PaliCanon',
  description: 'Why PaliCanon exists.',
  route: at(path),
  image: IMAGE,
  ...extra,
});
const og = (data: ReturnType<typeof headData>, property: string) =>
  data.openGraph.filter(([p]) => p === property).map(([, v]) => v);
const tw = (data: ReturnType<typeof headData>, name: string) =>
  data.twitter.find(([n]) => n === name)?.[1];

describe('headData: title, description, canonical', () => {
  it('writes the title as "<title> · PaliCanon", the home as its content title alone', () => {
    expect(headData(input('/about/')).title).toBe('About PaliCanon · PaliCanon');
    expect(headData(input('/')).title).toBe('About PaliCanon');
    expect(headData(input('/fr/')).title).toBe('About PaliCanon');
  });

  it('keeps the description as written', () => {
    expect(headData(input('/about/')).description).toBe('Why PaliCanon exists.');
  });

  it("has one canonical: the page's own absolute url", () => {
    expect(headData(input('/about/')).canonical).toBe('https://example.test/about/');
    expect(headData(input('/fr/about/')).canonical).toBe('https://example.test/fr/about/');
    expect(headData(input('/vi/blog/')).canonical).toBe('https://example.test/vi/blog/');
    expect(headData(input('/')).canonical).toBe('https://example.test/');
  });
});

describe('headData: hreflang', () => {
  it('carries the alternates of the page, x-default included', () => {
    const langs = headData(input('/fr/about/')).alternates.map((a) => a.hreflang);
    expect(langs).toEqual(['en', 'fr', 'vi', 'x-default']);
  });

  it('has none for a language the post does not exist in', () => {
    const langs = headData(input('/blog/welcome/')).alternates.map((a) => a.hreflang);
    expect(langs).toEqual(['en', 'fr', 'x-default']);
  });
});

describe('headData: a page that exists in one non-default language only', () => {
  const data = headData(input('/fr/blog/seul/'));

  it('lists itself alone, with no x-default, and keeps its own canonical', () => {
    expect(data.alternates).toEqual([
      { hreflang: 'fr', href: 'https://example.test/fr/blog/seul/' },
    ]);
    expect(data.canonical).toBe('https://example.test/fr/blog/seul/');
    expect(data.noindex).toBe(false);
  });

  it('names no alternate locale in Open Graph', () => {
    expect(og(data, 'og:locale')).toEqual(['fr_FR']);
    expect(og(data, 'og:locale:alternate')).toEqual([]);
  });
});

describe('headData: Open Graph and Twitter card', () => {
  it('has the Open Graph fields of a page', () => {
    const data = headData(input('/fr/about/', { title: 'À propos' }));
    expect(og(data, 'og:title')).toEqual(['À propos · PaliCanon']);
    expect(og(data, 'og:description')).toEqual(['Why PaliCanon exists.']);
    expect(og(data, 'og:url')).toEqual(['https://example.test/fr/about/']);
    expect(og(data, 'og:type')).toEqual(['website']);
    expect(og(data, 'og:site_name')).toEqual(['PaliCanon']);
    expect(og(data, 'og:locale')).toEqual(['fr_FR']);
    expect(og(data, 'og:locale:alternate')).toEqual(['en_US', 'vi_VN']);
    expect(og(data, 'og:image')).toEqual([IMAGE.url]);
    expect(og(data, 'og:image:width')).toEqual(['1200']);
    expect(og(data, 'og:image:height')).toEqual(['630']);
    expect(og(data, 'og:image:alt')).toEqual(['x']);
  });

  it('lists as alternate locales only the languages the page exists in', () => {
    const data = headData(input('/blog/welcome/', { published: new Date('2026-10-14') }));
    expect(og(data, 'og:locale:alternate')).toEqual(['fr_FR']);
    expect(og(headData(input('/blog/solo/')), 'og:locale:alternate')).toEqual([]);
  });

  it('uses one image for Open Graph and the Twitter card, whichever it is', () => {
    const card = { ...IMAGE, url: `${SITE}/og/default-fr.png`, alt: 'Le Canon pāli' };
    const data = headData(input('/fr/blog/seul/', { image: card }));
    expect(og(data, 'og:image')).toEqual([card.url]);
    expect(tw(data, 'twitter:image')).toBe(card.url);
    expect(og(data, 'og:image:alt')).toEqual(['Le Canon pāli']);
    expect(tw(data, 'twitter:image:alt')).toBe('Le Canon pāli');
  });

  it('is an article, with its publication date, for a blog post', () => {
    const data = headData(input('/blog/welcome/', { published: new Date('2026-10-14') }));
    expect(og(data, 'og:type')).toEqual(['article']);
    expect(og(data, 'article:published_time')).toEqual(['2026-10-14']);
    expect(og(headData(input('/about/')), 'article:published_time')).toEqual([]);
  });

  it('has a large-image Twitter card repeating title, description and image', () => {
    const data = headData(input('/about/'));
    expect(tw(data, 'twitter:card')).toBe('summary_large_image');
    expect(tw(data, 'twitter:title')).toBe('About PaliCanon · PaliCanon');
    expect(tw(data, 'twitter:description')).toBe('Why PaliCanon exists.');
    expect(tw(data, 'twitter:image')).toBe(IMAGE.url);
    expect(tw(data, 'twitter:image:alt')).toBe('x');
  });
});

describe('headData: a page that is no route (the 404)', () => {
  it('is not indexed, has no canonical, no alternate and no preview', () => {
    const data = headData({ site: SITE, title: 'Page not found', description: 'd' });
    expect(data.noindex).toBe(true);
    expect(data.canonical).toBeUndefined();
    expect(data.alternates).toEqual([]);
    expect(data.openGraph).toEqual([]);
    expect(data.twitter).toEqual([]);
    expect(data.title).toBe('Page not found · PaliCanon');
  });

  it('is indexed for every real route', () => {
    expect(headData(input('/about/')).noindex).toBe(false);
  });
});
