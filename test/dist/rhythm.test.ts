import { describe, expect, it } from 'vitest';
import { builtRules, read, type Rule } from './helpers';

const rules = builtRules();

/** The desktop layout's media query, as written (`min-width: 64rem`) or as built (`width>=64rem`). */
const DESKTOP = /@media[^{]*(min-width:\s*64rem|width>=64rem)/;
const desktop = (r: Rule) => r.at.some((a) => DESKTOP.test(a));
const plain = (r: Rule) => r.at.every((a) => !a.startsWith('@media'));
/** The rules styling `selector` exactly (one selector of a list counts). */
const of = (selector: string, rs = rules) =>
  rs.filter((r) => r.selector.split(',').some((s) => s.trim() === selector));
const rem = (body: string, prop: string) => {
  const m = new RegExp(`(?:^|;)${prop}:([^;]*)`).exec(body);
  return m ? m[1].trim() : undefined;
};

describe('the home rhythm (user check 5: "réduis les espaces entre les textes")', () => {
  it('is parsed with its media queries', () => {
    expect(rules.length).toBeGreaterThan(100);
    expect(rules.some(desktop)).toBe(true);
  });

  it('no part of the home is forced to a full screen (no 100svh, 100vh, 100dvh)', () => {
    const home = rules.filter((r) =>
      /\.(opening|scene|stage|steps|step)\b/.test(r.selector),
    );
    expect(home.length).toBeGreaterThan(10);
    for (const r of home) {
      for (const m of r.body.matchAll(/(\d+(?:\.\d+)?)(s|d|l)?vh/g)) {
        expect(Number(m[1]), `${r.selector} {${r.body}}`).toBeLessThanOrEqual(60);
      }
    }
  });

  it('the opening is as tall as its text plus air: no min-height', () => {
    for (const r of of('.opening')) expect(rem(r.body, 'min-height'), r.selector).toBeUndefined();
  });

  it('a scene follows its content: at least 60svh from 64rem, no minimum on a phone', () => {
    const minimums = rules.filter(
      (r) => /\.scene(__grid)?\b/.test(r.selector) && rem(r.body, 'min-height') !== undefined,
    );
    expect(minimums.map((r) => [r.selector, rem(r.body, 'min-height'), desktop(r)])).toEqual([
      ['.scene__grid', '60svh', true],
    ]);
  });

  it('about 3rem between two scenes (1.5rem above and below each)', () => {
    const scene = of('.scene', rules.filter(plain));
    const padding = scene.map((r) => rem(r.body, 'padding')).filter(Boolean);
    expect(padding).toHaveLength(1);
    expect(padding[0]?.split(/\s+/)[0]).toBe('1.5rem');
    expect(rules.filter((r) => desktop(r) && of('.scene', [r]).length && /padding/.test(r.body))).toEqual([]);
  });

  // The user, on the in-progress rhythm: "un peu plus d'espace quand même".
  // Halved are the empty bands (between scenes, around the text column);
  // the reading spacing inside a scene stays clear, in em of the body.
  it('reading gaps inside a scene: 1.25em under the title block, 0.75em between paragraphs, the eyebrow as on the pages', () => {
    const first = of('.steps>:first-child', rules.filter(desktop));
    expect(first.map((r) => rem(r.body, 'margin-top'))).toEqual(['1.25em']);
    const between = of('.steps>*').map((r) => rem(r.body, 'margin-bottom') ?? rem(r.body, 'margin'));
    expect(between.filter(Boolean)).toEqual(['0 0 .75em', '.75em']);
    expect(rules.filter((r) => /\.scene\b[^,]*\.eyebrow/.test(r.selector))).toEqual([]);
    const phoneTitle = of('.step--title', rules.filter(plain)).map((r) => rem(r.body, 'padding-block'));
    expect(phoneTitle.filter(Boolean)).toEqual(['0 1.375rem']);
  });

  it('the empty bands are in rem, at most 1.5rem: around the text column, above and below the title', () => {
    const bands = rules.filter((r) =>
      /(^|,)\s*(\.scene__text|\.step--title|\.step--link)\s*(,|$)/.test(r.selector),
    );
    expect(bands.length).toBeGreaterThan(3);
    for (const r of bands) {
      for (const prop of ['padding', 'padding-block', 'margin']) {
        const value = rem(r.body, prop);
        if (value === undefined) continue;
        for (const part of value.split(/\s+/)) {
          const where = `${r.selector} ${prop}:${value}`;
          expect(part, where).toMatch(/^(0|\d*\.?\d+rem)$/);
          expect(parseFloat(part), where).toBeLessThanOrEqual(1.5);
        }
      }
    }
  });

  it('S1: the heading is pinned only in a scene story.ts marks tall; the visual stays sticky in every scene', () => {
    const pinned = rules.filter(
      (r) => r.selector.includes('.step--title') && /position:sticky/.test(r.body),
    );
    expect(pinned.map((r) => [r.selector, desktop(r)])).toEqual([
      ['.scene[data-tall] .step--title', true],
    ]);
    const stage = of('.stage', rules.filter(desktop)).filter((r) => /top:/.test(r.body));
    expect(stage.length).toBeGreaterThan(0);
    const sticky = of('.stage', rules.filter(plain)).some((r) => /position:sticky/.test(r.body));
    expect(sticky, 'the visual is sticky in every scene, tall or not').toBe(true);
  });
});

describe('story.ts marks a tall scene', () => {
  it('measures each scene text against the screen, on load and on resize', () => {
    const html = read('index.html');
    const src = /<script\b[^>]*\bsrc="\/([^"]*)"/.exec(html)?.[1] ?? '';
    const js = read(src);
    expect(js).toContain('data-tall');
    expect(js).toContain('ResizeObserver');
    expect(js).toMatch(/["'`]resize["'`]/);
  });
});

// User check 10: "La police de texte n'est pas bonne, ça devrait être la
// même dans chacune des pages", then "même taille partout". The family was
// already Inter everywhere; the pages' prose takes the scenes' body size.
describe('one body text on every page (user check 10)', () => {
  const size = (rs: Rule[]) => rs.map((r) => rem(r.body, 'font-size')).filter(Boolean);
  const lineHeight = (rs: Rule[]) => rs.map((r) => rem(r.body, 'line-height')).filter(Boolean);

  it('the prose and a desktop scene paragraph share one size and line height', () => {
    const scene = of('.steps>*', rules.filter(desktop));
    const prose = of('.prose', rules.filter(plain));
    expect(size(scene)).toHaveLength(1);
    expect(size(prose)).toEqual(size(scene));
    expect(lineHeight(prose)).toEqual(['1.6']);
    expect(lineHeight(scene)).toEqual(['1.6']);
  });

  it('that size is the scenes\' clamp, 1.125rem to 1.375rem (18px on a phone, like the glass cards)', () => {
    const token = rules
      .filter((r) => r.selector === ':root')
      .map((r) => rem(r.body, '--text-body'))
      .filter(Boolean);
    expect(size(of('.prose', rules.filter(plain)))).toEqual(['var(--text-body)']);
    expect(token).toEqual(['clamp(1.125rem, 1rem + .4vw, 1.375rem)']);
    expect(size(of('.steps>*', rules.filter(plain)))).toEqual(['1.125rem']);
  });

  it('the ledes (the opening, each masthead) are not smaller: the same size', () => {
    expect(size(of('.opening__text>h1+p'))).toEqual(['var(--text-body)']);
    expect(size(of('.masthead__text>p'))).toEqual(['var(--text-body)']);
  });

  it('no rule gives the prose, its paragraphs or its list items another size or family', () => {
    const inside = rules.filter((r) =>
      /^\.prose(\s*>\s*\*\s*\+\s*\*|\s+(p|li|ul|ol))?$/.test(r.selector.trim()),
    );
    for (const r of inside) {
      if (r.selector.trim() === '.prose') continue;
      expect(rem(r.body, 'font-size'), r.selector).toBeUndefined();
      expect(rem(r.body, 'font-family'), r.selector).toBeUndefined();
    }
  });
});
