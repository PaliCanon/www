import { describe, expect, it } from 'vitest';
import { requireEntry } from './entries';

describe('requireEntry', () => {
  it('returns the entry when it is there', () => {
    const entry = { id: 'en/about' };
    expect(requireEntry(entry, 'en/about')).toBe(entry);
  });

  it('names the file of an entry that vanished between getStaticPaths and the page', () => {
    expect(() => requireEntry(undefined, 'fr/blog/welcome')).toThrow(
      'content/fr/blog/welcome.md:1 [vanished-entry]',
    );
  });
});
