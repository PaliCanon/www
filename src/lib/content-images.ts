import { dirname, join, relative } from 'node:path';
import type { Root } from 'mdast';
import { visit } from 'unist-util-visit';
import type { VFile } from 'vfile';

/**
 * Where `images/<name>` of a page is, from the page's own folder
 * (`../images/<name>` for `en/about.md`, `../../images/<name>` for a blog
 * post): that is the relative path Astro resolves and optimises. Remote,
 * root-relative and other URLs are left alone.
 */
export function contentImageUrl(url: string, filePath: string, contentRoot: string): string {
  if (!url.startsWith('images/')) return url;
  return relative(dirname(filePath), join(contentRoot, url)).split('\\').join('/');
}

/** Remark plugin: rewrites the `images/…` URLs of the file it processes. */
export function remarkContentImages(options: { contentRoot: string }) {
  return (tree: Root, file: VFile) => {
    if (!file.path) return;
    visit(tree, 'image', (node) => {
      node.url = contentImageUrl(node.url, file.path, options.contentRoot);
    });
  };
}
