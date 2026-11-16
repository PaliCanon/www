import lotusBud from '../assets/lotus-bud-v1.png';
import bodhiLeaves from '../assets/bodhi-leaves-v1.png';
import lotusDew from '../assets/lotus-dew-v1.png';
import pondLeaves from '../assets/pond-leaves-v1.png';
import type { ScreensProject } from './screens';

export const BOTANICAL_ART = {
  bud: lotusBud,
  bodhi: bodhiLeaves,
  dew: lotusDew,
  pond: pondLeaves,
};

export type BotanicalKind = keyof typeof BOTANICAL_ART;

/** The same photographic identity follows each tool from home to its own page. */
export const PRODUCT_ARTWORK: Record<ScreensProject, BotanicalKind> = {
  tipitaka: 'bud',
  search: 'dew',
  viz: 'pond',
  learn: 'bodhi',
  // Ripples on dark water stand for sound; Map's pond photograph is reused (no sixth drawing exists).
  audio: 'pond',
};
