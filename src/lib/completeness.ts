import { HOME_SECTIONS, isLang, LANGS, MAIN_PAGES } from './languages';
import type { Violation } from './violations';

const includes = (list: readonly string[], value: string) => list.includes(value);

/**
 * Checks the entry ids (`<lang>/<name>`, as `en/about`; blog posts as
 * `en/blog/<slug>`, home sections as `en/home/<section>`) before any route is
 * generated: every main page and every home section exists in every
 * language, no folder is a language the site does not have, and no page or
 * section is outside the known set (a typo would otherwise ship as a new
 * page). `root` only names the files in the messages.
 */
export function checkCompleteness(ids: string[], root = 'content'): Violation[] {
  const have = new Set(ids);
  return [
    ...LANGS.flatMap((lang) => missing(lang, have, root)),
    ...ids.flatMap((id) => unknown(id, root)),
  ];
}

const violation = (file: string, rule: string, message: string): Violation => ({
  file,
  line: 1,
  rule,
  message,
});

/** The pages and sections `lang` lacks. */
function missing(lang: string, have: Set<string>, root: string): Violation[] {
  const pages = MAIN_PAGES.filter((page) => !have.has(`${lang}/${page}`)).map((page) =>
    violation(
      `${root}/${lang}/${page}.md`,
      'missing-page',
      `${lang} has no "${page}" page: every language has the ${MAIN_PAGES.length} main pages`,
    ),
  );
  const sections = HOME_SECTIONS.filter((s) => !have.has(`${lang}/home/${s}`)).map((section) =>
    violation(
      `${root}/${lang}/home/${section}.md`,
      'missing-section',
      `${lang} has no "${section}" home section: every language has the ${HOME_SECTIONS.length} sections (${HOME_SECTIONS.join(', ')})`,
    ),
  );
  return [...pages, ...sections];
}

/** What is wrong with the id itself: an unknown language, page or section. */
function unknown(id: string, root: string): Violation[] {
  const [lang, ...rest] = id.split('/');
  const name = rest.join('/');
  const file = `${root}/${lang}/${name}.md`;
  if (!isLang(lang)) {
    return [
      violation(file, 'unknown-language', `"${lang}" is not a language of the site (en, fr, vi)`),
    ];
  }
  if (rest[0] === 'home') {
    const section = rest.slice(1).join('/');
    if (includes(HOME_SECTIONS, section)) return [];
    return [
      violation(
        file,
        'unknown-section',
        `"${section}" is not one of the home sections: ${HOME_SECTIONS.join(', ')}`,
      ),
    ];
  }
  // A post is blog/<slug>; the id `blog` alone would be a second /blog/ beside the index.
  if ((rest[0] === 'blog' && rest.length > 1) || includes(MAIN_PAGES, name)) return [];
  return [
    violation(file, 'unknown-page', `"${name}" is not one of the pages: ${MAIN_PAGES.join(', ')}`),
  ];
}
