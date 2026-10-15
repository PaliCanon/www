import { DEFAULT_LANG, LANGS, type Lang } from '../languages';
import type { Route } from '../routes';
import { url } from '../url';

/** One `hreflang` alternate of a page: a language (or `x-default`) and the absolute address. */
export interface Alternate {
  hreflang: Lang | 'x-default';
  href: string;
}

/**
 * The alternates of a page, the same list in its `<head>` and in the sitemap:
 * every language it exists in (itself included, en, fr, vi order), then
 * `x-default`, the English page. A language the page is missing in has no
 * entry, and a page with no English version has no `x-default`.
 */
export function alternates(page: Pick<Route, 'key' | 'translations'>, site: string): Alternate[] {
  const list: Alternate[] = LANGS.filter((lang) => page.translations.includes(lang)).map(
    (lang) => ({ hreflang: lang, href: url(lang, page.key, site) }),
  );
  if (page.translations.includes(DEFAULT_LANG)) {
    list.push({ hreflang: 'x-default', href: url(DEFAULT_LANG, page.key, site) });
  }
  return list;
}
