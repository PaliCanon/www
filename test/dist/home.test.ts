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
const LINKS = {
  teaching: (lang: (typeof LANGS)[number]) => pagePath(lang, 'about'),
  search: () => 'https://search.palicanon.app',
  viz: () => 'https://viz.palicanon.app',
  learn: () => 'https://learn.palicanon.app',
};

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
        it(`${section}: eyebrow, h2 with the highlight in <mark>, body, link`, () => {
          const start = html.indexOf(`data-home-section="${section}"`);
          const end = html.indexOf('</section>', start);
          const block = html.slice(start, end);
          const data = front(lang, section);
          const text = unescape(block);
          const h2 = /<h2[^>]*>([\s\S]*?)<\/h2>/.exec(block)?.[1] ?? '';
          expect(unescape(h2.replace(/<\/?mark>/g, ''))).toBe(data.title);
          if (data.highlight) expect(unescape(h2)).toContain(`<mark>${data.highlight}</mark>`);
          else expect(h2).not.toContain('<mark');
          if (data.eyebrow) {
            expect(text.indexOf(data.eyebrow)).toBeGreaterThanOrEqual(0);
            expect(text.indexOf(data.eyebrow)).toBeLessThan(text.indexOf('<h2'));
          }
          expect(block).not.toMatch(/<h1[\s>]/);
          expect(block).toContain(`href="${LINKS[section](lang)}"`);
          expect(block.indexOf('<h2')).toBeLessThan(block.indexOf(`href="${LINKS[section](lang)}"`));
        });
      }
    });
  }
});

describe('the map', () => {
  it('has its page, linked from the navigation and the footer of every language', () => {
    for (const lang of LANGS) {
      const html = homeOf(lang);
      expect(html).toContain(`<a href="${pagePath(lang, 'viz')}"`);
      expect(html.match(/href="https:\/\/viz\.palicanon\.app"/g) ?? []).not.toHaveLength(0);
      const footer = /<footer[\s\S]*<\/footer>/.exec(html)?.[0] ?? '';
      expect(footer).toContain('href="https://viz.palicanon.app"');
    }
  });
});
