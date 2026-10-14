import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { themeScript } from './theme-script';

type Listener = (e: unknown) => void;

function run(cookie: string, hostname = 'localhost') {
  const html = { dataset: {} as Record<string, string> };
  const written: string[] = [];
  const listeners: Record<string, Listener> = {};
  const document = {
    documentElement: html,
    get cookie() {
      return cookie;
    },
    set cookie(v: string) {
      written.push(v);
    },
    addEventListener: (type: string, fn: Listener) => (listeners[type] = fn),
  };
  runInNewContext(themeScript, { document, location: { hostname } });
  const click = (target: unknown) => listeners.click?.({ target });
  const link = (hreflang: string | null) => ({
    closest: (sel: string) => (sel === 'a[hreflang]' && hreflang !== null ? { hreflang } : null),
  });
  return { html, written, click, link };
}

describe('the theme script', () => {
  it('is under 1 KB', () => {
    expect(Buffer.byteLength(themeScript, 'utf8')).toBeLessThan(1024);
  });

  it('applies a dark theme cookie before paint', () => {
    expect(run('a=1; pc_theme=dark; b=2').html.dataset.theme).toBe('dark');
  });

  it('applies a light theme cookie', () => {
    expect(run('pc_theme=light').html.dataset.theme).toBe('light');
  });

  it('leaves the system theme alone, for "system", for no cookie and for junk', () => {
    expect(run('pc_theme=system').html.dataset.theme).toBeUndefined();
    expect(run('').html.dataset.theme).toBeUndefined();
    expect(run('pc_theme=sepia').html.dataset.theme).toBeUndefined();
    expect(run('xpc_theme=dark').html.dataset.theme).toBeUndefined();
  });

  it('writes pc_lang when a language link is clicked, host-only off palicanon.app', () => {
    const s = run('', 'localhost');
    s.click(s.link('fr'));
    expect(s.written).toHaveLength(1);
    expect(s.written[0]).toMatch(/^pc_lang=fr; Path=\/; Max-Age=31536000; SameSite=Lax$/);
  });

  it('shares pc_lang across *.palicanon.app', () => {
    for (const host of ['palicanon.app', 'dev.palicanon.app']) {
      const s = run('', host);
      s.click(s.link('vi'));
      expect(s.written[0]).toMatch(/; Domain=palicanon\.app$/);
    }
  });

  it('does not treat another domain ending the same as palicanon.app', () => {
    const s = run('', 'notpalicanon.app');
    s.click(s.link('en'));
    expect(s.written[0]).not.toContain('Domain');
  });

  it('writes nothing for a click outside a language link', () => {
    const s = run('');
    s.click(s.link(null));
    expect(s.written).toEqual([]);
  });

  it('refuses a language it does not know', () => {
    const s = run('');
    s.click(s.link('de; Domain=evil.com'));
    expect(s.written).toEqual([]);
  });

  it('never redirects: the URL is the only source of the language', () => {
    expect(themeScript).not.toMatch(/location\.(href|replace|assign)|navigate/);
    const s = run('pc_lang=fr');
    expect(s.written).toEqual([]);
  });
});
