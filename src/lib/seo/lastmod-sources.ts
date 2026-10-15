import { HOME_SECTIONS } from '../languages';
import { lastmod } from '../lastmod';
import type { Route } from '../routes';

/**
 * The Markdown files a page is made of, under the content folder `dir`: its
 * own; the four sections too for a home page; the posts for a blog index.
 */
export function sourceFiles(route: Route, dir: string): string[] {
  if (route.kind === 'blog-index') return route.posts.map((id) => `${dir}/${id}.md`);
  const own = `${dir}/${route.lang}/${route.key}.md`;
  if (route.key !== 'index') return [own];
  return [own, ...HOME_SECTIONS.map((s) => `${dir}/${route.lang}/home/${s}.md`)];
}

/**
 * The date a page last changed: the newest git date of its
 * {@link sourceFiles}, or `null` when git knows none of them.
 */
export function routeLastmod(
  route: Route,
  dir: string,
  find: (file: string) => string | null = lastmod,
): string | null {
  const dates = sourceFiles(route, dir)
    .map((file) => find(file))
    .filter((date): date is string => date !== null);
  return dates.length === 0 ? null : dates.reduce((a, b) => (a >= b ? a : b));
}
