import type { Route } from './routes';
import { absoluteUrl, url } from './url';

/** Where the sitemap is served; `robots.txt` points at it. */
export const SITEMAP_PATH = '/sitemap.xml';

const escapeXml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

/** The sitemap of `routes` on `site`: the {@link url} of each page, nothing else. */
export function sitemapXml(routes: Route[], site: string): string {
  const entries = routes
    .map((r) => `  <url><loc>${escapeXml(url(r.lang, r.key, site))}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

/** `robots.txt` of `site`: everything allowed, and the sitemap. */
export function robotsTxt(site: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${absoluteUrl(SITEMAP_PATH, site)}\n`;
}
