import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { LANGS, MAIN_PAGES } from '../../src/lib/languages';
import { pagePath } from '../../src/lib/url';
import { exists, htmlFiles, read } from './helpers';

const fileOf = (path: string) => `${path.slice(1)}index.html`;

describe('every expected page exists, in en, fr and vi', () => {
  for (const lang of LANGS) {
    for (const page of MAIN_PAGES) {
      it(`${lang}/${page}`, () => {
        expect(exists(fileOf(pagePath(lang, page)))).toBe(true);
      });
    }
    it(`${lang} blog index`, () => {
      expect(exists(fileOf(pagePath(lang, 'blog')))).toBe(true);
    });
    it(`${lang} welcome post`, () => {
      expect(exists(fileOf(pagePath(lang, 'blog/welcome')))).toBe(true);
    });
  }

  it('has a 404.html, a sitemap and a robots.txt', () => {
    expect(exists('404.html')).toBe(true);
    expect(exists('sitemap.xml')).toBe(true);
    expect(exists('robots.txt')).toBe(true);
  });
});

describe('every page', () => {
  const files = htmlFiles();

  it('is found', () => {
    expect(files.length).toBeGreaterThanOrEqual(31);
  });

  for (const file of files) {
    it(`${file}: one h1 and a lang`, () => {
      const html = read(file);
      expect(html.match(/<h1[\s>]/g) ?? []).toHaveLength(1);
      const lang = /^<!DOCTYPE html><html lang="([a-z]+)"/.exec(html)?.[1];
      expect(lang).toBeDefined();
      const folder = file.split('/')[0];
      const expected = (LANGS as readonly string[]).includes(folder) ? folder : 'en';
      expect(lang).toBe(expected);
    });
  }
});

// T1: a drawing sits beside every masthead (PAGE_DRAWINGS, Base.astro), the
// 404's lotus included. Not on these: a home opens with its own lotus and has
// no masthead, and a legal page is plain by design (no drawing).
const DRAWING = /<svg\b[^>]*class="[^"]*\bmasthead__drawing\b/;
const NO_DRAWING = [
  ...LANGS.map((lang) => fileOf(pagePath(lang, 'index'))),
  ...LANGS.map((lang) => fileOf(pagePath(lang, 'legal'))),
];

describe('a drawing beside every masthead but the legal pages', () => {
  it('the exceptions are pages of dist', () => {
    for (const file of NO_DRAWING) expect(exists(file), file).toBe(true);
  });

  for (const file of htmlFiles().filter((f) => !NO_DRAWING.includes(f))) {
    it(`${file}: has its masthead drawing`, () => {
      expect(read(file)).toMatch(DRAWING);
    });
  }

  // X6 (review round 3): the 404's drawing is the lotus itself, not just a
  // drawing: its viewBox and the start of its first stroke.
  it('the 404 wears the lotus', () => {
    const lotus = readFileSync(join(import.meta.dirname, '../../src/assets/drawings/lotus.svg'), 'utf8');
    const viewBox = /viewBox="([^"]*)"/.exec(lotus)?.[1] ?? '';
    const firstStroke = (/<path\b[^>]*\bd="([^"]*)"/.exec(lotus)?.[1] ?? '').slice(0, 20);
    expect(viewBox).not.toBe('');
    expect(firstStroke).toHaveLength(20);
    const html = read('404.html');
    const svg = /<svg\b[^>]*class="[^"]*\bmasthead__drawing\b[^>]*>([\s\S]*?)<\/svg>/.exec(html);
    expect(svg, 'the 404 has its masthead drawing').not.toBeNull();
    expect(svg?.[0]).toContain(`viewBox="${viewBox}"`);
    const drawn = /<path\b[^>]*\bd="([^"]*)"/.exec(svg?.[1] ?? '')?.[1] ?? '';
    expect(drawn.slice(0, 20)).toBe(firstStroke);
  });

  for (const lang of LANGS) {
    it(`${lang}: the legal page has none`, () => {
      expect(read(fileOf(pagePath(lang, 'legal')))).not.toMatch(DRAWING);
    });
  }
});
