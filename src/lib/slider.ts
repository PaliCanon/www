// What a slider's buttons may do, from the card in view (story.ts): pure, so
// it is unit-tested apart from the browser.

/** Which of a slider's buttons are enabled on card `index` of `count`: none with one card or none. */
export function buttonsState(index: number, count: number): { previous: boolean; next: boolean } {
  return { previous: count > 1 && index > 0, next: count > 1 && index < count - 1 };
}

/** The card a slider opens on: the middle card, `(n - 1) >> 1`: the third of five, the second of four, the first of two. */
export const middleOf = (count: number) => (count - 1) >> 1;
