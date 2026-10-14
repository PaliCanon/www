import { describe, expect, it } from 'vitest';
import { checkMarkdown, formatViolation } from './remark-rules';

const file = 'content/en/about.md';
const rules = (md: string, opts = {}) =>
  checkMarkdown(md, { file, ...opts }).map((v) => `${v.rule}@${v.line}`);

describe('exactly one # heading', () => {
  it('accepts one h1 and any number of lower headings', () => {
    expect(rules('# A\n\n## B\n\n### C\n')).toEqual([]);
  });

  it('fails with no h1, naming the file', () => {
    const [v] = checkMarkdown('## B\n\ntext\n', { file });
    expect(v.rule).toBe('one-h1');
    expect(v.file).toBe(file);
    expect(v.message).toMatch(/no # heading/);
  });

  it('fails on an empty body', () => {
    expect(rules('')).toEqual(['one-h1@1']);
  });

  it('fails on a second h1, at its own line', () => {
    expect(rules('# A\n\ntext\n\n# B\n')).toEqual(['one-h1@5']);
  });

  it('counts an underlined (setext) title as an h1', () => {
    expect(rules('A\n=\n\n# B\n')).toEqual(['one-h1@4']);
  });

  it('ignores a # inside a code block', () => {
    expect(rules('# A\n\n```\n# not a heading\n```\n')).toEqual([]);
  });

  it('adds the front matter offset to every line', () => {
    expect(rules('# A\n\n# B\n', { lineOffset: 4 })).toEqual(['one-h1@7']);
  });
});

describe('image alt text', () => {
  it('accepts an image with an alt', () => {
    expect(rules('# A\n\n![Search page](images/a.png)\n')).toEqual([]);
  });

  it('fails on an empty alt, at the image line', () => {
    expect(rules('# A\n\ntext\n\n![](images/a.png)\n')).toEqual(['image-alt@5']);
  });

  it('fails on a blank alt', () => {
    expect(rules('# A\n\n![   ](images/a.png)\n')).toEqual(['image-alt@3']);
  });

  it('fails on a reference image with an empty alt', () => {
    expect(rules('# A\n\n![][a]\n\n[a]: images/a.png\n')).toEqual(['image-alt@3']);
  });
});

describe('no raw HTML', () => {
  it('fails on a block of HTML, at its line', () => {
    expect(rules('# A\n\n<div>x</div>\n')).toEqual(['no-html@3']);
  });

  it('fails on inline HTML', () => {
    expect(rules('# A\n\ntext <b>bold</b> text\n')).toEqual(['no-html@3', 'no-html@3']);
  });

  it('fails on an HTML comment', () => {
    expect(rules('# A\n\n<!-- note -->\n')).toEqual(['no-html@3']);
  });

  it('accepts an autolink, a code span and a fenced block that look like HTML', () => {
    const md = '# A\n\n<https://example.org> and `<b>` here\n\n```html\n<div></div>\n```\n';
    expect(rules(md)).toEqual([]);
  });
});

describe('image paths', () => {
  it('accepts images/…, a remote URL and a root-relative URL', () => {
    const md = '# A\n\n![a](images/a.png)\n\n![b](https://x.org/b.png)\n\n![c](/c.png)\n';
    expect(rules(md)).toEqual([]);
  });

  it('fails on any other relative path', () => {
    expect(rules('# A\n\n![a](../a.png)\n')).toEqual(['image-path@3']);
    expect(rules('# A\n\n![a](a.png)\n')).toEqual(['image-path@3']);
  });

  it('fails when the file under images/ does not exist, when asked to check', () => {
    expect(rules('# A\n\n![a](images/a.png)\n', { imageExists: () => false })).toEqual([
      'image-missing@3',
    ]);
    expect(rules('# A\n\n![a](images/a.png)\n', { imageExists: () => true })).toEqual([]);
  });
});

describe('violations', () => {
  it('are sorted by line', () => {
    expect(
      rules('# A\n\n<i>x</i>\n\n![](images/a.png)\n\n# B\n').map((r) => r.split('@')[1]),
    ).toEqual(['3', '3', '5', '7']);
  });

  it('format as file:line [rule] message', () => {
    const [v] = checkMarkdown('text\n', { file });
    expect(formatViolation(v)).toBe(`${file}:${v.line} [one-h1] ${v.message}`);
  });
});

describe('a home section (kind: section)', () => {
  const section = (md: string, opts = {}) => rules(md, { kind: 'section', ...opts });

  it('accepts a body with no heading, and needs no h1', () => {
    expect(section('Some text.\n')).toEqual([]);
    expect(section('')).toEqual([]);
  });

  it('accepts lower headings', () => {
    expect(section('Text.\n\n## Below\n\n### Deeper\n')).toEqual([]);
  });

  it('fails on a # heading, at its line, saying a section has no h1', () => {
    expect(section('Text.\n\n# Title\n', { lineOffset: 3 })).toEqual(['section-h1@6']);
    const [v] = checkMarkdown('# Title\n', { file, kind: 'section' });
    expect(v.message).toMatch(/title is its h2/);
  });

  it('fails on every # heading, setext ones included', () => {
    expect(section('# A\n\nB\n=\n')).toEqual(['section-h1@1', 'section-h1@3']);
  });

  it('keeps the HTML and image rules', () => {
    expect(section('<div>x</div>\n\n![](images/a.png)\n')).toEqual(['no-html@1', 'image-alt@3']);
  });
});
