/** The languages of the site, in the order they are listed everywhere. */
export const LANGS = ['en', 'fr', 'vi'] as const;

/** A language of the site: also the name of its folder in `content/`. */
export type Lang = (typeof LANGS)[number];

/** English is served at `/`, the others under their code. */
export const DEFAULT_LANG: Lang = 'en';

/**
 * The eight pages that exist in every language: `content/<lang>/<page>.md`.
 * `index` is the home page's opening.
 */
export const MAIN_PAGES = [
  'index',
  'search',
  'viz',
  'learn',
  'tipitaka',
  'about',
  'support',
  'legal',
] as const;

/** One of the {@link MAIN_PAGES}. */
export type MainPage = (typeof MAIN_PAGES)[number];

/**
 * The four sections of the home page, in the order they are shown, after the
 * opening of `index.md`: `content/<lang>/home/<section>.md`.
 */
export const HOME_SECTIONS = ['teaching', 'search', 'viz', 'learn'] as const;

/** One of the {@link HOME_SECTIONS}. */
export type HomeSection = (typeof HOME_SECTIONS)[number];

/** Whether `value` is a language of the site. */
export function isLang(value: string): value is Lang {
  return (LANGS as readonly string[]).includes(value);
}
