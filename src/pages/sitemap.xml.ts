// The sitemap: every generated page with its lastmod and its hreflang
// alternates, from the same routes and helpers as the pages' <head>
// (src/lib/seo/sitemap.ts).
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { contentDir } from '../lib/content-dir';
import { buildRoutes } from '../lib/routes';
import { routeLastmod } from '../lib/seo/lastmod-sources';
import { sitemapXml } from '../lib/seo/sitemap';
import { siteUrl } from '../lib/url';

export const GET: APIRoute = async () => {
  const pages = await getCollection('pages');
  const posts = await getCollection('blog');
  const routes = buildRoutes(
    pages.map((p) => p.id),
    posts.map((p) => p.id),
  );
  const dir = contentDir();
  return new Response(
    sitemapXml(routes, siteUrl(), (route) => routeLastmod(route, dir)),
    {
      headers: { 'Content-Type': 'application/xml; charset=utf-8' },
    },
  );
};
