import type { Route } from '../routes';

/**
 * The route written at `pathname` (`/fr/about/`, with or without its final
 * slash), or `undefined` for a path that is no page, such as the 404.
 */
export function routeAt(routes: Route[], pathname: string): Route | undefined {
  const path = pathname.endsWith('/') ? pathname : `${pathname}/`;
  return routes.find((route) => route.path === path);
}
