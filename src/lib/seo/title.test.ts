import { describe, expect, it } from 'vitest';
import { pageTitle } from './title';

describe('pageTitle', () => {
  it('puts the site name after the page title: "<page title> · PaliCanon"', () => {
    expect(pageTitle('About PaliCanon', false)).toBe('About PaliCanon · PaliCanon');
    expect(pageTitle('Tipiṭaka, the Pāli Canon on iPhone', false)).toBe(
      'Tipiṭaka, the Pāli Canon on iPhone · PaliCanon',
    );
  });

  it('is the content title alone on a home page: it already names PaliCanon', () => {
    expect(pageTitle('PaliCanon: the Pāli Canon for everyone', true)).toBe(
      'PaliCanon: the Pāli Canon for everyone',
    );
  });
});
