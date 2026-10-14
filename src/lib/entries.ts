import { formatViolation } from './violations';

/**
 * The collection entry `id` that a page needs: it was listed when the routes
 * were made, so a missing one means the file changed under the build. The
 * error names the file like any content rule, not a `TypeError`.
 */
export function requireEntry<T>(entry: T | undefined, id: string): T {
  if (entry === undefined) {
    throw new Error(
      formatViolation({
        file: `content/${id}.md`,
        line: 1,
        rule: 'vanished-entry',
        message: 'the file was listed for a page and is no longer in the collection',
      }),
    );
  }
  return entry;
}
