import { HOME_SECTIONS, type HomeSection, type Lang } from './languages';
import { formatViolation } from './violations';
import { pagePath } from './url';

/** Any combining mark, once a letter is decomposed: above (à ā ế) or below (ạ ṭ ṃ ç). */
const MARK = /[\u0300-\u036F]/u;

/**
 * Whether `text` holds a letter with a mark above or below it (à, ā, ở, ṭ,
 * ạ, ç…): set in capitals with the highlight band, such a heading needs a
 * looser line height (chrome.css, `has-marks`).
 */
export function hasMarks(text: string): boolean {
  return MARK.test(text.normalize('NFD'));
}

/**
 * The class giving a heading's marked letters room (chrome.css): `has-marks`
 * under a band (the band and the marks must clear each other, O2),
 * `bare-marks` with no band (a dot under Ṭ must not fall on the next line,
 * P1); none when no letter carries a mark.
 */
export function marksClass(banded: boolean, text: string): 'has-marks' | 'bare-marks' | undefined {
  if (!hasMarks(text)) return undefined;
  return banded ? 'has-marks' : 'bare-marks';
}

/**
 * The page a home section's scene leads to, presenting the project with its
 * link (user check 6): the teaching to the Tipiṭaka app, the others to their
 * own page. These are the project pages (their service link is a pill, page.css).
 */
export const SECTION_PAGES = {
  teaching: 'tipitaka',
  search: 'search',
  viz: 'viz',
  learn: 'learn',
} as const satisfies Record<HomeSection, string>;

/** Where a home section's scene leads: its page on this site, in `lang`. */
export function scenePath(lang: Lang, section: HomeSection): string {
  return pagePath(lang, SECTION_PAGES[section]);
}

/** A section title cut around its highlight. */
export interface TitleParts {
  before: string;
  /** The highlighted part, shown in `<mark>`; absent when nothing is highlighted. */
  mark?: string;
  after: string;
}

/** Cuts `title` around the first occurrence of `highlight` (the whole title is plain when there is none). */
export function splitHighlight(title: string, highlight: string | undefined): TitleParts {
  const at = highlight ? title.indexOf(highlight) : -1;
  if (!highlight || at === -1) return { before: title, after: '' };
  return {
    before: title.slice(0, at),
    mark: highlight,
    after: title.slice(at + highlight.length),
  };
}

/**
 * The ids of the four home sections of `lang` (`fr/home/viz`), in the fixed
 * order. The completeness rule fails the build first; if a section is still
 * missing here, the error names its file rather than dropping the section.
 */
export function sectionIds(ids: string[], lang: Lang): string[] {
  return HOME_SECTIONS.map((section) => {
    const id = `${lang}/home/${section}`;
    if (ids.includes(id)) return id;
    throw new Error(
      formatViolation({
        file: `content/${id}.md`,
        line: 1,
        rule: 'missing-section',
        message: `${lang} has no "${section}" home section: the home shows ${HOME_SECTIONS.join(', ')}`,
      }),
    );
  });
}
