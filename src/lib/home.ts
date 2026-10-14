import { HOME_SECTIONS, type HomeSection, type Lang } from './languages';
import { SERVICE_LINKS } from './strings';
import { formatViolation } from './violations';
import { pagePath } from './url';

/**
 * Where a home section leads: the teaching to the language's about page, the
 * others to their own service (the same site in every language).
 */
export function sectionHref(lang: Lang, section: HomeSection): string {
  return section === 'teaching' ? pagePath(lang, 'about') : SERVICE_LINKS[section];
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
