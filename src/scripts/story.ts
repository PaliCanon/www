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
//   list's gap (read from CSS again on resize; 16 when unstyled). Repeated
//   sets on either side let buttons, keyboard and swipes loop continuously.
//   When scrolling settles, recenter on the matching original card.

import { buttonsState, loopIndex, middleOf } from '../lib/slider';

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
  if (header && !document.body.classList.contains('showcase')) {
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
  if (!track || !list || !card) continue;
  const count = cards.length;
  const looping = count > 1;
  // Decorative copies provide the same neighbours on both sides of a wrap.
  // Keep only the original list items exposed to assistive technology.
  const copies = () =>
    Array.from(cards, (original) => {
      const copy = original.cloneNode(true) as HTMLElement;
      copy.setAttribute('aria-hidden', 'true');
      copy.inert = true;
      return copy;
    });
  if (looping) {
    list.prepend(...copies());
    list.append(...copies());
  }
  /** The gap between cards, read from the list (slider.css --card-gap; 16 when unstyled). */
  const readGap = () => (list ? parseFloat(getComputedStyle(list).columnGap) || 16 : 16);
  let gap = readGap();
  let cardWidth = card.getBoundingClientRect().width;
  /** One card's step: its width and the gap, read once and again on resize. */
  const stepSize = () => cardWidth + gap;
  /** The card in the centre now. */
  const current = () => Math.round(track.scrollLeft / stepSize());
  const central = (index: number) => (looping ? count + loopIndex(index, count) : 0);
  let target = central(middleOf(count));
  let moving = false;
  let pointerDown = false;
  let settleTimer: ReturnType<typeof setTimeout>;
  /** Reset to the same photograph with identical neighbours, without animating. */
  const settle = () => {
    clearTimeout(settleTimer);
    if (pointerDown) return;
    target = central(current());
    moving = false;
    if (current() !== target) track.scrollTo({ left: target * stepSize(), behavior: 'instant' });
  };
  const scheduleSettle = () => {
    clearTimeout(settleTimer);
    settleTimer = setTimeout(settle, 180);
  };
  const move = (direction: number) => {
    if (!looping) return;
    clearTimeout(settleTimer);
    if (!moving) settle();
    target = Math.max(0, Math.min(count * 3 - 1, target + direction));
    moving = true;
    track.scrollTo({ left: target * stepSize(), behavior: reduced ? 'instant' : 'smooth' });
    if (reduced) settle();
  };
  track.scrollTo({ left: target * stepSize(), behavior: 'instant' });
  const state = buttonsState(count);
  for (const button of buttons) {
    button.hidden = false;
    button.disabled = Number(button.dataset.step) < 0 ? !state.previous : !state.next;
    button.addEventListener('click', () => move(Number(button.dataset.step)));
  }
  track.addEventListener('keydown', (event) => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    move(event.key === 'ArrowLeft' ? -1 : 1);
  });
  track.addEventListener('pointerdown', () => {
    pointerDown = true;
    moving = false;
    clearTimeout(settleTimer);
  });
  const release = () => {
    if (!pointerDown) return;
    pointerDown = false;
    scheduleSettle();
  };
  addEventListener('pointerup', release, { passive: true });
  addEventListener('pointercancel', release, { passive: true });
  track.addEventListener('wheel', () => (moving = false), { passive: true });
  // The timer also supports browsers without scrollend.
  track.addEventListener('scroll', scheduleSettle, { passive: true });
  track.addEventListener('scrollend', settle);
  // Keep the same photograph after a rotation changes the card width.
  addEventListener(
    'resize',
    () => {
      const index = current();
      gap = readGap();
      cardWidth = card.getBoundingClientRect().width;
      target = central(index);
      moving = false;
      track.scrollTo({ left: target * stepSize(), behavior: 'instant' });
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
