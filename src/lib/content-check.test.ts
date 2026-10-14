import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { assertContent, checkContent, ContentRulesError, formatViolations } from './content-check';

const fixture = join(import.meta.dirname, '../../test/fixtures/site-ok');
const made: string[] = [];

/** A copy of the valid fixture site, changed by `edit`, checked as `content/`. */
function check(edit: (path: (p: string) => string) => void = () => {}) {
  const root = mkdtempSync(join(tmpdir(), 'www-content-'));
  made.push(root);
  cpSync(fixture, root, { recursive: true });
  edit((p) => join(root, p));
  return checkContent(root, 'content');
}
const write = (file: string, text: string) => {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
const lineOf = (text: string, needle: string) =>
  text.split('\n').findIndex((l) => l.includes(needle)) + 1;

afterEach(() => {
  for (const d of made.splice(0)) rmSync(d, { recursive: true, force: true });
});

describe('checkContent', () => {
  it('accepts a complete site', () => {
    expect(check()).toEqual([]);
  });

  it('reports a page missing in one language', () => {
    const v = check((p) => rmSync(p('fr/search.md')));
    expect(v.map((x) => [x.rule, x.file])).toEqual([['missing-page', 'content/fr/search.md']]);
  });

  it('reports a second h1 with the line it has in the file, front matter included', () => {
    let at = 0;
    const v = check((p) => {
      const file = p('en/about.md');
      const text = readFileSync(file, 'utf8') + '\n# Another title\n';
      write(file, text);
      at = lineOf(text, '# Another title');
    });
    expect(v.map((x) => [x.rule, x.file, x.line])).toEqual([['one-h1', 'content/en/about.md', at]]);
  });

  it('reports raw HTML in a blog post', () => {
    const v = check((p) => {
      const file = p('en/blog/shared.md');
      write(file, readFileSync(file, 'utf8') + '\n<div>hi</div>\n');
    });
    expect(v.map((x) => [x.rule, x.file])).toEqual([['no-html', 'content/en/blog/shared.md']]);
  });

  it('reports an empty image alt', () => {
    const v = check((p) => {
      const file = p('fr/learn.md');
      write(file, readFileSync(file, 'utf8') + '\n![](images/dot.png)\n');
    });
    expect(v.map((x) => x.rule)).toEqual(['image-alt']);
  });

  it('reports an image that is not in images/', () => {
    const v = check((p) => {
      const file = p('vi/learn.md');
      write(file, readFileSync(file, 'utf8') + '\n![A dot](images/nope.png)\n');
    });
    expect(v.map((x) => x.rule)).toEqual(['image-missing']);
  });

  it('reports a description that is too long at the line of the key', () => {
    let at = 0;
    const v = check((p) => {
      const text = `---\ntitle: T\ndescription: ${'a'.repeat(161)}\n---\n\n# T\n`;
      write(p('en/legal.md'), text);
      at = lineOf(text, 'description');
    });
    expect(v.map((x) => [x.rule, x.line])).toEqual([['front-matter', at]]);
    expect(v[0].message).toContain('160');
  });

  it('reports a missing title at line 1', () => {
    const v = check((p) => write(p('en/legal.md'), '---\ndescription: D\n---\n\n# T\n'));
    expect(v.map((x) => [x.rule, x.line])).toEqual([['front-matter', 1]]);
    expect(v[0].message).toContain('title');
  });

  it('reports an unknown key at its line', () => {
    const v = check((p) =>
      write(p('en/legal.md'), '---\ntitle: T\ndescription: D\ndraft: true\n---\n\n# T\n'),
    );
    expect(v.map((x) => [x.rule, x.line])).toEqual([['front-matter', 4]]);
  });

  it('reports a blog post with no date', () => {
    const v = check((p) =>
      write(p('en/blog/nodate.md'), '---\ntitle: T\ndescription: D\n---\n\n# T\n'),
    );
    expect(v.map((x) => [x.rule, x.file])).toEqual([['front-matter', 'content/en/blog/nodate.md']]);
  });

  it('reports a blog image that does not exist at the line of the key', () => {
    let at = 0;
    const v = check((p) => {
      const text =
        '---\ntitle: T\ndescription: D\ndate: 2026-10-14\nimage: images/nope.jpg\n---\n\n# T\n';
      write(p('en/blog/img.md'), text);
      at = lineOf(text, 'image:');
    });
    expect(v.map((x) => [x.rule, x.line])).toEqual([['frontmatter-image-missing', at]]);
  });

  it('tells a missing front matter image from a missing body image by the rule id', () => {
    const v = check((p) =>
      write(
        p('en/blog/both.md'),
        '---\ntitle: T\ndescription: D\ndate: 2026-10-14\nimage: images/a.jpg\n---\n\n# T\n\n![A](images/b.png)\n',
      ),
    );
    expect(v.map((x) => [x.rule, x.line])).toEqual([
      ['frontmatter-image-missing', 5],
      ['image-missing', 10],
    ]);
  });

  it('reports a file without front matter', () => {
    const v = check((p) => write(p('en/legal.md'), '# T\n'));
    expect(v.map((x) => [x.rule, x.line])).toEqual([['front-matter', 1]]);
  });

  it('reports invalid YAML', () => {
    const v = check((p) => write(p('en/legal.md'), '---\ntitle: [oops\n---\n\n# T\n'));
    expect(v.map((x) => x.rule)).toEqual(['front-matter']);
  });

  it('reports a Markdown file outside en/<page>.md and en/blog/<post>.md', () => {
    const v = check((p) => {
      write(
        p('en/blog/2026/x.md'),
        '---\ntitle: T\ndescription: D\ndate: 2026-10-14\n---\n\n# T\n',
      );
      write(p('stray.md'), '# stray\n');
    });
    expect(v.map((x) => [x.rule, x.file]).sort()).toEqual([
      ['unexpected-path', 'content/en/blog/2026/x.md'],
      ['unexpected-path', 'content/stray.md'],
    ]);
  });

  it('collects every violation of every file, not only the first', () => {
    const v = check((p) => {
      rmSync(p('fr/search.md'));
      write(p('en/legal.md'), '# T\n');
      write(p('vi/legal.md'), '---\ntitle: T\ndescription: D\n---\n\n## no h1\n');
    });
    expect(v.map((x) => x.rule).sort()).toEqual(['front-matter', 'missing-page', 'one-h1']);
  });

  it('stops at completeness-level problems with the schema ones still reported', () => {
    const v = check((p) => {
      rmSync(p('en/index.md'));
      write(p('en/legal.md'), '---\ntitle: T\n---\n\n# T\n');
    });
    expect(v.map((x) => x.rule).sort()).toEqual(['front-matter', 'missing-page']);
  });
});

const rulesFixtures = join(import.meta.dirname, '../../test/fixtures/home-rules');
/** Puts the fixture `name` of test/fixtures/home-rules in place of `target`. */
const useRule = (name: string, target: string) => (p: (f: string) => string) =>
  write(p(target), readFileSync(join(rulesFixtures, name), 'utf8'));
const summary = (v: ReturnType<typeof check>) => v.map((x) => [x.rule, x.file, x.line]);

describe('checkContent: the home sections', () => {
  it('accepts a section with a title alone', () => {
    expect(check(useRule('minimal.md', 'en/home/teaching.md'))).toEqual([]);
  });

  it('reports a highlight that is not in the title, at its line', () => {
    const v = check(useRule('highlight-not-in-title.md', 'fr/home/teaching.md'));
    expect(summary(v)).toEqual([['highlight-not-in-title', 'content/fr/home/teaching.md', 4]]);
  });

  it('reports a # heading in a section body, at its line in the file', () => {
    const v = check(useRule('h1-in-body.md', 'vi/home/search.md'));
    expect(summary(v)).toEqual([['section-h1', 'content/vi/home/search.md', 7]]);
  });

  it('reports a section with no title', () => {
    const v = check(useRule('missing-title.md', 'en/home/viz.md'));
    expect(summary(v)).toEqual([['front-matter', 'content/en/home/viz.md', 1]]);
  });

  it('reports a description in a section as an unknown key', () => {
    const v = check(useRule('unknown-key.md', 'en/home/learn.md'));
    expect(summary(v)).toEqual([['front-matter', 'content/en/home/learn.md', 3]]);
  });

  it('reports a home section that is none of the four', () => {
    const v = check(useRule('unknown-section.md', 'en/home/extra.md'));
    expect(summary(v)).toEqual([['unknown-section', 'content/en/home/extra.md', 1]]);
  });

  it('reports a section missing in one language', () => {
    const v = check((p) => rmSync(p('vi/home/learn.md')));
    expect(summary(v)).toEqual([['missing-section', 'content/vi/home/learn.md', 1]]);
  });

  it('reports a file deeper than home/<section>.md', () => {
    const v = check(useRule('minimal.md', 'en/home/more/teaching.md'));
    expect(summary(v)).toEqual([['unexpected-path', 'content/en/home/more/teaching.md', 1]]);
  });

  it('reports a page that lacks the map page', () => {
    const v = check((p) => rmSync(p('fr/viz.md')));
    expect(summary(v)).toEqual([['missing-page', 'content/fr/viz.md', 1]]);
  });
});

describe('checkContent: a content folder that is not there', () => {
  const rootOf = () => {
    const root = mkdtempSync(join(tmpdir(), 'www-nodir-'));
    made.push(root);
    return root;
  };

  it('names a folder that does not exist, instead of failing with ENOENT', () => {
    const v = checkContent(join(rootOf(), 'nope'), 'content');
    expect(summary(v)).toEqual([['content-missing', 'content', 1]]);
    expect(v[0].message).toContain('CONTENT_DIR');
  });

  it('names a folder that is a file', () => {
    const file = join(rootOf(), 'content');
    writeFileSync(file, 'x');
    expect(summary(checkContent(file, 'content'))).toEqual([['content-missing', 'content', 1]]);
  });

  it('names a folder with no Markdown in it, in one violation', () => {
    const root = rootOf();
    mkdirSync(join(root, 'en'));
    writeFileSync(join(root, 'en/notes.txt'), 'x');
    expect(summary(checkContent(root, 'content'))).toEqual([['content-empty', 'content', 1]]);
  });

  it('is thrown by assertContent as a ContentRulesError', () => {
    expect(() => assertContent(join(rootOf(), 'nope'), 'content')).toThrow(
      /content:1 \[content-missing\]/,
    );
  });
});

describe('formatViolations', () => {
  it('lists one line per violation under a heading that counts them', () => {
    const text = formatViolations([
      { file: 'content/a.md', line: 3, rule: 'no-html', message: 'raw HTML' },
      { file: 'content/b.md', line: 1, rule: 'one-h1', message: 'no heading' },
    ]);
    expect(text).toContain('2 content rules broken');
    expect(text).toContain('content/a.md:3 [no-html] raw HTML');
    expect(text).toContain('content/b.md:1 [one-h1] no heading');
  });

  it('says "1 content rule broken" in the singular', () => {
    expect(formatViolations([{ file: 'x.md', line: 1, rule: 'r', message: 'm' }])).toContain(
      '1 content rule broken',
    );
  });
});

describe('assertContent', () => {
  it('passes a complete site', () => {
    expect(() => assertContent(fixture, 'content')).not.toThrow();
  });

  it('throws the whole report for a broken one', () => {
    const root = mkdtempSync(join(tmpdir(), 'www-assert-'));
    made.push(root);
    cpSync(fixture, root, { recursive: true });
    rmSync(join(root, 'fr/search.md'));
    try {
      assertContent(root, 'content');
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(ContentRulesError);
      expect((error as Error).message).toContain('content/fr/search.md:1 [missing-page]');
    }
  });
});
