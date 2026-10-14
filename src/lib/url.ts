import { DEFAULT_LANG, type Lang } from './languages';

/** The site URL when `SITE_URL` is not set: Astro's dev server. */
export const DEFAULT_SITE_URL = 'http://localhost:4321';

/**
 * The site's origin from `SITE_URL`, without a trailing slash.
 * @throws when the value is not an http(s) origin (no path, query or fragment).
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): string {
  const raw = env.SITE_URL;
  if (!raw) return DEFAULT_SITE_URL;
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(`SITE_URL "${raw}" is not a URL (expected https://palicanon.app)`);
  }
  const bare = parsed.pathname === '/' && !parsed.search && !parsed.hash;
  if (!['http:', 'https:'].includes(parsed.protocol) || !bare) {
    throw new Error(
      `SITE_URL "${raw}" must be an http(s) origin with no path (https://palicanon.app)`,
    );
  }
  return parsed.origin;
}

/**
 * The path of a page: `/` for the default language's home, `/fr/about/`,
 * `/vi/blog/welcome/`. Always ends with a slash. `slug` is the file name
 * without extension (`index` or empty for a home page, `blog/<post>`).
 */
export function pagePath(lang: Lang, slug: string): string {
  const parts = slug.split('/').filter((part) => part !== '');
  if (parts.some((part) => part === '.' || part === '..')) {
    throw new Error(`slug "${slug}" must not contain . or ..`);
  }
  if (parts.length === 1 && parts[0] === 'index') parts.length = 0;
  const segments = lang === DEFAULT_LANG ? parts : [lang, ...parts];
  return segments.length === 0 ? '/' : `/${segments.join('/')}/`;
}

/**
 * The absolute URL of a path of the site (`/sitemap.xml`, `/fr/about/`): the
 * site URL plus the path. Every absolute URL of the site is built here.
 */
export function absoluteUrl(path: string, site: string = siteUrl()): string {
  if (!path.startsWith('/')) throw new Error(`path "${path}" must start with a slash`);
  return site + path;
}

/** The absolute URL of a page: the site URL plus {@link pagePath}. */
export function url(lang: Lang, slug: string, site: string = siteUrl()): string {
  return absoluteUrl(pagePath(lang, slug), site);
}
