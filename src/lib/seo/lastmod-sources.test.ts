import { describe, expect, it } from 'vitest';
import { LANGS, MAIN_PAGES } from '../languages';
import { buildRoutes } from '../routes';
import { routeLastmod, sourceFiles } from './lastmod-sources';

const routes = buildRoutes(
  LANGS.flatMap((l) => MAIN_PAGES.map((p) => `${l}/${p}`)),
  ['en/blog/welcome', 'en/blog/second', 'fr/blog/welcome'],
);
const at = (path: string) => routes.find((r) => r.path === path)!;

describe('sourceFiles', () => {
  it('is the Markdown file of a page or a post', () => {
    expect(sourceFiles(at('/fr/about/'), 'content')).toEqual(['content/fr/about.md']);
    expect(sourceFiles(at('/blog/welcome/'), 'content')).toEqual(['content/en/blog/welcome.md']);
  });

  it('adds the four sections to the home page', () => {
    expect(sourceFiles(at('/vi/'), 'content')).toEqual([
      'content/vi/index.md',
      'content/vi/home/teaching.md',
      'content/vi/home/search.md',
      'content/vi/home/viz.md',
      'content/vi/home/learn.md',
    ]);
  });

  it('is the posts of a blog index, none when it has no post', () => {
    expect(sourceFiles(at('/blog/'), 'content')).toEqual([
      'content/en/blog/second.md',
      'content/en/blog/welcome.md',
    ]);
    expect(sourceFiles(at('/vi/blog/'), 'content')).toEqual([]);
  });
});

describe('routeLastmod', () => {
  const dates: Record<string, string | null> = {
    'content/vi/index.md': '2026-01-01T00:00:00Z',
    'content/vi/home/search.md': '2026-03-01T00:00:00Z',
    'content/vi/home/learn.md': null,
    'content/fr/about.md': null,
  };
  const find = (file: string) => dates[file] ?? null;

  it('is the newest date of the sources', () => {
    expect(routeLastmod(at('/vi/'), 'content', find)).toBe('2026-03-01T00:00:00Z');
  });

  it('is null when git knows none of the sources', () => {
    expect(routeLastmod(at('/fr/about/'), 'content', find)).toBeNull();
    expect(routeLastmod(at('/vi/blog/'), 'content', find)).toBeNull();
  });
});
