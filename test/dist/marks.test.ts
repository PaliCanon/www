import { describe, expect, it } from 'vitest';
import { read } from './helpers';

/** The opening tag of the element with `id`, or of the page's h1. */
const tagOf = (html: string, id?: string) =>
  (id ? new RegExp(`<h2 id="${id}"[^>]*>`) : /<h1\b[^>]*>/).exec(html)?.[0] ?? '';

describe('a highlighted heading with marks above or below gets the looser line height (O2)', () => {
  it('the vi opening (the Vietnamese marks under and over the band)', () => {
    expect(tagOf(read('vi/index.html'))).toContain('has-marks');
  });

  it('a home scene title with a mark above, one with a mark below, and one without', () => {
    expect(tagOf(read('index.html'), 'home-learn')).toContain('has-marks');
    expect(tagOf(read('vi/index.html'), 'home-teaching')).toContain('has-marks');
    expect(tagOf(read('index.html'), 'home-search')).not.toContain('has-marks');
  });

  it('vi scene title "Ba tạng kinh" (a dot under ạ)', () => {
    const html = read('vi/index.html');
    expect(html).toMatch(/<h2 id="home-teaching"[^>]*>\s*<a\b[^>]*>\s*<mark>Ba tạng<\/mark>/);
    expect(tagOf(html, 'home-teaching')).toContain('has-marks');
  });

  it('a masthead without a highlight stays as it is', () => {
    expect(tagOf(read('fr/about/index.html'))).not.toContain('has-marks');
  });
});
