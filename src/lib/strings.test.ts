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

  it("name the map in the navigation and each home scene's button (user check 9)", () => {
    for (const lang of LANGS) expect(STRINGS[lang].nav.viz).not.toBe('');
    expect(STRINGS.en.sceneButton).toEqual({
      teaching: 'Discover the app',
      search: 'Discover the search',
      viz: 'Discover the map',
      learn: 'Discover Learn Pāli',
    });
    expect(STRINGS.fr.sceneButton).toEqual({
      teaching: "Découvrir l'app",
      search: 'Découvrir la recherche',
      viz: 'Découvrir la carte',
      learn: 'Découvrir Apprendre le pāli',
    });
    expect(STRINGS.vi.sceneButton).toEqual({
      teaching: 'Khám phá ứng dụng',
      search: 'Khám phá tìm kiếm',
      viz: 'Khám phá bản đồ',
      learn: 'Khám phá Học Pāli',
    });
  });

  it("name the bar's back link to the home (user check 14)", () => {
    expect(STRINGS.en.back).toBe('Back to the home');
    expect(STRINGS.fr.back).toBe("Retour à l'accueil");
    expect(STRINGS.vi.back).toBe('Về trang chủ');
  });

  it('link the services to https sites', () => {
    for (const href of Object.values(SERVICE_LINKS)) expect(href).toMatch(/^https:\/\//);
    expect(SERVICE_LINKS.viz).toBe('https://map.palicanon.app');
  });
});
