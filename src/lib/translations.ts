import { isLang, LANGS, type Lang } from './languages';

/** A page identified by its language and its file name (its translation key). */
export interface PageRef {
  lang: Lang;
  /** The file name under the language folder, without extension: `about`, `blog/welcome`. */
  key: string;
}

/** Reads an entry id such as `fr/blog/welcome`. */
export function parseId(id: string): PageRef {
  const [lang, ...rest] = id.split('/');
  if (!isLang(lang) || rest.length === 0) {
    throw new Error(`entry id "${id}" does not start with a language folder (en, fr, vi)`);
  }
  return { lang, key: rest.join('/') };
}

/**
 * The languages a page exists in (itself included), in en, fr, vi order. The
 * file name is the translation key, so a blog post missing in a language is
 * simply not listed for it.
 */
export function translations(all: PageRef[], page: PageRef): Lang[] {
  return LANGS.filter((lang) => all.some((p) => p.lang === lang && p.key === page.key));
}
