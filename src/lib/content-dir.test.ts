import { describe, expect, it } from 'vitest';
import { contentDir } from './content-dir';

describe('contentDir', () => {
  it('is ./content by default', () => {
    expect(contentDir({})).toBe('./content');
    expect(contentDir({ CONTENT_DIR: '' })).toBe('./content');
  });

  it('can be pointed elsewhere, for the tests that build a fixture site', () => {
    expect(contentDir({ CONTENT_DIR: 'test/fixtures/site-ok' })).toBe('test/fixtures/site-ok');
  });
});
