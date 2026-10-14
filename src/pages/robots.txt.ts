// Owned by task 003 (the AI crawler policy); 002 ships the minimum: everything
// allowed, and the sitemap (src/lib/sitemap.ts).
import type { APIRoute } from 'astro';
import { robotsTxt } from '../lib/sitemap';
import { siteUrl } from '../lib/url';

export const GET: APIRoute = () =>
  new Response(robotsTxt(siteUrl()), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
