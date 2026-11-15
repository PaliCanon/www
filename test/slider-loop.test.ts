import { afterEach, describe, expect, it, vi } from 'vitest';

// Exercise the actual event handlers with controlled scroll geometry.
// Browser rendering and scroll physics still need a visual check.
async function mount(count = 5, reduced = false) {
  vi.resetModules();
  vi.useFakeTimers();
  let width = 285;
  let gap = 20;
  const card = (id: number) => ({
    id,
    inert: false,
    attributes: new Map<string, string>(),
    setAttribute(name: string, value: string) {
      this.attributes.set(name, value);
    },
    getBoundingClientRect: () => ({ width }),
    cloneNode: () => card(id),
  });
  const cards = Array.from({ length: count }, (_, i) => card(i));
  const children = [...cards];
  const list = {
    prepend: (...copies: typeof cards) => children.unshift(...copies),
    append: (...copies: typeof cards) => children.push(...copies),
  };
  const track = Object.assign(new EventTarget(), {
    scrollLeft: 0,
    scrollTo: vi.fn((options: { left: number; behavior: string }) => {
      track.scrollLeft = options.left;
    }),
  });
  const buttons = [-1, 1].map((step) =>
    Object.assign(new EventTarget(), { dataset: { step }, hidden: true, disabled: false }),
  );
  const slider = {
    querySelector: (selector: string) => (selector === '.slider__track' ? track : list),
    querySelectorAll: (selector: string) => (selector === '.slide' ? cards : buttons),
  };
  const window = new EventTarget();
  vi.stubGlobal('document', {
    documentElement: {},
    querySelector: () => null,
    querySelectorAll: (selector: string) => (selector === '[data-slider]' ? [slider] : []),
  });
  vi.stubGlobal('matchMedia', () => ({ matches: reduced }));
  vi.stubGlobal('CSS', { supports: () => false });
  vi.stubGlobal('getComputedStyle', () => ({ fontSize: '16px', columnGap: `${gap}px` }));
  vi.stubGlobal('scrollY', 0);
  vi.stubGlobal('addEventListener', window.addEventListener.bind(window));
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
    },
  );
  await import('../src/scripts/story');
  const visible = () => children[Math.round(track.scrollLeft / (width + gap))]?.id;
  const finish = () => track.dispatchEvent(new Event('scrollend'));
  const click = (direction: -1 | 1) => {
    buttons[direction === -1 ? 0 : 1].dispatchEvent(new Event('click'));
    const shown = visible();
    finish();
    expect(visible(), 'settling keeps the same photograph').toBe(shown);
    return shown;
  };
  return {
    track,
    buttons,
    children,
    window,
    visible,
    finish,
    click,
    resize: () => {
      width = 240;
      gap = 16;
      window.dispatchEvent(new Event('resize'));
    },
  };
}

afterEach(() => {
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('the looping carousel interaction', () => {
  it('opens in the middle and cycles continuously with both buttons', async () => {
    const slider = await mount();
    expect(slider.visible()).toBe(2);
    expect(Array.from({ length: 8 }, () => slider.click(1))).toEqual([3, 4, 0, 1, 2, 3, 4, 0]);
    expect(Array.from({ length: 7 }, () => slider.click(-1))).toEqual([4, 3, 2, 1, 0, 4, 3]);
    expect(slider.buttons.every((button) => !button.disabled && !button.hidden)).toBe(true);
  });

  it('keeps only the original photographs in the accessibility tree', async () => {
    const { children } = await mount();
    expect(children.filter((child) => !child.inert).map((child) => child.id)).toEqual([
      0, 1, 2, 3, 4,
    ]);
    expect(children.filter((child) => child.inert)).toHaveLength(10);
    expect(
      children
        .filter((child) => child.inert)
        .every((child) => child.attributes.get('aria-hidden') === 'true'),
    ).toBe(true);
  });

  it('recenters a swipe only after the pointer is released, including without scrollend', async () => {
    const slider = await mount();
    slider.track.dispatchEvent(new Event('pointerdown'));
    slider.track.scrollLeft = 10 * 305;
    slider.track.dispatchEvent(new Event('scroll'));
    vi.advanceTimersByTime(200);
    expect(slider.track.scrollLeft).toBe(10 * 305);
    slider.window.dispatchEvent(new Event('pointerup'));
    vi.advanceTimersByTime(200);
    expect(slider.visible()).toBe(0);
    expect(slider.track.scrollLeft).toBe(5 * 305);
    expect(slider.click(-1)).toBe(4);
  });

  it('wraps keyboard navigation immediately with reduced motion', async () => {
    const slider = await mount(4, true);
    for (let i = 0; i < 3; i++) {
      slider.track.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowRight' }));
    }
    expect(slider.visible()).toBe(0);
    slider.track.dispatchEvent(Object.assign(new Event('keydown'), { key: 'ArrowLeft' }));
    expect(slider.visible()).toBe(3);
    expect(
      slider.track.scrollTo.mock.calls.every(([options]) => options.behavior === 'instant'),
    ).toBe(true);
  });

  it('preserves the selected photograph after resizing', async () => {
    const slider = await mount();
    slider.click(1);
    slider.click(1);
    slider.resize();
    expect(slider.visible()).toBe(4);
    expect(slider.click(1)).toBe(0);
  });

  it('does not duplicate or enable navigation for a single photograph', async () => {
    const slider = await mount(1);
    expect(slider.children).toHaveLength(1);
    expect(slider.buttons.every((button) => button.disabled)).toBe(true);
    expect(slider.visible()).toBe(0);
  });
});
