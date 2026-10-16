import { describe, expect, it } from 'vitest';
import { builtRules, inMedia, of, plain, read, value } from './helpers';

// Live trial 5, the phone pass (the user, 2026-10-16: "le rendu n'est pas
// top sur tel"), over the built CSS.
const rules = builtRules();
const desktop = inMedia(/width>=64rem/);

describe('on a phone every button is centred (user check 13)', () => {
  it("a scene's gold button is centred under its glass cards; from 64rem at the text's start, as before", () => {
    const phone = of('.step--link', rules.filter(plain)).map((r) => value(r.body, 'text-align'));
    expect(phone.filter(Boolean)).toEqual(['center']);
    const wide = of('.step--link', rules.filter(desktop)).map((r) => value(r.body, 'text-align'));
    expect(wide.filter(Boolean)).toEqual(['start']);
  });
});

// The user's phone showed the browser's blue selection on the tapped brand
// line: the selection is drawn in the palette, light and dark.
describe('the selection in the palette', () => {
  const selection = rules.filter((r) => r.selector.includes('::selection'));
  const token = (name: string) =>
    rules.filter((r) => r.selector === ':root').map((r) => value(r.body, name)).filter(Boolean);
  const bodyOf = (part: string) =>
    selection.filter((r) => r.selector.split(',').some((s) => s.trim() === part)).map((r) => r.body);

  it('on the page: a gold tint, one for each theme', () => {
    expect(bodyOf('::selection').join(';')).toMatch(/background-color:var\(--selection\)/);
    // The theme's gold (#c9a84c) at two strengths: light-dark(light, dark).
    expect(token('--selection')).toEqual([expect.stringMatching(/^light-dark\(#c9a84c[0-9a-f]{2},#c9a84c[0-9a-f]{2}\)$/)]);
  });

  it('on the deep card (the opening, every masthead): a parchment tint, the text in its light ink', () => {
    for (const card of ['.opening ::selection', '.masthead ::selection']) {
      const body = bodyOf(card).join(';');
      expect(body, card).toMatch(/background-color:var\(--selection-deep\)/);
      expect(body, card).toMatch(/color:var\(--on-deep\)/);
    }
    expect(token('--selection-deep')).toEqual([expect.stringMatching(/^#f0e8df[0-9a-f]{2}$/)]);
  });

  it('on the gold (the highlighter band, the gold buttons): a parchment tint over the gold, the ink kept', () => {
    const hl = selection.filter((r) => /mark/.test(r.selector) && /pill--gold/.test(r.selector));
    expect(hl).toHaveLength(1);
    expect(hl[0].body).toMatch(/background-color:var\(--selection-hl\)/);
    expect(hl[0].body).toMatch(/color:var\(--on-hl\)/);
    // After the deep card's rule, at the same weight: a band in the opening keeps it.
    const at = (r: (typeof rules)[number]) => rules.indexOf(r);
    const deep = selection.find((r) => r.selector.includes('.opening ::selection'));
    expect(deep && at(hl[0]) > at(deep)).toBe(true);
  });
});

// P1: on a phone "Tipiṭaka sur iPhone" wraps; at the display face's 0.95
// the dot under Ṭ fell between the lines and read as an apostrophe
// ("SUR'IPHONE"). A heading with a marked letter and no band gets room
// too (bare-marks), less than under a band (has-marks, 1.5): the next
// line's capitals start (line height - 0.86) em under the baseline, and a
// mark reaches about 0.25em under it or above a capital (0.33em for the
// Vietnamese stacks): 1.25 keeps them apart.
describe('a heading with marks and no band gets room for them (P1)', () => {
  const h1 = (file: string) => /<h1\b[^>]*>/.exec(read(file))?.[0] ?? '';

  it('the project mastheads with a marked letter, in every language', () => {
    for (const file of ['tipitaka/index.html', 'fr/tipitaka/index.html', 'vi/tipitaka/index.html', 'fr/learn/index.html', 'fr/about/index.html']) {
      expect(h1(file), file).toContain('bare-marks');
      expect(h1(file), file).not.toContain('has-marks');
    }
  });

  it('a heading with no mark stays as it is; one with a band keeps has-marks only', () => {
    expect(h1('about/index.html')).not.toMatch(/marks/);
    expect(h1('vi/index.html')).toContain('has-marks');
    expect(h1('vi/index.html')).not.toContain('bare-marks');
  });

  it('the CSS gives it a line height of at least 1.25, for the three heading kinds', () => {
    const bare = rules.filter((r) => r.selector.includes('.bare-marks'));
    for (const part of ['.display', '.opening__text>h1', '.masthead__text>h1']) {
      expect(bare.some((r) => r.selector.includes(part)), part).toBe(true);
    }
    for (const r of bare) expect(Number(value(r.body, 'line-height'))).toBeGreaterThanOrEqual(1.25);
  });
});

// P2: as a scene leaves, its slider or drawing fades out (stage-out); its
// glow stayed at full strength, a gold blob over a ghost of the
// screenshots. The glow runs the visual's own animations.
describe('the glow fades with its visual (P2)', () => {
  it('the stage glow is animated in the same rule as the drawing and the slider', () => {
    const stage = rules.filter((r) => r.selector.split(',').some((s) => s.trim() === '.stage>.slider'));
    expect(stage).toHaveLength(1);
    expect(stage[0].selector.split(',').map((s) => s.trim())).toContain('.stage>.stage__glow');
    expect(value(stage[0].body, 'animation-name')).toBe('stage-in,stage-out');
  });

  // On a phone a slider is not sticky: it ends its scene, so the scene's
  // exit came while it was still the part in view, and it faded to a blank
  // (after-fr-*-phone-home-03). It rises in, then scrolls away whole.
  it('on a phone a slider and its glow only rise in, they do not fade out', () => {
    // Written `(width < 64rem)`; built as `not all and (width>=64rem)`.
    const below = inMedia(/width<64rem|not all and \(width>=64rem\)/);
    const phone = rules.filter(below).filter((r) => r.selector.includes('.slider'));
    expect(phone.length).toBeGreaterThan(0);
    for (const part of ['.stage>.slider', '.stage>.stage__glow']) {
      const rule = phone.find((r) => r.selector.split(',').some((s) => s.trim().endsWith(part)));
      expect(rule, part).toBeDefined();
      expect(value(rule?.body ?? '', 'animation-name'), part).toBe('stage-in');
    }
  });
});

// P3: on a phone a drawing scene's stage was 42svh, its drawing centred and
// stuck at the inset, under the bar: 84 px of blank between the teaching
// title and its drawing, and the hand's top under the bar once stuck.
describe('a drawing scene on a phone (P3)', () => {
  it('the stage sticks under the bar and is as tall as its drawing', () => {
    const stage = of('.stage', rules.filter(plain));
    expect(stage.map((r) => value(r.body, 'top')).filter(Boolean)).toEqual([
      'calc(var(--bar-h) + 2 * var(--inset))',
    ]);
    expect(stage.map((r) => value(r.body, 'height')).filter(Boolean)).toEqual(['auto']);
  });

  it('a tall drawing (the hand) is bounded by the screen height on a phone, not from 64rem', () => {
    const phone = of('.art__drawing', rules.filter(plain)).map((r) => value(r.body, 'max-height'));
    expect(phone.filter(Boolean)).toEqual(['30svh']);
    const wide = of('.art__drawing', rules.filter(desktop)).map((r) => value(r.body, 'max-height'));
    expect(wide.filter(Boolean)).toEqual(['none']);
  });
});
