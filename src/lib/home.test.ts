import { describe, expect, it } from 'vitest';
import { HOME_SECTIONS, LANGS } from './languages';
import { hasMarks, marksClass, scenePath, sectionIds, splitHighlight } from './home';

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

describe('hasMarks', () => {
  it('finds a letter with a mark above or below, in every language, composed or not', () => {
    expect(hasMarks('ouvert à tous')).toBe(true);
    expect(hasMarks('The Pāli Canon')).toBe(true);
    expect(hasMarks('Mở cho mọi người')).toBe(true);
    expect(hasMarks('ÉTUDE')).toBe(true);
    expect(hasMarks('a\u0300')).toBe(true);
    expect(hasMarks("Ce qu'est le Tipiṭaka")).toBe(true);
    for (const letter of ['ṭ', 'ḍ', 'ṇ', 'ḷ', 'ṃ', 'ạ', 'ç'])
      expect(hasMarks(letter), letter).toBe(true);
  });

  it('ignores plain letters', () => {
    expect(hasMarks('Search the Canon')).toBe(false);
    expect(hasMarks("Chercher dans le Canon, l'ensemble")).toBe(false);
    expect(hasMarks('')).toBe(false);
  });
});

describe('scenePath', () => {
  it('leads each scene to its own page on this site, in the language', () => {
    expect(scenePath('en', 'teaching')).toBe('/tipitaka/');
    expect(scenePath('fr', 'teaching')).toBe('/fr/tipitaka/');
    expect(scenePath('vi', 'teaching')).toBe('/vi/tipitaka/');
    expect(scenePath('fr', 'search')).toBe('/fr/search/');
    expect(scenePath('vi', 'viz')).toBe('/vi/viz/');
    expect(scenePath('en', 'learn')).toBe('/learn/');
  });
});

describe('marksClass', () => {
  it('gives room under a band (has-marks) or without one (bare-marks, P1)', () => {
    expect(marksClass(true, 'ouvert à tous')).toBe('has-marks');
    expect(marksClass(false, 'Tipiṭaka sur iPhone')).toBe('bare-marks');
  });

  it('gives none to a heading with no marked letter, banded or not', () => {
    expect(marksClass(true, 'The end of suffering')).toBeUndefined();
    expect(marksClass(false, 'About PaliCanon')).toBeUndefined();
  });
});
