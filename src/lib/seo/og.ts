import type { Lang } from '../languages';
import { absoluteUrl } from '../url';

/** The size of every Open Graph image, in pixels. */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** The lotus, square, under `public/og/`: the logo of the Organization. */
export const LOGO_PATH = '/og/lotus.png';

/** An Open Graph image: an absolute address, its size and a description. */
export interface OgImage {
  url: string;
  width: number;
  height: number;
  alt: string;
}

/** Where the default image of a language is served: `public/og/default-<lang>.png`. */
export const ogImagePath = (lang: Lang): string => `/og/default-${lang}.png`;

/** The default image of `lang` on `site`, described by `alt`. */
export function defaultImage(lang: Lang, site: string, alt: string): OgImage {
  return { url: absoluteUrl(ogImagePath(lang), site), ...OG_SIZE, alt };
}
