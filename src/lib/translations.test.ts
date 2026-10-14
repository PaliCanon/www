import { describe, expect, it } from 'vitest';
import { parseId, translations } from './translations';

const pages = [
  'en/about',
  'fr/about',
  'vi/about',
  'en/blog/welcome',
  'fr/blog/welcome',
  'en/blog/only-english',
].map(parseId);

describe('parseId', () => {
  it('splits the language folder from the file name', () => {
    expect(parseId('fr/about')).toEqual({ lang: 'fr', key: 'about' });
  });

  it('keeps the blog folder in the key', () => {
    expect(parseId('vi/blog/welcome')).toEqual({ lang: 'vi', key: 'blog/welcome' });
  });

  it('rejects an id with no language or an unknown one', () => {
    expect(() => parseId('about')).toThrow(/language/);
    expect(() => parseId('de/about')).toThrow(/language/);
  });
});

describe('translations', () => {
  it('lists the existing languages of a page, in en, fr, vi order, itself included', () => {
    expect(translations(pages, parseId('vi/about'))).toEqual(['en', 'fr', 'vi']);
  });

  it('leaves out the languages where a blog post does not exist', () => {
    expect(translations(pages, parseId('en/blog/welcome'))).toEqual(['en', 'fr']);
    expect(translations(pages, parseId('en/blog/only-english'))).toEqual(['en']);
  });

  it('is empty for a page that does not exist anywhere', () => {
    expect(translations(pages, { lang: 'en', key: 'nothing' })).toEqual([]);
  });

  it('depends on the file name only, not on the language asked from', () => {
    expect(translations(pages, { lang: 'vi', key: 'blog/welcome' })).toEqual(['en', 'fr']);
  });
});
