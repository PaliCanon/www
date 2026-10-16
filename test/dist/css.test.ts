import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIST, builtRules, inMedia, read, value } from './helpers';

/** Every rule (`selector{declarations}`) of the built stylesheets, keyframe steps included. */
const rules = readdirSync(join(DIST, '_astro'))
  .filter((f) => f.endsWith('.css'))
  .flatMap((f) => [...read(`_astro/${f}`).matchAll(/([^{}]*)\{([^{}]*)\}/g)])
  .map((m) => ({ selector: m[1].trim(), body: m[2] }));

describe('the built CSS keeps what the browsers need', () => {
  it('is found', () => {
    expect(rules.length).toBeGreaterThan(100);
  });

  it('every glass rule keeps the unprefixed backdrop-filter (Chrome reads no -webkit- one)', () => {
    const glass = rules.filter((r) => r.body.includes('backdrop-filter:'));
    expect(glass.length).toBeGreaterThan(4);
    const bare = glass.filter((r) => !/(^|[;{\s])backdrop-filter:/.test(r.body));
    expect(bare.map((r) => r.selector)).toEqual([]);
  });

  it('no animation shorthand carries a scroll() or view() timeline (invalid there)', () => {
    const bad = rules.filter((r) =>
      [...r.body.matchAll(/(?:^|;)animation:([^;]*)/g)].some((m) => /\b(scroll|view)\(/.test(m[1])),
    );
    expect(bad.map((r) => r.selector)).toEqual([]);
  });

  // S1, after user check 5: a scene's heading is pinned only where its
  // text column is taller than the screen (story.ts marks the scene
  // data-tall), and never fades out with the steps.
  it("a scene's heading is pinned only in a tall scene, and only rises in", () => {
    const pinned = rules.filter(
      (r) => r.selector.includes('.step--title') && r.body.includes('position:sticky'),
    );
    expect(pinned).toHaveLength(1);
    expect(pinned[0].selector).toContain('[data-tall]');
    const fading = rules.filter(
      (r) => r.body.includes('reveal-out') && /(^|,)\.step(,|$)/.test(r.selector),
    );
    expect(fading.map((r) => r.selector)).toEqual([]);
  });

  // O2: in Vietnamese a capital carries stacked marks up to about 0.33em
  // above its cap height (the hook of Ở, measured in the vi capture). Anton
  // (ascent 1.18em, descent 0.33em, cap 0.86em): the band ends 1.44em under
  // the top of its content box, and the next line's marks start about
  // 0.01em under the top of its own; they clear the band (and the comma
  // after it) only when the line height is at least 1.45.
  it('a Vietnamese heading with a highlight is tall enough for the band and the marks', () => {
    const vi = rules.filter((r) => r.selector.includes(':lang(vi)') && r.selector.includes(':has(mark)'));
    const heights = vi.map((r) => Number(/line-height:([\d.]+)/.exec(r.body)?.[1] ?? 0));
    expect(heights.length).toBeGreaterThan(0);
    for (const h of heights) expect(h).toBeGreaterThanOrEqual(1.45);
    for (const part of ['.display', '.opening__text>h1', '.masthead__text>h1']) {
      expect(vi.some((r) => r.selector.includes(part)), part).toBe(true);
    }
  });

  // O2 in every language: a heading with a highlight whose text holds a
  // letter with a mark, above (À É Ā, the Vietnamese ones) or below (ṭ ạ ç),
  // gets the same room, by the class the build sets (has-marks).
  it('a highlighted heading with marks, in any language, gets the same room', () => {
    const any = rules.filter((r) => r.selector.includes('.has-marks'));
    expect(any.length).toBeGreaterThan(0);
    for (const r of any) {
      expect(Number(/line-height:([\d.]+)/.exec(r.body)?.[1] ?? 0)).toBeGreaterThanOrEqual(1.45);
    }
    for (const part of ['.display', '.opening__text>h1', '.masthead__text>h1']) {
      expect(any.some((r) => r.selector.includes(part)), part).toBe(true);
    }
  });

  // F1: story.ts disables previous on the first card and next on the last;
  // a disabled button reads as such and does not answer the pointer.
  it('a disabled slider button is dimmed, with no hover look', () => {
    const disabled = rules.filter((r) => r.selector === '.slider__button:disabled');
    expect(disabled).toHaveLength(1);
    expect(disabled[0].body).toMatch(/(^|;)opacity:0?\.4(;|$)/);
    expect(disabled[0].body).toMatch(/(^|;)cursor:default(;|$)/);
    const hover = rules.filter((r) => r.selector.startsWith('.slider__button:hover'));
    expect(hover.map((r) => r.selector)).toEqual(['.slider__button:hover:not(:disabled)']);
  });

  // F3: the glass keyframes (chrome.css) animate the bar's four colour roles;
  // registered as colours they interpolate with the background instead of
  // flipping at the midpoint.
  it("the bar's colour roles are registered as colours", () => {
    for (const name of ['--bar-ink', '--bar-chip', '--bar-edge', '--bar-ring']) {
      const registered = rules.filter((r) => r.selector === `@property ${name}`);
      expect(registered, name).toHaveLength(1);
      expect(registered[0].body, name).toMatch(/(^|;)syntax:\s*["']<color>["'](;|$)/);
      expect(registered[0].body, name).toMatch(/(^|;)inherits:\s*true(;|$)/);
      expect(registered[0].body, name).toMatch(/(^|;)initial-value:/);
    }
  });

  // F4: under reduced motion nothing moves on hover or on open: the bar, the
  // slider's buttons, the language toggle's arrow, the pills and the
  // masthead's gold link.
  // Each stop comes after the rule it overrides: same specificity, so the
  // later one wins.
  it('reduced motion stops every transition of the chrome', () => {
    const all = builtRules();
    const reduce = inMedia(/prefers-reduced-motion:\s*reduce/);
    const names = (r: (typeof all)[number]) => r.selector.split(',').map((s) => s.trim());
    for (const selector of [
      '.site-header',
      '.slider__button',
      '.langs__button svg',
      '.pill',
      '.masthead__link p:has(>a:only-child)>a',
    ]) {
      const stop = all.findLastIndex(
        (r) => reduce(r) && value(r.body, 'transition') === 'none' && names(r).includes(selector),
      );
      expect(stop, selector).toBeGreaterThan(-1);
      const moving = all.findLastIndex(
        (r) => !reduce(r) && value(r.body, 'transition') !== undefined && names(r).includes(selector),
      );
      expect(moving, `${selector} has a transition to stop`).toBeGreaterThan(-1);
      expect(stop, selector).toBeGreaterThan(moving);
    }
  });

  // R2 (review round 2): the hover lift of the pills and the masthead's
  // gold link is a translate; under reduced motion it is gone, not only
  // instant (as `.back` does). Same selector, later in the cascade.
  it('reduced motion stops the hover lift of the pills', () => {
    const all = builtRules();
    const reduce = inMedia(/prefers-reduced-motion:\s*reduce/);
    const names = (r: (typeof all)[number]) => r.selector.split(',').map((s) => s.trim());
    for (const selector of ['.pill:hover', '.masthead__link p:has(>a:only-child)>a:hover']) {
      const lift = all.findLastIndex(
        (r) => !reduce(r) && value(r.body, 'translate') !== undefined && names(r).includes(selector),
      );
      expect(lift, `${selector} lifts on hover`).toBeGreaterThan(-1);
      const stop = all.findLastIndex(
        (r) => reduce(r) && value(r.body, 'translate') === 'none' && names(r).includes(selector),
      );
      expect(stop, selector).toBeGreaterThan(-1);
      expect(stop, selector).toBeGreaterThan(lift);
    }
  });

  // 007: the slide tag maintains sufficient colour contrast even when its
  // card is dimmed by the slide-focus animation. The dimming is via
  // filter/scale/grayscale on .slide__img, not opacity on .slide.
  it('the slide-focus animation dims the image, not the whole slide', () => {
    const css = readdirSync(join(DIST, '_astro'))
      .filter((f) => f.endsWith('.css'))
      .map((f) => read(`_astro/${f}`))
      .join('\n');
    expect(css).toContain('@keyframes slide-focus');
    // Extract the slide-focus keyframe content
    const kfMatch = css.match(/@keyframes slide-focus\{([^}]+)\}/);
    expect(kfMatch, '@keyframes slide-focus should be found in built CSS').toBeTruthy();
    if (kfMatch) {
      const kfBody = kfMatch[1];
      // Verify that opacity is not used for dimming (should not have opacity < 1)
      // The keyframe should use filter: grayscale() and scale, not opacity.
      const opacityDimming = /opacity\s*:\s*\.75\b/.test(kfBody);
      expect(opacityDimming, 'slide-focus animation should not use opacity:.75 for dimming').toBe(false);
      // Instead, verify filter: grayscale is used
      expect(kfBody).toContain('grayscale');
    }
  });
});
