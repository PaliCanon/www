import { describe, expect, it } from 'vitest';
import { LANGS } from '../languages';
import { defaultImage, OG_SIZE, ogImagePath } from './og';

describe('the default Open Graph image', () => {
  it('is one file per language under /og/, 1200 x 630', () => {
    expect(OG_SIZE).toEqual({ width: 1200, height: 630 });
    expect(LANGS.map(ogImagePath)).toEqual([
      '/og/default-en.png',
      '/og/default-fr.png',
      '/og/default-vi.png',
    ]);
  });

  it('is an absolute url on the site, with its size and a description', () => {
    expect(defaultImage('fr', 'https://example.test', 'Le Canon pāli')).toEqual({
      url: 'https://example.test/og/default-fr.png',
      width: 1200,
      height: 630,
      alt: 'Le Canon pāli',
    });
  });
});
