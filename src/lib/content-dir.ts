/**
 * The folder the pages are read from: `./content`, or `CONTENT_DIR` (the
 * tests build small sites from `test/fixtures/` this way).
 */
export function contentDir(env: Record<string, string | undefined> = process.env): string {
  return env.CONTENT_DIR || './content';
}
