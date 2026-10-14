import { describe, expect, it } from 'vitest';
import { LANGS } from './languages';
import { LANGUAGE_NAMES, SERVICE_LINKS, STRINGS } from './strings';

const leaves = (value: unknown): string[] =>
  typeof value === 'string' ? [value] : Object.values(value as object).flatMap(leaves);

describe('the chrome strings', () => {
  it('exist for every language with the same keys', () => {
    const shape = (l: (typeof LANGS)[number]) => JSON.stringify(Object.keys(STRINGS[l]).sort());
    for (const lang of LANGS) {
      expect(shape(lang)).toBe(shape('en'));
      expect(Object.keys(STRINGS[lang].nav)).toEqual(Object.keys(STRINGS.en.nav));
    }
  });

  it('are never empty and never use an em dash (user rule for copy)', () => {
    for (const lang of LANGS) {
      for (const text of leaves(STRINGS[lang])) {
        expect(text.trim()).not.toBe('');
        expect(text).not.toContain('—');
      }
    }
  });

  it('name each language in itself', () => {
    expect(Object.keys(LANGUAGE_NAMES)).toEqual([...LANGS]);
    expect(LANGUAGE_NAMES.vi).toBe('Tiếng Việt');
  });

  it('name the map in the navigation and say what each home section leads to', () => {
    for (const lang of LANGS) {
      expect(STRINGS[lang].nav.viz).not.toBe('');
      expect(Object.keys(STRINGS[lang].sectionLink)).toEqual([
        'teaching',
        'search',
        'viz',
        'learn',
      ]);
    }
  });

  it('link the services to https sites', () => {
    for (const href of Object.values(SERVICE_LINKS)) expect(href).toMatch(/^https:\/\//);
    expect(SERVICE_LINKS.viz).toBe('https://viz.palicanon.app');
  });
});
