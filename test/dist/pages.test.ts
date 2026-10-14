import { describe, expect, it } from 'vitest';
import { LANGS, MAIN_PAGES } from '../../src/lib/languages';
import { pagePath } from '../../src/lib/url';
import { exists, htmlFiles, read } from './helpers';

const fileOf = (path: string) => `${path.slice(1)}index.html`;

describe('every expected page exists, in en, fr and vi', () => {
  for (const lang of LANGS) {
    for (const page of MAIN_PAGES) {
      it(`${lang}/${page}`, () => {
        expect(exists(fileOf(pagePath(lang, page)))).toBe(true);
      });
    }
    it(`${lang} blog index`, () => {
      expect(exists(fileOf(pagePath(lang, 'blog')))).toBe(true);
    });
    it(`${lang} welcome post`, () => {
      expect(exists(fileOf(pagePath(lang, 'blog/welcome')))).toBe(true);
    });
  }

  it('has a 404.html, a sitemap and a robots.txt', () => {
    expect(exists('404.html')).toBe(true);
    expect(exists('sitemap.xml')).toBe(true);
    expect(exists('robots.txt')).toBe(true);
  });
});

describe('every page', () => {
  const files = htmlFiles();

  it('is found', () => {
    expect(files.length).toBeGreaterThanOrEqual(31);
  });

  for (const file of files) {
    it(`${file}: one h1 and a lang`, () => {
      const html = read(file);
      expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
      const lang = /^<!DOCTYPE html><html lang="([a-z]+)"/.exec(html)?.[1];
      expect(lang).toBeDefined();
      const folder = file.split('/')[0];
      const expected = (LANGS as readonly string[]).includes(folder) ? folder : 'en';
      expect(lang).toBe(expected);
    });
  }
});
