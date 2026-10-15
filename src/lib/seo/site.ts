import type { Lang } from '../languages';

/** The name of the site, in the title of every page and in the structured data. */
export const SITE_NAME = 'PaliCanon';

/** The profiles of the project elsewhere (Instagram, Ko-fi): `sameAs` of the Organization. */
export const SOCIAL_PROFILES = [
  'https://www.instagram.com/daily_sutta',
  'https://ko-fi.com/tipitaka',
] as const;

/** `og:locale` of each language. */
export const OG_LOCALES: Record<Lang, string> = { en: 'en_US', fr: 'fr_FR', vi: 'vi_VN' };

/** The browser chrome colour of each theme: the page background of `styles/theme.css`. */
export const THEME_COLORS = { dark: '#20262e', light: '#f8f6f0' } as const;
