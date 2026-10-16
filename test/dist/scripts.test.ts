import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { DIST, exists, htmlFiles, read } from './helpers';

/** The scripts a page loads from a file: same-origin modules under /_astro/ only (script-src 'self'). */
const scriptSources = (html: string) =>
  [...html.matchAll(/<script\b[^>]*\bsrc="([^"]*)"[^>]*>/g)].map((m) => m[0]);

describe('the script files of every page', () => {
  for (const file of htmlFiles()) {
    it(`${file}: loads the site's module, same-origin, from /_astro/`, () => {
      const tags = scriptSources(read(file));
      expect(tags).toHaveLength(1);
      const [tag] = tags;
      expect(tag).toContain('type="module"');
      const src = /src="([^"]*)"/.exec(tag)?.[1] ?? '';
      expect(src).toMatch(/^\/_astro\/[\w.-]+\.js$/);
      expect(exists(src.slice(1)), `${src} is a file of dist`).toBe(true);
    });
  }
});

describe('the motion fallback module is gone', () => {
  it('no story-fallback file in dist/_astro', () => {
    const files = readdirSync(join(DIST, '_astro'));
    expect(files.filter((f) => f.includes('fallback'))).toEqual([]);
  });

  it('the site module imports no other module', () => {
    const html = read('index.html');
    const src = /<script\b[^>]*\bsrc="\/([^"]*)"/.exec(html)?.[1] ?? '';
    expect(read(src)).not.toMatch(/import\(/);
  });
});

// R1 (review round 2): a slider's step reads the gap from its list
// (slider.css --card-gap), never a copied 16; a rotation changes the card
// width with no scroll event, so the ends' state refreshes on resize too.
describe("the slider's step and ends' state", () => {
  const html = read('index.html');
  const src = /<script\b[^>]*\bsrc="\/([^"]*)"/.exec(html)?.[1] ?? '';
  const module = read(src);
  /** The slider loop: from its `[data-slider]` query to the tall scenes' `.scene__text`. */
  const slider = module.slice(module.indexOf('[data-slider]'), module.indexOf('.scene__text'));

  it('is found in the site module', () => {
    expect(slider).toContain('.slider__track');
  });

  it('reads the gap from the list, no copied 16', () => {
    expect(slider).not.toMatch(/\+\s*16\b/);
    expect(slider).toContain('getComputedStyle(');
    expect(slider).toContain('columnGap');
  });

  // X1 (review round 3): an unstyled list has no column gap; the step then
  // falls back to the design's 16, never 0.
  it('falls back to a 16 gap when the list has none', () => {
    expect(slider).toMatch(/\|\|\s*16\b/);
    expect(slider).not.toMatch(/columnGap\)\s*\|\|\s*0\b/);
  });

  it('refreshes the ends on resize', () => {
    expect(slider).toMatch(/addEventListener\([`"']resize[`"']/);
  });
});
