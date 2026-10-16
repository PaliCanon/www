// The site's one module (allowed by script-src 'self'): what CSS alone cannot
// do. Everything stays readable and usable without it, and a browser without
// CSS scroll-driven animations gets the still layout (no second module).
// - The bar hides while scrolling down past the first screen and comes back
//   on scrolling up; never under the pointer, never under reduced motion.
//   CSS keeps it shown whatever this sets while anything in it has the focus
//   or its language list is open (chrome.css).
// - Where CSS cannot switch the bar to glass from the scroll position, this
//   marks it `data-scrolled` past 4rem, from the load on (a reload
//   mid-page).
// - A home scene whose text column is taller than the screen is marked
//   `data-tall`: only there its heading stays pinned (home.css, S1).
// - A slider opens on the middle card, `(n - 1) >> 1`: the third of five,
//   the second of four, the first of two. Its previous and next buttons (only
//   rendered with more than one card) appear, scroll by one card and the
//   list's gap (read from the list's CSS once and again on resize; 16 when
//   unstyled), and are disabled at the first and the last card (slider.ts),
//   refreshed on scroll and on resize.

import { buttonsState, middleOf } from '../lib/slider';

const header = document.querySelector<HTMLElement>('.site-header');
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const glassByCss = CSS.supports('animation-timeline: scroll()');
const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
let lastY = scrollY;

/** Whether the bar may hide now: not pointed at, not focused, motion allowed. */
const mayHide = (bar: HTMLElement) =>
  !reduced && !bar.matches(':hover') && !bar.contains(document.activeElement);

function follow(): void {
  const y = scrollY;
  if (header) {
    if (!glassByCss) header.toggleAttribute('data-scrolled', y > 4 * rem);
    if (y < lastY || y <= innerHeight) header.removeAttribute('data-hidden');
    else if (y > lastY && mayHide(header)) header.setAttribute('data-hidden', '');
  }
  lastY = y;
}

addEventListener('scroll', follow, { passive: true });
follow();
header?.addEventListener('focusin', () => header.removeAttribute('data-hidden'));

for (const slider of document.querySelectorAll<HTMLElement>('[data-slider]')) {
  const track = slider.querySelector<HTMLElement>('.slider__track');
  const cards = slider.querySelectorAll<HTMLElement>('.slide');
  const card = cards[0];
  const buttons = slider.querySelectorAll<HTMLButtonElement>('[data-step]');
  const list = slider.querySelector<HTMLElement>('.slider__list');
  /** The gap between cards, read from the list (slider.css --card-gap; 16 when unstyled). */
  const readGap = () => (list ? parseFloat(getComputedStyle(list).columnGap) || 16 : 16);
  let gap = readGap();
  /** One card's step: its width and the gap, read once and again on resize. */
  const stepSize = () => (card?.offsetWidth ?? 0) + gap;
  /** The card in the centre now. */
  const current = () => (track && stepSize() > 0 ? Math.round(track.scrollLeft / stepSize()) : 0);
  /** Disables previous on the first card and next on the last. */
  const refresh = () => {
    const state = buttonsState(current(), cards.length);
    for (const button of buttons) {
      button.disabled = Number(button.dataset.step) < 0 ? !state.previous : !state.next;
    }
  };
  // The middle card, `(n - 1) >> 1`: the third of five, the second of four,
  // the first of two.
  const middle = cards[middleOf(cards.length)];
  if (track && middle) {
    track.scrollLeft = middle.offsetLeft - (track.clientWidth - middle.offsetWidth) / 2;
  }
  for (const button of buttons) {
    button.hidden = false;
    button.addEventListener('click', () => {
      const step = Number(button.dataset.step) * stepSize();
      track?.scrollBy({ left: step, behavior: reduced ? 'auto' : 'smooth' });
    });
  }
  refresh();
  track?.addEventListener('scroll', refresh, { passive: true });
  // A rotation changes the card width with no scroll event. The centre card
  // is not recomputed: the reader's position is theirs.
  addEventListener(
    'resize',
    () => {
      gap = readGap();
      refresh();
    },
    { passive: true },
  );
}

const texts = document.querySelectorAll<HTMLElement>('.scene__text');
/** Marks each scene whose text column is taller than the screen (a phone's column has no box: never). */
function markTall(): void {
  for (const text of texts) {
    text.closest('.scene')?.toggleAttribute('data-tall', text.offsetHeight > innerHeight);
  }
}
const tall = new ResizeObserver(markTall);
texts.forEach((text) => tall.observe(text));
addEventListener('resize', markTall, { passive: true });
