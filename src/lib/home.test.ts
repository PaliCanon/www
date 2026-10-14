import { describe, expect, it } from 'vitest';
import { HOME_SECTIONS, LANGS } from './languages';
import { sectionHref, sectionIds, splitHighlight } from './home';

describe('sectionHref', () => {
  it('sends the teaching to the about page of the language', () => {
    expect(sectionHref('en', 'teaching')).toBe('/about/');
    expect(sectionHref('fr', 'teaching')).toBe('/fr/about/');
    expect(sectionHref('vi', 'teaching')).toBe('/vi/about/');
  });

  it('sends the other sections to the services, the same in every language', () => {
    for (const lang of LANGS) {
      expect(sectionHref(lang, 'search')).toBe('https://search.palicanon.app');
      expect(sectionHref(lang, 'viz')).toBe('https://viz.palicanon.app');
      expect(sectionHref(lang, 'learn')).toBe('https://learn.palicanon.app');
    }
  });
});

describe('splitHighlight', () => {
  it('cuts the title around the highlight', () => {
    expect(splitHighlight('What the Tipiṭaka is', 'Tipiṭaka')).toEqual({
      before: 'What the ',
      mark: 'Tipiṭaka',
      after: ' is',
    });
  });

  it('marks the first occurrence only', () => {
    expect(splitHighlight('a map of a map', 'map')).toEqual({
      before: 'a ',
      mark: 'map',
      after: ' of a map',
    });
  });

  it('marks the whole title, or nothing', () => {
    expect(splitHighlight('Search', 'Search')).toEqual({ before: '', mark: 'Search', after: '' });
    expect(splitHighlight('Search', undefined)).toEqual({ before: 'Search', after: '' });
  });

  it('leaves the title plain when the highlight is not in it', () => {
    expect(splitHighlight('Search', 'Learn')).toEqual({ before: 'Search', after: '' });
  });
});

describe('sectionIds', () => {
  const ids = LANGS.flatMap((l) => [...HOME_SECTIONS].reverse().map((s) => `${l}/home/${s}`));

  it('lists the sections of a language in the fixed order, whatever the order given', () => {
    expect(sectionIds(ids, 'fr')).toEqual([
      'fr/home/teaching',
      'fr/home/search',
      'fr/home/viz',
      'fr/home/learn',
    ]);
  });

  it('names the section that is not there instead of leaving it out', () => {
    expect(() => sectionIds(['en/home/learn', 'en/home/teaching', 'fr/home/viz'], 'en')).toThrow(
      'content/en/home/search.md:1 [missing-section]',
    );
  });
});
