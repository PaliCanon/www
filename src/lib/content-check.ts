import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { checkCompleteness } from './completeness';
import { FrontmatterError, parseFrontmatter } from './frontmatter';
import { checkMarkdown } from './remark-rules';
import { frontmatterIssues, type FrontmatterKind } from './schema';
import { formatViolation, type Violation } from './violations';

export { formatViolation, type Violation } from './violations';

/** `<lang>/<page>.md`, `<lang>/blog/<post>.md` or `<lang>/home/<section>.md`: the shapes that are read. */
const EXPECTED = /^[^/]+\/((blog|home)\/)?[^/]+\.md$/;

/** The Markdown files under `root` as `<lang>/<name>.md`, images/ left out. */
function markdownFiles(root: string, dir = ''): string[] {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const path = dir ? `${dir}/${name}` : name;
    if (path === 'images') return [];
    if (statSync(join(root, path)).isDirectory()) return markdownFiles(root, path);
    return path.endsWith('.md') ? [path] : [];
  });
}

/** The folder itself is not there (a wrong `CONTENT_DIR`, a missing checkout). */
function folderViolation(root: string, label: string): Violation | undefined {
  if (existsSync(root) && statSync(root).isDirectory()) return undefined;
  return {
    file: label,
    line: 1,
    rule: 'content-missing',
    message: `${label}/ is not a folder: the pages are read from ./content, or from CONTENT_DIR`,
  };
}

/**
 * Every content rule over the folder `root`: completeness, then for each
 * file its front matter (schema) and its Markdown (remark rules), all
 * collected. `label` names the folder in the messages (`content`).
 */
export function checkContent(root: string, label = 'content'): Violation[] {
  const folder = folderViolation(root, label);
  if (folder) return [folder];
  const files = markdownFiles(root);
  if (files.length === 0) {
    return [
      {
        file: label,
        line: 1,
        rule: 'content-empty',
        message: `${label}/ holds no Markdown file: pages are ${label}/<lang>/<page>.md`,
      },
    ];
  }
  const known = files.filter((f) => EXPECTED.test(f));
  const found: Violation[] = files
    .filter((f) => !EXPECTED.test(f))
    .map((f) => ({
      file: `${label}/${f}`,
      line: 1,
      rule: 'unexpected-path',
      message:
        'pages are content/<lang>/<page>.md, posts content/<lang>/blog/<post>.md and home sections content/<lang>/home/<section>.md',
    }));
  found.push(
    ...checkCompleteness(
      known.map((f) => f.slice(0, -3)),
      label,
    ),
  );
  for (const f of known) found.push(...checkFile(root, f, label));
  return found;
}

function checkFile(root: string, path: string, label: string): Violation[] {
  const file = `${label}/${path}`;
  let parsed;
  try {
    parsed = parseFrontmatter(readFileSync(join(root, path), 'utf8'));
  } catch (error) {
    if (!(error instanceof FrontmatterError)) throw error;
    return [{ file, line: error.line, rule: error.rule, message: error.message }];
  }
  const kind = fileKind(path);
  const issues = frontmatterIssues(kind, parsed.data).map((issue): Violation => ({
    file,
    line: (issue.key && parsed.keyLines[issue.key]) || 1,
    rule: issue.rule ?? 'front-matter',
    message: issue.message,
  }));
  const imageExists = (url: string) => existsSync(join(root, url));
  const markdown = checkMarkdown(parsed.body, {
    file,
    lineOffset: parsed.bodyOffset,
    imageExists,
    kind: kind === 'section' ? 'section' : 'page',
  });
  return [...issues, ...frontMatterImage(root, parsed, file), ...markdown];
}

function fileKind(path: string): FrontmatterKind {
  if (path.includes('/blog/')) return 'blog';
  return path.includes('/home/') ? 'section' : 'page';
}

/** The blog `image:` key names a file of images/: it must exist. */
function frontMatterImage(
  root: string,
  parsed: ReturnType<typeof parseFrontmatter>,
  file: string,
): Violation[] {
  const image = parsed.data.image;
  if (typeof image !== 'string' || !image.startsWith('images/') || existsSync(join(root, image))) {
    return [];
  }
  return [
    {
      file,
      line: parsed.keyLines.image ?? 1,
      rule: 'frontmatter-image-missing',
      message: `image "${image}" is not in content/images/`,
    },
  ];
}

/** The build's failure message: how many rules were broken, one line each. */
export function formatViolations(violations: Violation[]): string {
  const n = violations.length;
  const head = `${n} content rule${n === 1 ? '' : 's'} broken (the files are the author's: fix them there)`;
  return [head, ...violations.map((v) => `  ${formatViolation(v)}`)].join('\n');
}

/** Thrown by {@link assertContent}: its message is the whole report. */
export class ContentRulesError extends Error {
  constructor(readonly violations: Violation[]) {
    super(formatViolations(violations));
    this.name = 'ContentRulesError';
  }
}

/** Checks the folder and throws a {@link ContentRulesError} if any rule is broken. */
export function assertContent(root: string, label = 'content'): void {
  const violations = checkContent(root, label);
  if (violations.length > 0) throw new ContentRulesError(violations);
}
