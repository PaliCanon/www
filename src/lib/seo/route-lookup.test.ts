import { describe, expect, it } from 'vitest';
import { LANGS, MAIN_PAGES } from '../languages';
import { buildRoutes } from '../routes';
import { routeAt } from './route-lookup';

const routes = buildRoutes(
  LANGS.flatMap((l) => MAIN_PAGES.map((p) => `${l}/${p}`)),
  ['en/blog/welcome'],
);

describe('routeAt', () => {
  it('finds the route written at a path', () => {
    expect(routeAt(routes, '/')?.key).toBe('index');
    expect(routeAt(routes, '/fr/about/')?.lang).toBe('fr');
    expect(routeAt(routes, '/blog/welcome/')?.kind).toBe('post');
    expect(routeAt(routes, '/vi/blog/')?.kind).toBe('blog-index');
  });

  it('accepts the path without its trailing slash', () => {
    expect(routeAt(routes, '/fr/about')?.path).toBe('/fr/about/');
  });

  it('finds nothing for a path that is no page (the 404)', () => {
    expect(routeAt(routes, '/404/')).toBeUndefined();
    expect(routeAt(routes, '/nope/')).toBeUndefined();
  });
});
