import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

export const DIST = join(import.meta.dirname, '../../dist');

/** Every `.html` file under dist, as paths relative to dist. */
export function htmlFiles(dir = ''): string[] {
  return readdirSync(join(DIST, dir)).flatMap((name) => {
    const path = dir ? `${dir}/${name}` : name;
    if (statSync(join(DIST, path)).isDirectory()) return htmlFiles(path);
    return path.endsWith('.html') ? [path] : [];
  });
}

export const read = (path: string) => readFileSync(join(DIST, path), 'utf8');
export const exists = (path: string) => existsSync(join(DIST, path));

/** The text of every inline `<script>` (no src, not a data block). */
export function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)(?![^>]*type="application\/ld\+json")[^>]*>([\s\S]*?)<\/script>/g)].map(
    (m) => m[1],
  );
}

/** A rule of the built CSS with the at-rules around it (`@media (min-width:64rem)`), outermost first. */
export interface Rule {
  at: string[];
  selector: string;
  body: string;
}

/** Every style rule of `css`, with its at-rule context (a small brace walker: the built CSS has no strings with braces). */
export function parse(css: string): Rule[] {
  const out: Rule[] = [];
  const stack: string[] = [];
  let start = 0;
  for (let i = 0; i < css.length; i++) {
    if (css[i] === '{') {
      const head = css.slice(start, i).trim();
      const end = css.indexOf('}', i);
      const next = css.indexOf('{', i + 1);
      if (head.startsWith('@') || (next !== -1 && next < end)) {
        stack.push(head);
        start = i + 1;
      } else {
        out.push({ at: [...stack], selector: head, body: css.slice(i + 1, end) });
        i = end;
        start = end + 1;
      }
    } else if (css[i] === '}') {
      stack.pop();
      start = i + 1;
    }
  }
  return out;
}

/** Every style rule of the built stylesheets, with its at-rules. */
export const builtRules = (): Rule[] =>
  readdirSync(join(DIST, '_astro'))
    .filter((f) => f.endsWith('.css'))
    .flatMap((f) => parse(read(`_astro/${f}`)));

/** A rule outside any media query: the phone's (the site is written phone first). */
export const plain = (r: Rule) => r.at.every((a) => !a.startsWith('@media'));
/** A rule inside the media query matching `query` (as built: `width>=64rem`). */
export const inMedia = (query: RegExp) => (r: Rule) => r.at.some((a) => a.startsWith('@media') && query.test(a));
/** The rules styling `selector` exactly (one selector of a list counts). */
export const of = (selector: string, rs: Rule[]) =>
  rs.filter((r) => r.selector.split(',').some((s) => s.trim() === selector));
/** The value of `prop` in a rule's declarations. */
export const value = (body: string, prop: string) =>
  new RegExp(`(?:^|;)${prop}:([^;]*)`).exec(body)?.[1]?.trim();
