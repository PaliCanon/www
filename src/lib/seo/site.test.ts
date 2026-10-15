import { describe, expect, it } from 'vitest';
import { LANGS } from '../languages';
import { OG_LOCALES, SITE_NAME, THEME_COLORS } from './site';

describe('the site constants', () => {
  it('names the site PaliCanon', () => {
    expect(SITE_NAME).toBe('PaliCanon');
  });

  it('has one og:locale per language', () => {
    expect(Object.keys(OG_LOCALES).sort()).toEqual([...LANGS].sort());
  });

  it('has a theme-color for each theme: two distinct hex colours, dark then light', () => {
    expect(Object.keys(THEME_COLORS)).toEqual(['dark', 'light']);
    expect(THEME_COLORS.dark).toMatch(/^#[0-9a-f]{6}$/);
    expect(THEME_COLORS.light).toMatch(/^#[0-9a-f]{6}$/);
    expect(THEME_COLORS.dark).not.toBe(THEME_COLORS.light);
  });
});
