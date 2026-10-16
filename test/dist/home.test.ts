import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { parseFrontmatter } from '../../src/lib/frontmatter';
import { HOME_SECTIONS, LANGS } from '../../src/lib/languages';
import { pagePath } from '../../src/lib/url';
import { read } from './helpers';

const content = join(import.meta.dirname, '../../content');
const front = (lang: string, section: string) =>
  parseFrontmatter(readFileSync(join(content, lang, 'home', `${section}.md`), 'utf8')).data as {
    eyebrow?: string;
    title: string;
    highlight?: string;
  };
/** The text as the author wrote it: the HTML escapes of the quote and the ampersand undone. */
const unescape = (html: string) =>
  html.replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');
const homeOf = (lang: (typeof LANGS)[number]) =>
  read(`${pagePath(lang, 'index').slice(1)}index.html`);
/** Each scene's own page, presenting the project with its link: the whole scene leads there (user check 6). */
const PAGES = { teaching: 'tipitaka', search: 'search', viz: 'viz', learn: 'learn' } as const;
const READ_MORE = { en: 'read more', fr: 'en savoir plus', vi: 'xem thêm' } as const;
/** The scene's gold button (user check 9), to the same page as its title. */
const BUTTONS = {
  en: { teaching: 'Discover the app', search: 'Discover the search', viz: 'Discover the map', learn: 'Discover Learn Pāli' },
  fr: { teaching: "Découvrir l'app", search: 'Découvrir la recherche', viz: 'Découvrir la carte', learn: 'Découvrir Apprendre le pāli' },
  vi: { teaching: 'Khám phá ứng dụng', search: 'Khám phá tìm kiếm', viz: 'Khám phá bản đồ', learn: 'Khám phá Học Pāli' },
} as const;

describe('the home page of each language', () => {
  for (const lang of LANGS) {
    describe(lang, () => {
      const html = homeOf(lang);

      it('has one h1, the opening of index.md, before the sections', () => {
        expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
        expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('data-home-section='));
      });

      it('shows the four sections in the fixed order', () => {
        const seen = [...html.matchAll(/data-home-section="([a-z]+)"/g)].map((m) => m[1]);
        expect(seen).toEqual([...HOME_SECTIONS]);
        expect(seen).toEqual(['teaching', 'search', 'viz', 'learn']);
      });

      for (const section of HOME_SECTIONS) {
        it(`${section}: eyebrow, h2 with the highlight in <mark>, body`, () => {
          const start = html.indexOf(`data-home-section="${section}"`);
          const end = html.indexOf('</section>', start);
          const block = html.slice(start, end);
          const data = front(lang, section);
          const text = unescape(block);
          const h2 = (/<h2[^>]*>([\s\S]*?)<\/h2>/.exec(block)?.[1] ?? '').replace(/<\/?a\b[^>]*>/g, '');
          expect(unescape(h2.replace(/<\/?mark>/g, ''))).toBe(data.title);
          if (data.highlight) expect(unescape(h2)).toContain(`<mark>${data.highlight}</mark>`);
          else expect(h2).not.toContain('<mark');
          if (data.eyebrow) {
            expect(text.indexOf(data.eyebrow)).toBeGreaterThanOrEqual(0);
            expect(text.indexOf(data.eyebrow)).toBeLessThan(text.indexOf('<h2'));
          }
          expect(block).not.toMatch(/<h1[\s>]/);
        });

        it(`${section}: the title is the scene's link to ${PAGES[section]}, named "<title>, read more"`, () => {
          const start = html.indexOf(`data-home-section="${section}"`);
          const block = html.slice(start, html.indexOf('</section>', start));
          const h2 = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(block)?.[1] ?? '';
          const link = /^\s*<a\b([^>]*)>[\s\S]*<\/a>\s*$/.exec(h2);
          expect(link, 'the h2 holds one link around the title').not.toBeNull();
          expect(link?.[1]).toContain(`href="${pagePath(lang, PAGES[section])}"`);
          const label = unescape(/aria-label="([^"]*)"/.exec(link?.[1] ?? '')?.[1] ?? '');
          expect(label).toBe(`${front(lang, section).title}, ${READ_MORE[lang]}`);
        });

        it(`${section}: three links to its page, the hidden cover, the title and the gold button, nothing else`, () => {
          const start = html.indexOf(`data-home-section="${section}"`);
          const block = html.slice(start, html.indexOf('</section>', start));
          const page = `href="${pagePath(lang, PAGES[section])}"`;
          const toPage = [...block.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]).filter((a) => a.includes(page));
          const focusable = toPage.filter((a) => !a.includes('tabindex="-1"'));
          const covers = toPage.filter((a) => a.includes('tabindex="-1"'));
          expect(covers).toHaveLength(1);
          expect(covers[0]).toContain('aria-hidden="true"');
          expect(covers[0]).toContain('scene__cover');
          expect(focusable).toHaveLength(2);
          const links = [...block.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);
          expect(links.filter((a) => !a.includes(page)), 'no other link in the scene').toEqual([]);
          const button = /<p class="step step--link">\s*<a\b([^>]*)>([^<]*)<\/a>\s*<\/p>/.exec(block);
          expect(button, 'the button sits in its own step under the text').not.toBeNull();
          expect(button?.[1]).toContain(page);
          expect(button?.[1]).toMatch(/class="pill pill--gold"/);
          expect(unescape(button?.[2].trim() ?? '')).toBe(BUTTONS[lang][section]);
          expect(block.indexOf('step--link')).toBeGreaterThan(block.indexOf('class="steps"'));
        });
      }
    });
  }
});

describe('the teaching scene', () => {
  it('leads to the Tipiṭaka app page of its language, not to the about page', () => {
    for (const lang of LANGS) {
      const html = homeOf(lang);
      const start = html.indexOf('data-home-section="teaching"');
      const block = html.slice(start, html.indexOf('</section>', start));
      expect(block).toContain(`href="${pagePath(lang, 'tipitaka')}"`);
      expect(block).not.toContain(`href="${pagePath(lang, 'about')}"`);
    }
  });
});

describe('the opening: "PaliCanon," on its own line (user check 4)', () => {
  const OPENINGS = {
    en: 'the end of <mark>suffering</mark>',
    fr: 'la fin de la <mark>souffrance</mark>',
    vi: 'chấm dứt <mark>khổ đau</mark>',
  } as const;
  for (const lang of LANGS) {
    it(`${lang}: the brand line, the comma kept for screen readers, then the phrase with its band`, () => {
      const h1 = /<h1\b[^>]*>([\s\S]*?)<\/h1>/.exec(homeOf(lang))?.[1] ?? '';
      expect(h1).toMatch(
        /^<span class="brand-line">PaliCanon<span class="sr-only">,<\/span><\/span>\s*/,
      );
      expect(h1.replace(/^<span class="brand-line">[\s\S]*?<\/span><\/span>\s*/, '')).toBe(
        OPENINGS[lang],
      );
    });
  }

  it('leaves an h1 that does not start with "PaliCanon," untouched', () => {
    for (const file of ['about/index.html', 'fr/search/index.html', 'vi/viz/index.html', '404.html']) {
      expect(read(file), file).not.toContain('brand-line');
    }
  });
});
