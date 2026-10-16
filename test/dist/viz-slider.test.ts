import { describe, expect, it } from 'vitest';
import { LANGS } from '../../src/lib/languages';
import { pagePath } from '../../src/lib/url';
import { read } from './helpers';

// User check 11: "Pour la map, tu peux faire des screenshots en carrousel
// aussi ?" The map scene's slider shows four screenshots of the map, like
// the other projects (the two drawn cards of check 7 are gone).
const CAPTIONS = {
  en: [
    'The parallels view, after SuttaCentral',
    'The meaning view, by embeddings',
    'A sutta and its closest neighbours',
    'The collections and the similarity threshold',
  ],
  fr: [
    'La vue des parallèles, d’après SuttaCentral',
    'La vue par le sens, par embeddings',
    'Un sutta et ses plus proches voisins',
    'Les collections et le seuil de similarité',
  ],
  vi: [
    'Cách nhìn theo kinh tương đương, theo SuttaCentral',
    'Cách nhìn theo ý nghĩa, bằng embeddings',
    'Một bài kinh và những bài gần nhất',
    'Các bộ kinh và ngưỡng tương đồng',
  ],
} as const;
const TAG = { en: 'Map', fr: 'Carte', vi: 'Bản đồ' } as const;
const WORDS = {
  en: ['Screenshots', 'Previous screenshot', 'Next screenshot'],
  fr: ["Captures d'écran", 'Capture précédente', 'Capture suivante'],
  vi: ['Ảnh chụp màn hình', 'Ảnh trước', 'Ảnh tiếp theo'],
} as const;
const unescape = (html: string) =>
  html.replaceAll('&#39;', "'").replaceAll('&quot;', '"').replaceAll('&amp;', '&');
const sceneOf = (lang: (typeof LANGS)[number]) => {
  const html = read(`${pagePath(lang, 'index').slice(1)}index.html`);
  const start = html.indexOf('data-home-section="viz"');
  return html.slice(start, html.indexOf('</section>', start));
};
const slidesOf = (scene: string) =>
  [...scene.matchAll(/<li class="slide">([\s\S]*?)<\/li>/g)].map((m) => m[1]);

describe('the map scene: a slider of four screenshots (user check 11)', () => {
  for (const lang of LANGS) {
    describe(lang, () => {
      const scene = sceneOf(lang);
      const slides = slidesOf(scene);

      it('four cards in order, captioned and tagged', () => {
        expect(slides).toHaveLength(4);
        const captions = slides.map((s) =>
          unescape(/class="slide__title">([^<]*)</.exec(s)?.[1] ?? ''),
        );
        expect(captions).toEqual([...CAPTIONS[lang]]);
        for (const s of slides) expect(s).toContain(`<span class="slide__tag">${TAG[lang]}</span>`);
      });

      it('each card is an optimised screenshot from src/assets/screens/viz, no drawing left', () => {
        expect(slides).toHaveLength(4);
        const names = ['parallels', 'meaning', 'cluster', 'phone'];
        slides.forEach((slide, i) => {
          expect(slide).toMatch(/<picture\b/);
          expect(slide).toMatch(/type="image\/avif"/);
          const img = /<img\b[^>]*>/.exec(slide)?.[0] ?? '';
          expect(img).toMatch(new RegExp(`/_astro/${names[i]}\\.[^"]*\\.(jpg|webp|avif)`));
          expect(img).toMatch(/width="\d+"/);
          expect(img).toMatch(/height="\d+"/);
          expect(slide).not.toMatch(/<svg\b|slide__art/);
        });
      });

      it('the slider says screenshots, like the others', () => {
        const [region, previous, next] = WORDS[lang];
        expect(unescape(scene)).toMatch(new RegExp(`aria-label="${region}: ${TAG[lang]}"`));
        expect(unescape(scene)).toContain(`<span class="sr-only">${previous}</span>`);
        expect(unescape(scene)).toContain(`<span class="sr-only">${next}</span>`);
      });
    });
  }
});
