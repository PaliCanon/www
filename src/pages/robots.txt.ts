// The robots policy of the site (src/lib/seo/robots.ts): search and answer bots
// allowed, training bots refused, the sitemap.
import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/seo/robots';
import { siteUrl } from '../lib/url';

export const GET: APIRoute = () =>
  new Response(robotsTxt(siteUrl()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
