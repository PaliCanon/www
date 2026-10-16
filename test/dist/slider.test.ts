import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/lib/languages';
import { CAPTIONS } from '../../src/data/screens';
import { pagePath } from '../../src/lib/url';
import { htmlFiles, read } from './helpers';

const fileOf = (path: string) => `${path.slice(1)}index.html`;
const unescape = (html: string) =>
  html.replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');
/** Where a slider lives: the whole page, or one home scene. */
const scopeOf = (html: string, section?: string) => {
  if (!section) return html;
  const start = html.indexOf(`data-home-section="${section}"`);
  return html.slice(start, html.indexOf('</section>', start));
};
/** The markup of the first slider in `html`. */
const sliderOf = (html: string) => {
  const start = html.indexOf('data-slider');
  return start === -1 ? '' : html.slice(start, html.indexOf('</ul>', start));
};

describe('the sliders work with no JavaScript', () => {
  for (const lang of LANGS) {
    for (const [project, page, where, section] of [
      ['search', 'index', 'the home', 'search'],
      ['viz', 'index', 'the home', 'viz'],
      ['tipitaka', 'tipitaka', 'the Tipiṭaka page', undefined],
    ] as const) {
      it(`${lang}, ${where}: a focusable named region of ${project} cards, each captioned`, () => {
        const html = scopeOf(read(fileOf(pagePath(lang, page))), section);
        const slider = sliderOf(html);
        expect(slider).toMatch(/class="slider__track" tabindex="0" role="region" aria-label="[^"]+"/);
        const captions = [...slider.matchAll(/class="slide__title">([^<]*)</g)].map((m) =>
          unescape(m[1]),
        );
        expect(captions).toEqual(CAPTIONS[project][lang]);
        expect(slider.match(/<li class="slide">/g) ?? []).toHaveLength(captions.length);
      });

      it(`${lang}, ${where}: the previous and next buttons wait for the module (hidden)`, () => {
        const html = scopeOf(read(fileOf(pagePath(lang, page))), section);
        const start = html.indexOf('data-slider');
        const buttons = [
          ...html.slice(start).matchAll(/<button[^>]*class="slider__button[^"]*"[^>]*>/g),
        ].slice(0, 2);
        expect(buttons).toHaveLength(2);
        for (const [tag] of buttons) expect(tag).toMatch(/\shidden(\s|>|=)/);
      });
    }
  }

  it('the search and the map have a slider; the teaching and learn keep their drawing', () => {
    const html = read('index.html');
    expect(html.match(/data-slider/g) ?? []).toHaveLength(2);
    for (const section of ['search', 'viz']) expect(scopeOf(html, section)).toContain('data-slider');
    for (const section of ['teaching', 'learn']) {
      expect(scopeOf(html, section)).not.toContain('data-slider');
      expect(scopeOf(html, section)).toContain('class="art"');
    }
  });
});

/** Every built slider: its cards' markup and the buttons after its track. */
const slidersOf = (html: string) =>
  [...html.matchAll(/<div class="slider" data-slider>/g)].map((m) => {
    const track = html.indexOf('</ul></div>', m.index);
    const after = track + '</ul></div>'.length;
    return { cards: html.slice(m.index, track), buttons: html.slice(after, html.indexOf('</div>', after)) };
  });

describe('a slider has buttons only where there is somewhere to go (F1)', () => {
  const files = htmlFiles().filter((f) => read(f).includes('data-slider'));

  it('the sliders are found', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  for (const file of files) {
    it(`${file}: every slider has more than one card and its two buttons, hidden in the markup`, () => {
      for (const { cards, buttons } of slidersOf(read(file))) {
        expect((cards.match(/<li class="slide">/g) ?? []).length).toBeGreaterThan(1);
        const tags = [...buttons.matchAll(/<button[^>]*>/g)].map((m) => m[0]);
        expect(tags).toHaveLength(2);
        expect(tags.filter((t) => /\sdata-step="(-1|1)"/.test(t))).toHaveLength(2);
        for (const tag of tags) expect(tag).toMatch(/\shidden(\s|>|=)/);
      }
    });
  }
});
