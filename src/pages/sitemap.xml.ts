// Owned by task 003 (alternates, x-default, lastmod); 002 ships the minimum:
// the address of every generated page (src/lib/sitemap.ts).
import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { buildRoutes } from '../lib/routes';
import { sitemapXml } from '../lib/sitemap';
import { siteUrl } from '../lib/url';

export const GET: APIRoute = async () => {
  const pages = await getCollection('pages');
  const posts = await getCollection('blog');
  const routes = buildRoutes(
    pages.map((p) => p.id),
    posts.map((p) => p.id),
  );
  return new Response(sitemapXml(routes, siteUrl()), {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
