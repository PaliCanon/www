import { createHash } from 'node:crypto';
import { statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { themeScript } from '../../src/lib/theme-script';
import { DIST, exists, htmlFiles, inlineScripts, read } from './helpers';

describe('the head of every page', () => {
  for (const file of htmlFiles()) {
    it(`${file}: one inline script, allowed by its sha256 in the CSP meta, before any stylesheet`, () => {
      const html = read(file);
      const scripts = inlineScripts(html);
      expect(scripts).toHaveLength(1);
      expect(scripts[0]).toBe(themeScript);
      expect(Buffer.byteLength(scripts[0], 'utf8')).toBeLessThan(1024);

      const hash = createHash('sha256').update(scripts[0], 'utf8').digest('base64');
      const csp = /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(html)?.[1];
      expect(csp).toContain(`script-src 'sha256-${hash}'`);

      const script = html.indexOf('<script>');
      expect(html.indexOf('http-equiv="Content-Security-Policy"')).toBeLessThan(script);
      const sheet = html.indexOf('rel="stylesheet"');
      expect(sheet === -1 || script < sheet).toBe(true);
    });

    it(`${file}: no inline style and no inline event handler (the CSP forbids them)`, () => {
      const html = read(file);
      expect(html).not.toMatch(/<style[\s>]/);
      expect(html).not.toMatch(/\son[a-z]+="/);
    });
  }
});

describe('the links of the head', () => {
  for (const file of htmlFiles()) {
    it(`${file}: has an icon, and every href and src of the head is a file of dist`, () => {
      const head = /<head>([\s\S]*?)<\/head>/.exec(read(file))?.[1] ?? '';
      const targets = [...head.matchAll(/\s(?:href|src)="(\/[^"#?]*)"/g)].map((m) => m[1]);
      const icon = /<link rel="icon" href="([^"]+)"/.exec(head)?.[1];
      expect(icon, `${file} has no icon link`).toBeDefined();
      expect(targets).toContain(icon);
      for (const target of targets) {
        const path = target.endsWith('/') ? `${target.slice(1)}index.html` : target.slice(1);
        expect(exists(path), `${file}: <head> points at ${target}`).toBe(true);
        expect(statSync(join(DIST, path)).size, `${target} is empty`).toBeGreaterThan(0);
      }
    });
  }
});

// F2, 001 v6: every page works with no JavaScript. With neither story.ts nor
// a scroll timeline nothing switches the bar to glass once scrolled, so a
// stylesheet loaded through <noscript> keeps it from floating. A file of
// dist, because the CSP refuses an inline <style>.
describe('the bar with no JavaScript', () => {
  for (const file of htmlFiles()) {
    it(`${file}: loads /nojs.css through <noscript>, in the head`, () => {
      const head = /<head>([\s\S]*?)<\/head>/.exec(read(file))?.[1] ?? '';
      expect(head).toContain('<noscript><link rel="stylesheet" href="/nojs.css"></noscript>');
    });
  }

  it('nojs.css keeps the bar static where there is no scroll timeline', () => {
    expect(exists('nojs.css')).toBe(true);
    const css = read('nojs.css');
    expect(css).toContain('@supports not (animation-timeline: scroll())');
    expect(css).toMatch(/\.site-header\s*\{[^}]*position:\s*static;[^}]*margin:\s*var\(--inset\);/);
  });
});
