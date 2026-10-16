import { describe, expect, it } from 'vitest';
import { buttonsState, middleOf } from './slider';

describe('a slider’s previous and next buttons', () => {
  it('are both off with one card, or none', () => {
    expect(buttonsState(0, 1)).toEqual({ previous: false, next: false });
    expect(buttonsState(0, 0)).toEqual({ previous: false, next: false });
  });

  it('offer only next on the first card', () => {
    expect(buttonsState(0, 4)).toEqual({ previous: false, next: true });
  });

  it('offer only previous on the last card', () => {
    expect(buttonsState(3, 4)).toEqual({ previous: true, next: false });
  });

  it('offer both on a card between', () => {
    expect(buttonsState(1, 4)).toEqual({ previous: true, next: true });
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
