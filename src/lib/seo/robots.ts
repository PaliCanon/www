import { absoluteUrl } from '../url';

/** Where the sitemap is served; `robots.txt` points at it. */
export const SITEMAP_PATH = '/sitemap.xml';

/**
 * The search and answer bots, which bring readers: allowed (user, 2026-10-14).
 * Search engines, and the assistants that fetch a page to answer a question.
 */
export const ALLOWED_BOTS = [
  'Googlebot',
  'Bingbot',
  'DuckDuckBot',
  'Applebot',
  'OAI-SearchBot',
  'ChatGPT-User',
  'PerplexityBot',
  'Perplexity-User',
  'Claude-SearchBot',
  'Claude-User',
] as const;

/**
 * The bots that collect text to train models: disallowed (user, 2026-10-14).
 * `Google-Extended` and `Applebot-Extended` only opt a site out of training:
 * they do not affect Google Search or Apple's search.
 */
export const DISALLOWED_BOTS = [
  'GPTBot',
  'CCBot',
  'Google-Extended',
  'ClaudeBot',
  'anthropic-ai',
  'Bytespider',
  'Amazonbot',
  'meta-externalagent',
  'Applebot-Extended',
  'Diffbot',
  'cohere-ai',
] as const;

const group = (agents: readonly string[], rule: string) =>
  `${agents.map((agent) => `User-agent: ${agent}`).join('\n')}\n${rule}\n`;

/**
 * `robots.txt` of `site`: the search and answer bots and everyone else
 * allowed, the training bots refused, and the sitemap.
 */
export function robotsTxt(site: string): string {
  return [
    '# Search and answer bots: welcome.',
    group(ALLOWED_BOTS, 'Allow: /'),
    '# Bots that collect text to train models: no.',
    group(DISALLOWED_BOTS, 'Disallow: /'),
    '# Everyone else.',
    group(['*'], 'Allow: /'),
    `Sitemap: ${absoluteUrl(SITEMAP_PATH, site)}\n`,
  ].join('\n');
}
