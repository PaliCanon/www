/** One content rule broken, where, and why. */
export interface Violation {
  /** The file, as the author knows it (`content/en/about.md`). */
  file: string;
  /** 1-based line in that file; 1 when the problem is the file as a whole. */
  line: number;
  /** The rule's name (`one-h1`, `no-html`, `missing-page`…). */
  rule: string;
  /** What is wrong and how to fix it. */
  message: string;
}

/** `file:line [rule] message`: the form the build prints for each violation. */
export function formatViolation(v: Violation): string {
  return `${v.file}:${v.line} [${v.rule}] ${v.message}`;
}
