import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { cspContent, pageCsp, scriptHash } from './csp';
import { themeScript } from './theme-script';

describe('scriptHash', () => {
  it('is the quoted sha256 source expression of the script text', () => {
    expect(scriptHash('abc')).toBe("'sha256-ungWv48Bz+pBQUDeXa4iI7ADYaOWF3qctBD/YfIAFa0='");
  });

  it('equals the sha256 of the inlined theme script', () => {
    const expected = createHash('sha256').update(themeScript, 'utf8').digest('base64');
    expect(scriptHash(themeScript)).toBe(`'sha256-${expected}'`);
  });

  it('changes with one character', () => {
    expect(scriptHash(themeScript + ' ')).not.toBe(scriptHash(themeScript));
  });

  it('hashes the UTF-8 bytes, not the characters', () => {
    expect(scriptHash('ā')).toBe(
      `'sha256-${createHash('sha256').update(Buffer.from('ā', 'utf8')).digest('base64')}'`,
    );
  });
});

describe('cspContent', () => {
  const csp = cspContent(scriptHash(themeScript));

  it('allows the one inline script by its hash and no other script', () => {
    expect(csp).toContain(`script-src ${scriptHash(themeScript)};`);
    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it('allows nothing by default and only same-origin styles, images and fonts', () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("style-src 'self'");
    expect(csp).toContain("img-src 'self' data:");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("base-uri 'none'");
  });

  it('has no directive a meta tag ignores (frame-ancestors, report-uri, sandbox)', () => {
    expect(csp).not.toMatch(/frame-ancestors|report-uri|sandbox/);
  });
});

describe('pageCsp', () => {
  it('is the policy of the script, in a production build', () => {
    expect(pageCsp(true, themeScript)).toBe(cspContent(scriptHash(themeScript)));
  });

  it('is nothing in development, where the dev server injects its own scripts (HMR)', () => {
    expect(pageCsp(false, themeScript)).toBeUndefined();
  });
});
