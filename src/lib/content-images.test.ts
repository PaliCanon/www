import { join } from 'node:path';
import { remark } from 'remark';
import { describe, expect, it } from 'vitest';
import { contentImageUrl, remarkContentImages } from './content-images';

const root = '/repo/content';

describe('contentImageUrl', () => {
  it('maps images/… to content/images/ relative to a page', () => {
    expect(contentImageUrl('images/a.png', join(root, 'en/about.md'), root)).toBe(
      '../images/a.png',
    );
  });

  it('goes one level further up for a blog post', () => {
    expect(contentImageUrl('images/a.png', join(root, 'fr/blog/x.md'), root)).toBe(
      '../../images/a.png',
    );
  });

  it('keeps sub folders and spaces of the name', () => {
    expect(contentImageUrl('images/2026/a b.png', join(root, 'en/about.md'), root)).toBe(
      '../images/2026/a b.png',
    );
  });

  it('leaves a remote URL, a root-relative URL and any other path alone', () => {
    const page = join(root, 'en/about.md');
    expect(contentImageUrl('https://x.org/a.png', page, root)).toBe('https://x.org/a.png');
    expect(contentImageUrl('/a.png', page, root)).toBe('/a.png');
    expect(contentImageUrl('./a.png', page, root)).toBe('./a.png');
  });
});

describe('remarkContentImages', () => {
  it('rewrites image nodes of the file it processes', () => {
    const file = { path: join(root, 'vi/blog/x.md'), value: '![Alt](images/a.png)\n' };
    const out = remark()
      .use(remarkContentImages, { contentRoot: root })
      .processSync(file)
      .toString();
    expect(out).toContain('![Alt](../../images/a.png)');
  });

  it('does nothing for a file without a path', () => {
    const out = remark()
      .use(remarkContentImages, { contentRoot: root })
      .processSync('![Alt](images/a.png)\n')
      .toString();
    expect(out).toContain('![Alt](images/a.png)');
  });
});
