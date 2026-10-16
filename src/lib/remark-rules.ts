import type { Heading, Image, ImageReference, Root } from 'mdast';
import { toString } from 'mdast-util-to-string';
import remarkGfm from 'remark-gfm';
import remarkParse from 'remark-parse';
import { unified } from 'unified';
import { visit } from 'unist-util-visit';
import type { Violation } from './violations';

export { formatViolation } from './violations';

/** What {@link checkMarkdown} needs to know about the file. */
export interface CheckOptions {
  /** The file's name, as the author knows it; put in every violation. */
  file: string;
  /** Lines before the body (the front matter), added to every line. */
  lineOffset?: number;
  /** Whether `images/<name>` exists; images are not looked up when absent. */
  imageExists?: (url: string) => boolean;
  /** `section`: a home section, whose title is its h2: no `#` heading at all. Default `page`. */
  kind?: 'page' | 'section';
}

const REMOTE = /^(https?:)?\/\//;

/**
 * The content rules for the body of one Markdown file: exactly one `#`
 * heading (the page's only h1; none in a home section, whose title is its
 * h2), no empty image alt text, no raw HTML, images only from `images/`.
 * Violations come sorted by line.
 */
export function checkMarkdown(body: string, options: CheckOptions): Violation[] {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(body) as Root;
  const offset = options.lineOffset ?? 0;
  const found: Violation[] = [];
  const add = (line: number | undefined, rule: string, message: string) =>
    found.push({ file: options.file, line: (line ?? 1) + offset, rule, message });

  const section = options.kind === 'section';
  let h1 = 0;
  visit(tree, (node) => {
    const line = node.position?.start.line;
    if (node.type === 'heading' && node.depth === 1) {
      h1 += 1;
      if (section) {
        add(line, 'section-h1', 'a section has no # heading: its title is its h2, use ## below it');
      } else if (h1 > 1) {
        add(line, 'one-h1', 'a second # heading: the page has one h1, use ## below it');
      }
    } else if (node.type === 'html') {
      add(line, 'no-html', 'raw HTML is not allowed, write it in Markdown');
    } else if (node.type === 'image' || node.type === 'imageReference') {
      checkImage(node, line, add, options);
    }
  });
  if (h1 === 0 && !section)
    add(1 - offset, 'one-h1', 'no # heading: the page needs exactly one, its h1');

  return found.sort((a, b) => a.line - b.line);
}

type Add = (line: number | undefined, rule: string, message: string) => void;

function checkImage(
  node: Image | ImageReference,
  line: number | undefined,
  add: Add,
  options: CheckOptions,
): void {
  if (!node.alt?.trim())
    add(line, 'image-alt', 'an image needs a description: write it between [ ]');
  if (node.type === 'imageReference') return;
  const url = node.url;
  if (REMOTE.test(url) || url.startsWith('/')) return;
  if (!url.startsWith('images/')) {
    add(
      line,
      'image-path',
      `image "${url}": images are files of content/images/, written images/<name>`,
    );
  } else if (options.imageExists && !options.imageExists(url)) {
    add(line, 'image-missing', `image "${url}" is not in content/images/`);
  }
}

/** The text of the body's first `#` heading (the page's h1), formatting marks left out; undefined when it has none. */
export function h1Text(body: string): string | undefined {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(body) as Root;
  let text: string | undefined;
  visit(tree, 'heading', (node: Heading) => {
    if (text === undefined && node.depth === 1) text = toString(node);
  });
  return text;
}
