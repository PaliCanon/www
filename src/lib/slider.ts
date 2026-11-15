// Circular slider navigation, shared with story.ts and tested without a browser.

/** Both directions stay available in a loop; none with one card or none. */
export function buttonsState(count: number): { previous: boolean; next: boolean } {
  return { previous: count > 1, next: count > 1 };
}

/** Resolve a position in any repeated set to its original card. */
export const loopIndex = (index: number, count: number): number =>
  count > 0 ? ((index % count) + count) % count : 0;

/** The card a slider opens on: the middle card, `(n - 1) >> 1`: the third of five, the second of four, the first of two. */
export const middleOf = (count: number) => (count - 1) >> 1;
