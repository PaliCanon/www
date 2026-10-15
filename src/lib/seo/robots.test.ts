import { describe, expect, it } from 'vitest';
import { ALLOWED_BOTS, DISALLOWED_BOTS, robotsTxt, SITEMAP_PATH } from './robots';

/** The groups of a robots.txt: user agents and the rules that follow them. */
function groups(text: string) {
  const out: Array<{ agents: string[]; rules: string[] }> = [];
  let last = '';
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) {
      last = '';
      continue;
    }
    const [key, ...rest] = line.split(':');
    const value = rest.join(':').trim();
    if (key.toLowerCase() === 'user-agent') {
      if (last !== 'agent') out.push({ agents: [], rules: [] });
      out.at(-1)!.agents.push(value);
      last = 'agent';
    } else if (key.toLowerCase() !== 'sitemap') {
      out.at(-1)?.rules.push(`${key}: ${value}`);
      last = 'rule';
    }
  }
  return out;
}

describe('robotsTxt', () => {
  const text = robotsTxt('https://example.test');

  it('points at the sitemap of the same site', () => {
    expect(SITEMAP_PATH).toBe('/sitemap.xml');
    expect(text).toContain('Sitemap: https://example.test/sitemap.xml');
  });

  it('allows the search and answer bots, exactly the list', () => {
    const allowed = groups(text).filter(
      (g) => g.rules.join() === 'Allow: /' && !g.agents.includes('*'),
    );
    expect(allowed.flatMap((g) => g.agents).sort()).toEqual([...ALLOWED_BOTS].sort());
  });

  it('disallows the training bots, exactly the list', () => {
    const blocked = groups(text).filter((g) => g.rules.join() === 'Disallow: /');
    expect(blocked.flatMap((g) => g.agents).sort()).toEqual([...DISALLOWED_BOTS].sort());
  });

  it('allows everyone else', () => {
    const any = groups(text).find((g) => g.agents.includes('*'));
    expect(any?.rules).toEqual(['Allow: /']);
  });

  it('holds exactly the two lists and everyone else: no other agent, no other rule', () => {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l !== '' && !l.startsWith('#'));
    const agents = lines.filter((l) => l.startsWith('User-agent:')).map((l) => l.slice(11).trim());
    expect(agents.sort()).toEqual([...ALLOWED_BOTS, ...DISALLOWED_BOTS, '*'].sort());
    expect(new Set(agents).size).toBe(agents.length);
    const rest = lines.filter((l) => !l.startsWith('User-agent:'));
    expect(rest.filter((l) => l === 'Allow: /')).toHaveLength(2);
    expect(rest.filter((l) => l === 'Disallow: /')).toHaveLength(1);
    expect(rest.filter((l) => l.startsWith('Sitemap:'))).toEqual([
      'Sitemap: https://example.test/sitemap.xml',
    ]);
    expect(rest).toHaveLength(4);
  });

  it('names the bots of the policy', () => {
    for (const bot of [
      'Googlebot',
      'Bingbot',
      'DuckDuckBot',
      'Applebot',
      'OAI-SearchBot',
      'PerplexityBot',
      'ChatGPT-User',
      'Claude-SearchBot',
    ]) {
      expect(ALLOWED_BOTS).toContain(bot);
    }
    for (const bot of [
      'GPTBot',
      'CCBot',
      'Google-Extended',
      'ClaudeBot',
      'anthropic-ai',
      'Bytespider',
      'Amazonbot',
      'meta-externalagent',
      'Applebot-Extended',
    ]) {
      expect(DISALLOWED_BOTS).toContain(bot);
    }
  });

  it('lists no bot in both', () => {
    const lower = ALLOWED_BOTS.map((b) => b.toLowerCase());
    for (const bot of DISALLOWED_BOTS) expect(lower).not.toContain(bot.toLowerCase());
  });
});
