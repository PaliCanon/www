import { describe, expect, it } from 'vitest';
import { buttonsState, loopIndex, middleOf } from './slider';

describe('a slider’s previous and next buttons', () => {
  it('are both off with one card, or none', () => {
    expect(buttonsState(1)).toEqual({ previous: false, next: false });
    expect(buttonsState(0)).toEqual({ previous: false, next: false });
  });

  it('keep both directions available with multiple cards', () => {
    expect(buttonsState(4)).toEqual({ previous: true, next: true });
  });
});

describe('circular screenshot order', () => {
  it('goes from the last card to the first and from the first to the last', () => {
    expect(loopIndex(5, 5)).toBe(0);
    expect(loopIndex(-1, 5)).toBe(4);
  });

  it('preserves the order through multiple loops in both directions', () => {
    expect(Array.from({ length: 12 }, (_, i) => loopIndex(i, 4))).toEqual([
      0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3,
    ]);
    expect(Array.from({ length: 7 }, (_, i) => loopIndex(-i, 3))).toEqual([0, 2, 1, 0, 2, 1, 0]);
  });

  it('stays on zero for an empty or single-card slider', () => {
    expect(loopIndex(1, 0)).toBe(0);
    expect(loopIndex(-1, 1)).toBe(0);
  });
});
describe('the card a slider opens on', () => {
  it('is the middle one; of an even number, the one left of the middle', () => {
    expect(middleOf(5)).toBe(2);
    expect(middleOf(4)).toBe(1);
    expect(middleOf(2)).toBe(0);
    expect(middleOf(1)).toBe(0);
  });
});
