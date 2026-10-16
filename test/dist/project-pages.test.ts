import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/lib/languages';
import { pagePath } from '../../src/lib/url';
import { builtRules, DIST, of, plain, read, value } from './helpers';

// User check 6: each home scene leads to a page presenting the project with
// its link, shown as the gold pill. User check 12: "dans chaque page on a le
// bouton en bas, mets-le dans le header, ce sera plus visible": the pill
// sits in the masthead, under the lede, and no longer at the bottom.
const SERVICES = {
  tipitaka: 'https://apps.apple.com/app/id6760995639',
  search: 'https://search.palicanon.app',
  viz: 'https://map.palicanon.app',
  learn: 'https://learn.palicanon.app',
} as const;
const fileOf = (lang: (typeof LANGS)[number], page: string) =>
  `${pagePath(lang, page).slice(1)}index.html`;
/** The masthead card, and what follows it up to the end of the main. */
const partsOf = (html: string) => {
  const start = html.indexOf('<div class="masthead"');
  const prose = html.indexOf('<div class="prose', start);
  return {
    masthead: html.slice(start, prose),
    rest: html.slice(prose, html.indexOf('</main>', prose)),
  };
};
const css = readdirSync(join(DIST, '_astro'))
  .filter((f) => f.endsWith('.css'))
  .map((f) => read(`_astro/${f}`))
  .join('\n');
const rulesFor = (selector: RegExp) =>
  [...css.matchAll(/([^{}]*)\{([^{}]*)\}/g)]
    .filter((m) => m[1].split(',').some((s) => selector.test(s.trim())))
    .map((m) => m[2]);
const rules = builtRules();
const PILL = /^\.masthead__link p:has\(>\s*a:only-child\)\s*>\s*a$/;
const PILL_HOVER = /^\.masthead__link p:has\(>\s*a:only-child\)\s*>\s*a:hover$/;

