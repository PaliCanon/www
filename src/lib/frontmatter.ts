import { LineCounter, parseDocument } from 'yaml';

/** A front matter block that cannot be read, with the line to look at. */
export class FrontmatterError extends Error {
  readonly rule = 'front-matter';

  constructor(
    message: string,
    readonly line: number,
  ) {
    super(message);
  }
}

/** A Markdown file split into its front matter and its body. */
export interface ParsedFile {
  /** The front matter's mapping. */
  data: Record<string, unknown>;
  /** The text after the closing `---`. */
  body: string;
  /** Lines before the body: add to a body line to get the file's line. */
  bodyOffset: number;
  /** The file line of each top-level key. */
  keyLines: Record<string, number>;
}

/**
 * Splits `source` at its front matter and reads it as YAML.
 * @throws {FrontmatterError} when there is no block, it is not closed, it is
 * not valid YAML or not a mapping.
 */
export function parseFrontmatter(source: string): ParsedFile {
  const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines[0]?.trimEnd() !== '---') {
    throw new FrontmatterError(
      'the file must start with a front matter block between two --- lines',
      1,
    );
  }
  const end = lines.findIndex((line, i) => i > 0 && line.trimEnd() === '---');
  if (end === -1) {
    throw new FrontmatterError('the front matter block has no closing --- line', 1);
  }
  const yaml = lines.slice(1, end).join('\n');
  const counter = new LineCounter();
  const doc = parseDocument(yaml, { lineCounter: counter });
  if (doc.errors.length > 0) {
    const error = doc.errors[0];
    const at = error.linePos?.[0].line ?? 1;
    throw new FrontmatterError(`invalid YAML: ${error.message.split('\n')[0]}`, at + 1);
  }
  const data = (doc.toJS() ?? {}) as unknown;
  if (typeof data !== 'object' || Array.isArray(data)) {
    throw new FrontmatterError('the front matter must be a mapping of keys to values', 1);
  }
  return {
    data: data as Record<string, unknown>,
    body: lines.slice(end + 1).join('\n'),
    bodyOffset: end + 1,
    keyLines: keyLines(doc, counter),
  };
}

function keyLines(doc: ReturnType<typeof parseDocument>, counter: LineCounter) {
  const result: Record<string, number> = {};
  const items = (doc.contents as { items?: { key?: { value?: unknown; range?: number[] } }[] })
    ?.items;
  for (const item of items ?? []) {
    const key = item.key;
    if (typeof key?.value === 'string' && key.range) {
      result[key.value] = counter.linePos(key.range[0]).line + 1;
    }
  }
  return result;
}
