import { LANGS, type Lang } from './languages';
import { parseId, translations, type PageRef } from './translations';
import { pagePath } from './url';

/** One generated page of the site. */
export interface Route {
  /** `page`, a blog `post`, or the `blog-index` of a language. */
  kind: 'page' | 'post' | 'blog-index';
  lang: Lang;
  /** The translation key: `about`, `blog/welcome`, `blog`. */
  key: string;
  /** The rest parameter of the route (`fr/about`); `undefined` for `/`. */
  slug: string | undefined;
  /** The path, ending in a slash. */
  path: string;
  /** The collection entry id; none for a blog index. */
  id?: string;
  /** The languages this page exists in. */
  translations: Lang[];
  /** For a blog index: the ids of the posts of its language, sorted by id. */
  posts: string[];
}

/**
 * Every route of the site from the ids of the two collections: the pages,
 * the posts that exist, and a blog index in each language (an empty state
 * when it has no post).
 */
export function buildRoutes(pageIds: string[], postIds: string[]): Route[] {
  const refs: PageRef[] = [...pageIds, ...postIds].map(parseId);
  const route = (kind: Route['kind'], ref: PageRef, id?: string): Route => {
    const path = pagePath(ref.lang, ref.key);
    return {
      kind,
      lang: ref.lang,
      key: ref.key,
      slug: path === '/' ? undefined : path.slice(1, -1),
      path,
      id,
      translations: translations(refs, ref),
      posts: [],
    };
  };

  const pages = pageIds.map((id) => route('page', parseId(id), id));
  const posts = postIds.map((id) => route('post', parseId(id), id));
  const indexes = LANGS.map((lang): Route => ({
    ...route('blog-index', { lang, key: 'blog' }),
    translations: [...LANGS],
    posts: postIds.filter((id) => id.startsWith(`${lang}/`)).sort(),
  }));
  const routes = [...pages, ...indexes, ...posts];
  assertOnePathEach(routes);
  return routes;
}

/** @throws when two routes would write the same page (`getStaticPaths` would emit both). */
function assertOnePathEach(routes: Route[]): void {
  const seen = new Map<string, Route>();
  for (const r of routes) {
    const first = seen.get(r.path);
    if (first) {
      throw new Error(
        `two pages would be written at ${r.path}: ${first.id ?? `the ${first.lang} blog index`} and ${r.id ?? `the ${r.lang} blog index`}`,
      );
    }
    seen.set(r.path, r);
  }
}