describe('the four project pages: the service link as the gold pill in the masthead', () => {
  for (const lang of LANGS) {
    for (const [page, href] of Object.entries(SERVICES)) {
      it(`${lang}/${page}: the one link to ${href} sits under the lede, none after the masthead`, () => {
        const { masthead, rest } = partsOf(read(fileOf(lang, page)));
        const link = /<div class="masthead__link">\s*<p>([\s\S]*?)<\/p>\s*<\/div>/.exec(masthead);
        expect(link, 'the masthead holds the link paragraph').not.toBeNull();
        const children = [...(link?.[1] ?? '').matchAll(/<([a-z]+)\b[^>]*>/g)].map((m) => m[1]);
        expect(children).toEqual(['a']);
        expect(link?.[1]).toContain(`href="${href}"`);
        expect(masthead.indexOf('</h1>')).toBeLessThan(masthead.indexOf('masthead__link'));
        // A cell of the masthead grid of its own (not inside the text), so a
        // desktop can give it a full-width row under the lede and the drawing.
        const text = /<div class="masthead__text">[\s\S]*?<\/div>/.exec(masthead)?.[0] ?? '';
        expect(text).not.toContain('masthead__link');
        expect(rest).not.toContain(`href="${href}"`);
      });
    }
  }

  it('/tipitaka/ keeps its slider, in every language', () => {
    for (const lang of LANGS) expect(read(fileOf(lang, 'tipitaka'))).toContain('data-slider');
  });

  it('no other page moves a link into its masthead (an inline link in a sentence stays a link)', () => {
    for (const lang of LANGS) {
      for (const page of ['about', 'support', 'legal', 'blog', 'blog/welcome']) {
        expect(read(fileOf(lang, page)), `${lang}/${page}`).not.toContain('masthead__link');
      }
    }
  });

  // User check 13: "sur tel, chaque bouton centré". On a phone the pill is
  // its own cell of the one-column masthead, under the lede: centred in it.
  it('on a phone the pill is centred under the lede, in no second column', () => {
    const phone = of('.masthead__link', rules.filter(plain));
    expect(phone.map((r) => value(r.body, 'justify-self'))).toEqual(['center']);
    expect(phone.map((r) => value(r.body, 'grid-column')).filter(Boolean)).toEqual([]);
  });

  // User check 15 (at about 2000px): "Le bouton pour le download. Il doit
  // être au centre et visible". From 48rem the pill leaves the right column
  // (check 12's addendum) for a full-width row of its own, under the lede
  // and the drawing, centred, 2rem below them; the drawing spans the three
  // text rows and sits level with the lede.
  it('from 48rem the pill takes its own full-width row under the lede and the drawing, centred', () => {
    const wide = rules.filter((r) => r.at.some((a) => /width>=48rem/.test(a)));
    const grid = wide.find((r) => r.selector === '.masthead:has(>.masthead__link)');
    expect(value(grid?.body ?? '', 'grid-template-areas')).toMatch(
      /^"eyebrow drawing"\s*"title drawing"\s*"lede drawing"\s*"link link"$/,
    );
    const project = (s: string) => of(`.masthead:has(>.masthead__link)>${s}`, wide);
    expect(project('.masthead__text').map((r) => value(r.body, 'display'))).toEqual(['contents']);
    expect(project('.masthead__text>h1+p').map((r) => value(r.body, 'grid-area'))).toEqual(['lede']);
    const drawing = project('.masthead__drawing');
    // Lightning CSS folds align-self and justify-self into place-self (align first).
    const alignSelf = (body: string) => value(body, 'align-self') ?? value(body, 'place-self')?.split(/\s+/)[0];
    expect(drawing.map((r) => alignSelf(r.body))).toEqual(['end']);
    expect(drawing.map((r) => value(r.body, 'margin-bottom'))).toEqual(['0']);
    const link = project('.masthead__link');
    expect(link.map((r) => value(r.body, 'grid-area'))).toEqual(['link']);
    expect(link.map((r) => value(r.body, 'justify-self'))).toEqual(['center']);
    expect(link.map((r) => value(r.body, 'margin-top'))).toEqual(['2rem']);
    expect(link.map((r) => alignSelf(r.body)).filter(Boolean)).toEqual([]);
  });

  // User check 15: the masthead's pill is the large size of the pill family,
  // at every width (a phone keeps its centred place, check 13). Same
  // specificity as chrome.css's .pill geometry, so it must come later.
  it('the masthead pill is large at every width, later than the .pill geometry it overrides', () => {
    const pill = '.masthead__link p:has(>a:only-child)>a';
    const large = rules.findLastIndex(
      (r) => plain(r) && of(pill, [r]).length > 0 && value(r.body, 'min-height') === '3.25rem',
    );
    expect(large, 'a plain rule sizes the pill 3.25rem tall').toBeGreaterThan(-1);
    expect(value(rules[large].body, 'font-size')).toBe('1.0625rem');
    expect(value(rules[large].body, 'padding')).toMatch(/^0?\.875rem 2rem$/);
    const geometry = rules.findIndex((r) => of('.pill', [r]).length > 0 && value(r.body, 'min-height') === '2.75rem');
    expect(geometry, "chrome.css's .pill geometry").toBeGreaterThan(-1);
    expect(large).toBeGreaterThan(geometry);
    const resized = of(pill, rules.filter((r) => !plain(r))).filter((r) =>
      ['min-height', 'padding', 'font-size'].some((p) => value(r.body, p) !== undefined),
    );
    expect(resized, 'no media query sizes the pill back').toEqual([]);
  });

  // User check 13: "sur tel, chaque bouton centré". On a phone the pill is
  // its own cell of the one-column masthead, under the lede: centred in it.
  it('on a phone the pill is centred under the lede', () => {
    const phone = of('.masthead__link', rules.filter(plain));
    expect(phone.map((r) => value(r.body, 'justify-self'))).toEqual(['center']);
  });

  it('the CSS draws that link as the gold pill: shape, gold fill, no underline, its hover', () => {
    const base = rulesFor(PILL).join(';');
    expect(base).toMatch(/border-radius:999px/);
    expect(base).toMatch(/background:var\(--hl\)/);
    expect(base).toMatch(/color:var\(--on-hl\)/);
    expect(base).toMatch(/text-decoration:none/);
    expect(base).toMatch(/min-height:2\.75rem/);
    const hover = rulesFor(PILL_HOVER).join(';');
    expect(hover).toMatch(/background:var\(--hl-hover\)/);
    expect(hover).toMatch(/color:var\(--on-hl\)/);
  });
});

// User check 8: "il serait mieux de décrire le teaching puis l'app". A
// project page with a slider opens on its description: the masthead (h1,
// lede and, since check 12, the pill), the whole body text, then the slider.
describe('/tipitaka/: the masthead with its pill, the description, then the slider', () => {
  for (const lang of LANGS) {
    it(`${lang}: masthead and pill, body sections, slider, nothing after`, () => {
      const html = read(fileOf(lang, 'tipitaka'));
      const main = html.slice(html.indexOf('<main'), html.indexOf('</main>'));
      const at = (needle: string) => main.indexOf(needle);
      const h2s = [...main.matchAll(/<h2\b/g)].map((m) => m.index ?? -1);
      const slider = at('<div class="page-slider"');
      const pill = at(`href="${SERVICES.tipitaka}"`);
      expect(h2s.length).toBeGreaterThanOrEqual(2);
      expect(at('<div class="masthead"')).toBeLessThan(at('<h1'));
      expect(at('<h1')).toBeLessThan(Math.min(...h2s));
      expect(Math.max(...h2s)).toBeLessThan(slider);
      // The body's lists (the app's features) come before the slider (whose cards are a list too).
      expect(main.slice(at('<div class="prose'), slider)).toContain('</ul>');
      expect(at('<h1')).toBeLessThan(pill);
      expect(pill).toBeLessThan(Math.min(...h2s));
      const after = main.slice(slider).replace(/<div class="page-slider"[\s\S]*?<\/ul>/, '');
      expect(after.match(/<p>/g) ?? [], 'nothing after the slider').toHaveLength(0);
      expect(after).not.toMatch(/<h2\b|<ul\b/);
    });
  }
});
