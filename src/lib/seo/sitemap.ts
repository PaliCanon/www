import type { Route } from '../routes';
import { url } from '../url';
import { alternates } from './alternates';

const escapeXml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/**
 * The sitemap of `routes` on `site`: for each page its {@link url}, its
 * `lastmod` when `lastmodOf` knows it, and its `xhtml:link` alternates, the
 * same list as its `<head>` (hreflang both ways, `x-default`).
 */
export function sitemapXml(
  routes: Route[],
  site: string,
  lastmodOf: (route: Route) => string | null = () => null,
): string {
  const entries = routes.map((route) => entry(route, site, lastmodOf(route))).join('\n');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" ' +
    'xmlns:xhtml="http://www.w3.org/1999/xhtml">\n' +
    `${entries}\n</urlset>\n`
  );
}

function entry(route: Route, site: string, modified: string | null): string {
  const loc = `<loc>${escapeXml(url(route.lang, route.key, site))}</loc>`;
  const date = modified ? `<lastmod>${modified}</lastmod>` : '';
  const links = alternates(route, site).map(
    (a) => `<xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${escapeXml(a.href)}"/>`,
  );
  return `  <url>${loc}${date}${links.join('')}</url>`;
}
