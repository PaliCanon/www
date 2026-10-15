import type { Lang } from '../languages';
import { OG_SIZE } from './og';

/** What the default Open Graph card of a language shows. */
export interface OgCard {
  lang: Lang;
  /** The site name, small, in gold. */
  title: string;
  /** The headline: the home page's title, large. */
  tagline: string;
  /** The lotus, as a `src` (a data URI, so the page needs no file). */
  lotus: string;
}

const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * The HTML of a default Open Graph card, 1200 x 630: the headline on the
 * deep card of the dark theme, with the lotus. `scripts/make-og.mjs` takes
 * its screenshot into `public/og/default-<lang>.png`.
 */
export function ogCardHtml(card: OgCard): string {
  const { width, height } = OG_SIZE;
  return `<!doctype html>
<html lang="${card.lang}">
<head>
<meta charset="utf-8">
<style>
  html, body { margin: 0; }
  body { width: ${width}px; height: ${height}px; background: #20262e; display: flex; align-items: center; justify-content: center; font-family: Inter, -apple-system, 'Segoe UI', system-ui, sans-serif; }
  .card { box-sizing: border-box; width: 1080px; height: 510px; padding: 56px 72px; border-radius: 28px; border: 2px solid #3c4651; background: linear-gradient(160deg, #2c333d, #242a33); display: flex; align-items: center; gap: 64px; }
  img { width: 260px; height: 260px; flex: none; }
  .name { color: #c9a84c; font-size: 34px; font-weight: 600; letter-spacing: 0.12em; text-transform: uppercase; }
  .tagline { margin-top: 20px; color: #f0e8df; font-family: Lora, 'Iowan Old Style', Georgia, serif; font-size: 64px; line-height: 1.15; font-weight: 600; }
</style>
</head>
<body>
<div class="card">
<img src="${escapeHtml(card.lotus)}" alt="">
<div>
<div class="name">${escapeHtml(card.title)}</div>
<div class="tagline">${escapeHtml(card.tagline)}</div>
</div>
</div>
</body>
</html>
`;
}
