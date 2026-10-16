import { describe, expect, it } from 'vitest';
import { LANGS, type Lang } from '../../src/lib/languages';
import { LANGUAGE_NAMES, STRINGS } from '../../src/lib/strings';
import { pagePath } from '../../src/lib/url';
import { exists, htmlFiles, read } from './helpers';

const fileOf = (path: string) => `${path.slice(1)}index.html`;

/** The language of a dist file and its translation key (`index`, `about`, `blog/welcome`). */
function pageOf(file: string): { lang: Lang; key: string } {
  const parts = file.replace(/(^|\/)?index\.html$|\.html$/, '').split('/').filter(Boolean);
  const lang = (LANGS as readonly string[]).includes(parts[0]) ? (parts.shift() as Lang) : 'en';
  const key = parts.join('/') || 'index';
  return { lang, key: key === '404' ? 'index' : key };
}

/** The markup between an opening tag matching `start` and the next `end`. */
function between(html: string, start: RegExp, end: string): string {
  const at = html.search(start);
  return at === -1 ? '' : html.slice(at, html.indexOf(end, at) + end.length);
}

/** The languages a page exists in: those whose translation is a file of dist. */
const availableOf = (key: string) => LANGS.filter((l) => exists(fileOf(pagePath(l, key))));

/** Every `<a …>` opening tag of a fragment. */
const anchors = (html: string) => [...html.matchAll(/<a\b[^>]*>/g)].map((m) => m[0]);

describe('the header of every page', () => {
  for (const file of htmlFiles()) {
    const { lang, key } = pageOf(file);
    const t = STRINGS[lang];
    const html = read(file);
    const header = between(html, /<header\b/, '</header>');
    const others = availableOf(key).filter((l) => l !== lang);

    it(`${file}: the brand (after the back link, but on a home) and the language toggle only, no page links, no Menu pill`, () => {
      const links = anchors(header).filter((a) => !a.includes('class="back"'));
      expect(links[0]).toContain(`href="${pagePath(lang, 'index')}"`);
      expect(links.slice(1).every((a) => a.includes('hreflang='))).toBe(true);
      expect(links).toHaveLength(1 + others.length);
      expect(header).not.toContain('popovertarget="menu"');
      expect(header).not.toContain('id="menu"');
      expect(header).not.toContain('aria-current="page"');
    });

    it(`${file}: a toggle button showing ${LANGUAGE_NAMES[lang]}, opening the list of the others`, () => {
      const button = /<button\b([^>]*)>([\s\S]*?)<\/button>/.exec(header);
      expect(button?.[1]).toContain('popovertarget="langs"');
      expect(button?.[2]).toMatch(new RegExp(`<span[^>]*lang="${lang}"[^>]*>${LANGUAGE_NAMES[lang]}</span>`));
      expect(button?.[2]).toContain(`>${t.language}`);
      expect(button?.[2]).toMatch(/<svg\b[^>]*aria-hidden="true"/);
      const list = /<nav\b([^>]*)>([\s\S]*?)<\/nav>/.exec(header);
      expect(list?.[1]).toContain('id="langs"');
      expect(list?.[1]).toMatch(/\spopover(\s|>|=|$)/);
      expect(list?.[1]).toContain(`aria-label="${t.language}"`);
      const items = [...(list?.[2] ?? '').matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)];
      expect(items.map((m) => /hreflang="([a-z]+)"/.exec(m[1])?.[1])).toEqual(others);
      for (const [i, l] of others.entries()) {
        expect(items[i][1]).toContain(`lang="${l}"`);
        expect(items[i][1]).toContain(`href="${pagePath(l, key)}"`);
        expect(items[i][2].trim()).toBe(LANGUAGE_NAMES[l]);
      }
    });

    it(`${file}: no segmented pill left`, () => {
      expect(html).not.toContain('langs__segment');
      expect(html).not.toContain('langs__pill');
      expect(html).not.toContain('aria-current="true"');
    });
  }
});

// User check 14: "il faudrait une flèche pour le retour arrière". Every
// page but the three homes shows, at the left of the brand, a round link
// with a chevron to its language's home: a plain link, no history.back.
describe('the back link of every page but the home', () => {
  const HOMES = ['index.html', 'fr/index.html', 'vi/index.html'];
  for (const file of htmlFiles()) {
    const { lang } = pageOf(file);
    const header = between(read(file), /<header\b/, '</header>');
    const back = /<a\b([^>]*\bclass="back"[^>]*)>([\s\S]*?)<\/a>/.exec(header);
    if (HOMES.includes(file)) {
      it(`${file}: none on a home`, () => {
        expect(header).not.toContain('class="back"');
      });
      continue;
    }
    it(`${file}: a chevron link to ${pagePath(lang, 'index')}, named in ${lang}, before the brand`, () => {
      expect(back, 'the back link').not.toBeNull();
      expect(back?.[1]).toContain(`href="${pagePath(lang, 'index')}"`);
      expect(back?.[1]).not.toMatch(/onclick|history|tabindex="-1"|aria-hidden/);
      // The name as written in the HTML (Astro escapes the apostrophe).
      const name = /<span class="sr-only">([^<]*)<\/span>/.exec(back?.[2] ?? '')?.[1]?.replaceAll('&#39;', "'");
      expect(name).toBe(STRINGS[lang].back);
      expect(back?.[2]).toMatch(/<svg\b[^>]*aria-hidden="true"[^>]*>\s*<path\b/);
      expect(header.indexOf('class="back"')).toBeLessThan(header.indexOf('class="brand"'));
      expect(header.match(/class="back"/g)).toHaveLength(1);
    });
  }

  it('the 404 has it too, to the English home', () => {
    expect(between(read('404.html'), /<header\b/, '</header>')).toMatch(/<a\b[^>]*href="\/"[^>]*class="back"|<a\b[^>]*class="back"[^>]*href="\/"/);
  });
});

describe('the footer of every page', () => {
  for (const file of htmlFiles()) {
    const { lang } = pageOf(file);
    it(`${file}: the wordmark and the legal notice, its one link`, () => {
      const footer = between(read(file), /<footer\b/, '</footer>');
      expect(footer).toContain('>PaliCanon<');
      const links = [...footer.matchAll(/<a\b[^>]*>([^<]*)<\/a>/g)];
      expect(links).toHaveLength(1);
      expect(links[0][0]).toContain(`href="${pagePath(lang, 'legal')}"`);
      expect(links[0][1].trim()).toBe(STRINGS[lang].legal);
      expect(footer).not.toContain('hreflang');
    });
  }
});

describe('the slider images', () => {
  for (const [lang, page] of [
    ['en', 'index'],
    ['vi', 'tipitaka'],
  ] as const) {
    it(`${lang}/${page}: every card but the first loads lazily, each with its size`, () => {
      const html = read(fileOf(pagePath(lang, page)));
      const start = html.indexOf('data-slider');
      const slider = html.slice(start, html.indexOf('</ul>', start));
      const imgs = [...slider.matchAll(/<img\b[^>]*>/g)].map((m) => m[0]);
      expect(imgs.length).toBeGreaterThan(2);
      expect(imgs.map((img) => /loading="(\w+)"/.exec(img)?.[1])).toEqual([
        'eager',
        ...imgs.slice(1).map(() => 'lazy'),
      ]);
      for (const img of imgs) expect(img).toMatch(/width="\d+"[\s\S]*height="\d+"|height="\d+"[\s\S]*width="\d+"/);
    });
  }
});
