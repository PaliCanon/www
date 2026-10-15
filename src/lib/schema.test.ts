import { describe, expect, it } from 'vitest';
import { frontmatterIssues } from './schema';

const page = { title: 'Search', description: 'One sentence.' };
const post = { ...page, date: '2026-10-14' };

const keys = (kind: 'page' | 'blog', data: unknown) =>
  frontmatterIssues(kind, data).map((i) => i.key);

describe('page front matter', () => {
  it('accepts a title and a description', () => {
    expect(frontmatterIssues('page', page)).toEqual([]);
  });

  it('rejects a missing title', () => {
    expect(keys('page', { description: 'x' })).toEqual(['title']);
  });

  it('rejects an empty title', () => {
    expect(keys('page', { ...page, title: '' })).toEqual(['title']);
  });

  it('rejects a missing description', () => {
    expect(keys('page', { title: 'x' })).toEqual(['description']);
  });

  it('accepts a description of exactly 160 characters', () => {
    expect(frontmatterIssues('page', { ...page, description: 'a'.repeat(160) })).toEqual([]);
  });

  it('rejects a description of 161 characters, saying how long it is', () => {
    const issues = frontmatterIssues('page', { ...page, description: 'a'.repeat(161) });
    expect(issues.map((i) => i.key)).toEqual(['description']);
    expect(issues[0].message).toContain('160');
  });

  it('rejects an unknown key, naming it', () => {
    const issues = frontmatterIssues('page', { ...page, draft: true });
    expect(issues.map((i) => i.key)).toEqual(['draft']);
    expect(issues[0].message).toContain('draft');
  });

  it('rejects a date on a page (only blog posts have one)', () => {
    expect(keys('page', { ...page, date: '2026-10-14' })).toEqual(['date']);
  });

  it('rejects a front matter that is not a mapping', () => {
    expect(frontmatterIssues('page', ['a', 'b']).length).toBeGreaterThan(0);
    expect(frontmatterIssues('page', null).length).toBeGreaterThan(0);
  });

  it('rejects a title that is not a string', () => {
    expect(keys('page', { ...page, title: 12 })).toEqual(['title']);
  });
});

describe('blog front matter', () => {
  it('accepts a date as text', () => {
    expect(frontmatterIssues('blog', post)).toEqual([]);
  });

  it('accepts a date already parsed by the YAML reader', () => {
    expect(frontmatterIssues('blog', { ...post, date: new Date('2026-10-14') })).toEqual([]);
  });

  it('rejects a missing date', () => {
    expect(keys('blog', page)).toEqual(['date']);
  });

  it('rejects a date that is not YYYY-MM-DD', () => {
    expect(keys('blog', { ...page, date: '14/10/2026' })).toEqual(['date']);
    expect(keys('blog', { ...page, date: '2026-13-45' })).toEqual(['date']);
  });

  it('accepts an optional image under images/', () => {
    expect(frontmatterIssues('blog', { ...post, image: 'images/search-home.jpg' })).toEqual([]);
  });

  it('rejects an image outside images/', () => {
    expect(keys('blog', { ...post, image: 'https://x.org/a.jpg' })).toEqual(['image']);
    expect(keys('blog', { ...post, image: '../a.jpg' })).toEqual(['image']);
    expect(frontmatterIssues('blog', { ...post, image: 'pics/a.jpg' }).map((i) => i.rule)).toEqual([
      'frontmatter-image-not-in-images',
    ]);
  });

  it('rejects a sub-folder of images/: images live flat in content/images/', () => {
    for (const image of ['images/sub/x.jpg', 'images/a/b/c.png', 'images//x.jpg', 'images/x/']) {
      const issues = frontmatterIssues('blog', { ...post, image });
      expect(
        issues.map((i) => [i.key, i.rule]),
        image,
      ).toEqual([['image', 'frontmatter-image-not-in-images']]);
      expect(issues[0].message).toBe('images live flat in content/images/');
    }
  });

  it('rejects an unknown key', () => {
    expect(keys('blog', { ...post, tags: ['a'] })).toEqual(['tags']);
  });
});

describe('home section front matter', () => {
  const section = { title: 'What the Tipiṭaka is' };
  const issues = (data: unknown) => frontmatterIssues('section', data);

  it('accepts a title alone', () => {
    expect(issues(section)).toEqual([]);
  });

  it('accepts an eyebrow and a highlight that is part of the title', () => {
    expect(issues({ eyebrow: 'The teaching', ...section, highlight: 'Tipiṭaka' })).toEqual([]);
    expect(issues({ ...section, highlight: 'What the Tipiṭaka is' })).toEqual([]);
  });

  it('rejects a missing or empty title', () => {
    expect(issues({ eyebrow: 'x' }).map((i) => i.key)).toEqual(['title']);
    expect(issues({ title: '' }).map((i) => i.key)).toEqual(['title']);
  });

  it('rejects a highlight that is not in the title, with its own rule', () => {
    const [issue, ...rest] = issues({ ...section, highlight: 'Dhamma' });
    expect(rest).toEqual([]);
    expect(issue.key).toBe('highlight');
    expect(issue.rule).toBe('highlight-not-in-title');
    expect(issue.message).toContain('Dhamma');
  });

  it('matches the highlight exactly, case included', () => {
    expect(issues({ ...section, highlight: 'tipiṭaka' }).map((i) => i.rule)).toEqual([
      'highlight-not-in-title',
    ]);
  });

  it('rejects an empty highlight and an empty eyebrow', () => {
    expect(issues({ ...section, highlight: '' }).map((i) => i.key)).toEqual(['highlight']);
    expect(issues({ ...section, eyebrow: '' }).map((i) => i.key)).toEqual(['eyebrow']);
  });

  it('rejects a description, which a section does not have', () => {
    const [issue] = issues({ ...section, description: 'x' });
    expect(issue.key).toBe('description');
    expect(issue.message).toContain('eyebrow, title, highlight');
  });
});
