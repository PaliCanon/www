import { describe, expect, it } from 'vitest';
import { HOME_SECTIONS, LANGS, MAIN_PAGES } from './languages';
import { checkCompleteness } from './completeness';

const sections = LANGS.flatMap((l) => HOME_SECTIONS.map((s) => `${l}/home/${s}`));
const all = [...LANGS.flatMap((l) => MAIN_PAGES.map((p) => `${l}/${p}`)), ...sections];

describe('checkCompleteness', () => {
  it('accepts the 8 main pages and the 4 home sections in en, fr and vi', () => {
    expect(MAIN_PAGES).toHaveLength(8);
    expect(MAIN_PAGES).toContain('viz');
    expect(HOME_SECTIONS).toEqual(['teaching', 'search', 'viz', 'learn']);
    expect(all).toHaveLength(36);
    expect(checkCompleteness(all)).toEqual([]);
  });

  it('names the file of a page missing in one language', () => {
    const v = checkCompleteness(all.filter((id) => id !== 'fr/search'));
    expect(v).toHaveLength(1);
    expect(v[0].rule).toBe('missing-page');
    expect(v[0].file).toBe('content/fr/search.md');
  });

  it('names every page of a language that is missing altogether', () => {
    const v = checkCompleteness(all.filter((id) => !id.startsWith('vi/')));
    expect(v.map((x) => x.file).sort()).toEqual(
      [
        ...MAIN_PAGES.map((p) => `content/vi/${p}.md`),
        ...HOME_SECTIONS.map((s) => `content/vi/home/${s}.md`),
      ].sort(),
    );
  });

  it('fails when the home page is missing (index is a main page)', () => {
    expect(checkCompleteness(all.filter((id) => id !== 'en/index'))[0].file).toBe(
      'content/en/index.md',
    );
  });

  it('ignores blog posts, which need not exist in every language', () => {
    expect(checkCompleteness([...all, 'en/blog/welcome'])).toEqual([]);
  });

  it('refuses a page whose id is the blog index (content/en/blog.md would add a second /blog/)', () => {
    const v = checkCompleteness([...all, 'en/blog']);
    expect(v.map((x) => [x.rule, x.file])).toEqual([['unknown-page', 'content/en/blog.md']]);
  });

  it('fails on a language folder that is not en, fr or vi', () => {
    const v = checkCompleteness([...all, 'de/index']);
    expect(v.map((x) => x.rule)).toEqual(['unknown-language']);
    expect(v[0].file).toBe('content/de/index.md');
  });

  it('fails on a page that is not a main page (a typo would otherwise ship as a page)', () => {
    const v = checkCompleteness([...all, 'en/serach']);
    expect(v.map((x) => x.rule)).toEqual(['unknown-page']);
    expect(v[0].file).toBe('content/en/serach.md');
  });

  it('fails when the map page is missing in one language', () => {
    const v = checkCompleteness(all.filter((id) => id !== 'vi/viz'));
    expect(v.map((x) => [x.rule, x.file])).toEqual([['missing-page', 'content/vi/viz.md']]);
  });

  it('fails on a home section missing in one language, naming its file', () => {
    const v = checkCompleteness(all.filter((id) => id !== 'fr/home/viz'));
    expect(v).toHaveLength(1);
    expect(v[0].rule).toBe('missing-section');
    expect(v[0].file).toBe('content/fr/home/viz.md');
    expect(v[0].message).toContain('viz');
  });

  it('fails on a home section that is none of the four', () => {
    const v = checkCompleteness([...all, 'en/home/extra']);
    expect(v.map((x) => x.rule)).toEqual(['unknown-section']);
    expect(v[0].file).toBe('content/en/home/extra.md');
    expect(v[0].message).toContain('teaching, search, viz, learn');
  });

  it('fails on a home section of a language the site does not have', () => {
    expect(checkCompleteness([...all, 'de/home/teaching']).map((x) => x.rule)).toEqual([
      'unknown-language',
    ]);
  });

  it('uses the root it is given in the file names', () => {
    const v = checkCompleteness(all.slice(1), 'test/site');
    expect(v[0].file.startsWith('test/site/')).toBe(true);
  });
});
