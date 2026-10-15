import { describe, expect, it } from 'vitest';
import type { Lang } from '../languages';
import { url } from '../url';
import { alternates } from './alternates';

const SITE = 'https://example.test';
const page = (key: string, translations: Lang[]) => ({ key, translations });

describe('alternates', () => {
  it('lists every translation, then x-default = the English page', () => {
    expect(alternates(page('about', ['en', 'fr', 'vi']), SITE)).toEqual([
      { hreflang: 'en', href: 'https://example.test/about/' },
      { hreflang: 'fr', href: 'https://example.test/fr/about/' },
      { hreflang: 'vi', href: 'https://example.test/vi/about/' },
      { hreflang: 'x-default', href: 'https://example.test/about/' },
    ]);
  });

  it('writes the home page of each language with its slash', () => {
    const hrefs = alternates(page('index', ['en', 'fr', 'vi']), SITE).map((a) => a.href);
    expect(hrefs).toEqual([
      'https://example.test/',
      'https://example.test/fr/',
      'https://example.test/vi/',
      'https://example.test/',
    ]);
  });

  it('has nothing for a language the page does not exist in', () => {
    const langs = alternates(page('blog/shared', ['en', 'fr']), SITE).map((a) => a.hreflang);
    expect(langs).toEqual(['en', 'fr', 'x-default']);
  });

  it('has no x-default when the page has no English version', () => {
    const langs = alternates(page('blog/only-fr', ['fr', 'vi']), SITE).map((a) => a.hreflang);
    expect(langs).toEqual(['fr', 'vi']);
  });

  it('lists a page that exists in one non-default language alone with itself only: no x-default', () => {
    expect(alternates(page('blog/seul', ['fr']), SITE)).toEqual([
      { hreflang: 'fr', href: 'https://example.test/fr/blog/seul/' },
    ]);
  });

  it('lists a page that exists in one language alone with itself only', () => {
    expect(alternates(page('blog/solo', ['en']), SITE)).toEqual([
      { hreflang: 'en', href: 'https://example.test/blog/solo/' },
      { hreflang: 'x-default', href: 'https://example.test/blog/solo/' },
    ]);
  });

  it('is the same list whichever page of the set asks: every page lists all the others', () => {
    const set: Lang[] = ['en', 'fr', 'vi'];
    const hrefs = alternates({ key: 'learn', translations: set }, SITE)
      .filter((a) => a.hreflang !== 'x-default')
      .map((a) => a.href);
    expect(hrefs).toEqual(set.map((lang) => url(lang, 'learn', SITE)));
  });
});
