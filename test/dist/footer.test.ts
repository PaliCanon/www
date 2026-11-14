import { describe, expect, it } from 'vitest';
import { LANGS, type Lang } from '../../src/lib/languages';
import { STRINGS } from '../../src/lib/strings';
import { pagePath } from '../../src/lib/url';
import { htmlFiles, read } from './helpers';

// Task 017: the footer links the legal notice and the old site's pages, in the
// page's language: Acknowledgements, Terms, Privacy, Support.
const KEYS = ['acknowledgements', 'terms', 'privacy', 'support'] as const;

const langOf = (file: string): Lang => {
  const first = file.split('/')[0];
  return (LANGS as readonly string[]).includes(first) ? (first as Lang) : 'en';
};

/** The `<footer>` element of a page. */
const footerOf = (html: string) => /<footer\b[\s\S]*?<\/footer>/.exec(html)?.[0] ?? '';

/** The `[href, text]` of every link of a fragment. */
const links = (html: string) =>
  [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => [
    /href="([^"]*)"/.exec(m[1])?.[1],
    m[2].replace(/<[^>]*>/g, '').trim(),
  ]);

describe('the footer of every page', () => {
  for (const file of htmlFiles()) {
    const lang = langOf(file);
    const t = STRINGS[lang];
    const footer = footerOf(read(file));

    it(`${file}: links the legal notice, Acknowledgements, Terms, Privacy and Support in ${lang}, in that order`, () => {
      expect(links(footer)).toEqual([
        [pagePath(lang, 'legal'), t.legal],
        ...KEYS.map((key) => [pagePath(lang, key), t.footer[key]]),
      ]);
    });

    it(`${file}: the page links sit in a labelled navigation landmark`, () => {
      const nav = /<nav\b([^>]*)>([\s\S]*?)<\/nav>/.exec(footer);
      expect(nav?.[1]).toContain(`aria-label="${t.footerNav}"`);
      expect(links(nav?.[2] ?? '')).toHaveLength(5);
    });
  }
});
