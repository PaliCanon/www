import { describe, expect, it } from 'vitest';
import { exists, htmlFiles, read } from './helpers';

/** The path a built file is served at: `about/index.html` is `/about/`. */
const pathOf = (file: string) => `/${file.replace(/index\.html$/, '')}`;
const locs = [...read('sitemap.xml').matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);

describe('the sitemap is the build', () => {
  const built = htmlFiles()
    .filter((file) => file !== '404.html')
    .map(pathOf)
    .sort();

  it('lists every built page except 404.html, once', () => {
    expect(locs.map((loc) => new URL(loc).pathname).sort()).toEqual(built);
    expect(new Set(locs).size).toBe(locs.length);
  });

  it('has one origin for every address, the one robots.txt gives', () => {
    const origins = new Set(locs.map((loc) => new URL(loc).origin));
    expect(origins.size).toBe(1);
    const robots = read('robots.txt');
    expect(robots).toContain(`Sitemap: ${[...origins][0]}/sitemap.xml`);
  });

  for (const loc of locs) {
    it(`${loc} is a file of dist`, () => {
      const path = new URL(loc).pathname;
      expect(path.endsWith('/'), `${loc} must end with a slash`).toBe(true);
      expect(exists(`${path.slice(1)}index.html`)).toBe(true);
    });
  }
});
