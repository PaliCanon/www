import { describe, expect, it } from 'vitest';
import { LANGS, MAIN_PAGES } from './languages';
import { buildRoutes } from './routes';

const pages = LANGS.flatMap((l) => MAIN_PAGES.map((p) => `${l}/${p}`));
const find = (routes: ReturnType<typeof buildRoutes>, path: string) =>
  routes.find((r) => r.path === path);

describe('buildRoutes', () => {
  it('makes a route per page, plus a blog index per language', () => {
    const routes = buildRoutes(pages, []);
    expect(routes).toHaveLength(24 + 3);
    expect(routes.filter((r) => r.kind === 'blog-index').map((r) => r.path)).toEqual([
      '/blog/',
      '/fr/blog/',
      '/vi/blog/',
    ]);
  });

  it('gives the home page of each language an empty slug for en and a prefix for the others', () => {
    const routes = buildRoutes(pages, []);
    expect(find(routes, '/')?.slug).toBeUndefined();
    expect(find(routes, '/fr/')?.slug).toBe('fr');
    expect(find(routes, '/fr/search/')?.slug).toBe('fr/search');
    expect(find(routes, '/vi/blog/')?.slug).toBe('vi/blog');
  });

  it('generates a blog post only where it exists, with no link to the others', () => {
    const routes = buildRoutes(pages, ['en/blog/welcome', 'fr/blog/welcome', 'en/blog/solo']);
    expect(find(routes, '/blog/welcome/')?.translations).toEqual(['en', 'fr']);
    expect(find(routes, '/fr/blog/welcome/')?.translations).toEqual(['en', 'fr']);
    expect(find(routes, '/vi/blog/welcome/')).toBeUndefined();
    expect(find(routes, '/blog/solo/')?.translations).toEqual(['en']);
    expect(find(routes, '/fr/blog/solo/')).toBeUndefined();
  });

  it('lists the blog posts of a language on its blog index route', () => {
    const routes = buildRoutes(pages, ['en/blog/welcome', 'fr/blog/welcome', 'en/blog/solo']);
    expect(find(routes, '/blog/')?.posts).toEqual(['en/blog/solo', 'en/blog/welcome']);
    expect(find(routes, '/vi/blog/')?.posts).toEqual([]);
  });

  it('links a page to its translations, the blog index to all three languages', () => {
    const routes = buildRoutes(pages, []);
    expect(find(routes, '/fr/about/')?.translations).toEqual(['en', 'fr', 'vi']);
    expect(find(routes, '/vi/blog/')?.translations).toEqual(['en', 'fr', 'vi']);
  });

  it('keeps the entry id of a page and a post, none for an index', () => {
    const routes = buildRoutes(pages, ['en/blog/welcome']);
    expect(find(routes, '/about/')?.id).toBe('en/about');
    expect(find(routes, '/blog/welcome/')?.id).toBe('en/blog/welcome');
    expect(find(routes, '/blog/')?.id).toBeUndefined();
  });

  it('never makes two routes for one path', () => {
    const paths = buildRoutes(pages, ['en/blog/a', 'fr/blog/a', 'vi/blog/a']).map((r) => r.path);
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('refuses two routes that would write one path (a page named blog beside the blog index)', () => {
    expect(() => buildRoutes([...pages, 'en/blog'], [])).toThrow(/two pages.*\/blog\//);
  });
});
