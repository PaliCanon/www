import { describe, expect, it } from 'vitest';
import { absoluteUrl, DEFAULT_SITE_URL, pagePath, siteUrl, url } from './url';

describe('siteUrl', () => {
  it('defaults to the local dev server', () => {
    expect(DEFAULT_SITE_URL).toBe('http://localhost:4321');
    expect(siteUrl({})).toBe('http://localhost:4321');
  });

  it('reads SITE_URL without a trailing slash', () => {
    expect(siteUrl({ SITE_URL: 'https://dev.palicanon.app' })).toBe('https://dev.palicanon.app');
    expect(siteUrl({ SITE_URL: 'https://dev.palicanon.app/' })).toBe('https://dev.palicanon.app');
  });

  it('treats an empty SITE_URL as unset', () => {
    expect(siteUrl({ SITE_URL: '' })).toBe(DEFAULT_SITE_URL);
  });

  it('rejects a value that is not an http(s) URL', () => {
    expect(() => siteUrl({ SITE_URL: 'palicanon.app' })).toThrow(/SITE_URL/);
    expect(() => siteUrl({ SITE_URL: 'ftp://palicanon.app' })).toThrow(/SITE_URL/);
  });

  it('rejects a value with a path, a query or a fragment', () => {
    expect(() => siteUrl({ SITE_URL: 'https://palicanon.app/www' })).toThrow(/SITE_URL/);
    expect(() => siteUrl({ SITE_URL: 'https://palicanon.app/?q=1' })).toThrow(/SITE_URL/);
  });
});

describe('pagePath', () => {
  it('has no prefix for the default language', () => {
    expect(pagePath('en', 'about')).toBe('/about/');
    expect(pagePath('en', 'index')).toBe('/');
    expect(pagePath('en', '')).toBe('/');
  });

  it('prefixes the other languages', () => {
    expect(pagePath('fr', 'about')).toBe('/fr/about/');
    expect(pagePath('fr', 'index')).toBe('/fr/');
    expect(pagePath('vi', '')).toBe('/vi/');
  });

  it('keeps the blog path', () => {
    expect(pagePath('en', 'blog')).toBe('/blog/');
    expect(pagePath('vi', 'blog/welcome')).toBe('/vi/blog/welcome/');
  });

  it('always ends with a slash and never doubles one', () => {
    expect(pagePath('en', '/about')).toBe('/about/');
    expect(pagePath('fr', 'about/')).toBe('/fr/about/');
    expect(pagePath('fr', '/blog//welcome/')).toBe('/fr/blog/welcome/');
  });

  it('rejects a slug that climbs out', () => {
    expect(() => pagePath('en', '../secret')).toThrow(/slug/);
    expect(() => pagePath('en', 'a/./b')).toThrow(/slug/);
  });
});

describe('url', () => {
  it('is the site URL plus the path, ending in a slash', () => {
    expect(url('en', 'index', 'https://palicanon.app')).toBe('https://palicanon.app/');
    expect(url('fr', 'about', 'https://palicanon.app')).toBe('https://palicanon.app/fr/about/');
  });

  it('reads SITE_URL from the environment by default', () => {
    const before = process.env.SITE_URL;
    process.env.SITE_URL = 'https://dev.palicanon.app/';
    try {
      expect(url('vi', 'blog')).toBe('https://dev.palicanon.app/vi/blog/');
    } finally {
      if (before === undefined) delete process.env.SITE_URL;
      else process.env.SITE_URL = before;
    }
  });
});

describe('absoluteUrl', () => {
  it('joins the site and a path that starts with a slash', () => {
    expect(absoluteUrl('/sitemap.xml', 'https://palicanon.app')).toBe(
      'https://palicanon.app/sitemap.xml',
    );
  });

  it('is what url() builds on', () => {
    expect(url('fr', 'about', 'https://palicanon.app')).toBe(
      absoluteUrl(pagePath('fr', 'about'), 'https://palicanon.app'),
    );
  });

  it('refuses a path that does not start with a slash', () => {
    expect(() => absoluteUrl('sitemap.xml', 'https://palicanon.app')).toThrow(/start with a slash/);
  });
});
