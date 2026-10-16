import { marksClass } from '../lib/home';

/**
 * The page frame receives a page as one block of HTML (the page's Markdown,
 * then, on a home page, its four sections). These helpers cut that block where
 * the frame needs to wrap a part of it in a card, without the pages knowing.
 */

/** HomeSections opens its wrapper with this: everything before it is the home's opening (index.md). */
export const HOME_SECTIONS_MARK = '<div data-home-sections';

/** A home page cut into its opening and its sections; undefined when the page has no home sections. */
export function splitHome(html: string): { opening: string; sections: string } | undefined {
  const at = html.indexOf(HOME_SECTIONS_MARK);
  if (at === -1) return undefined;
  return { opening: html.slice(0, at), sections: html.slice(at) };
}

/**
 * A page cut after its h1 and the paragraph right after it (the lede), which
 * the masthead card holds; the rest is the body. A page with no h1 is all body.
 */
export function splitMasthead(html: string): { masthead: string; body: string } {
  const end = html.indexOf('</h1>');
  if (end === -1) return { masthead: '', body: html };
  let cut = end + '</h1>'.length;
  const lede = /^\s*<p>[\s\S]*?<\/p>/.exec(html.slice(cut));
  if (lede) cut += lede[0].length;
  return { masthead: html.slice(0, cut), body: html.slice(cut) };
}

/**
 * A page body cut before its closing link: the last paragraph, when it holds
 * one link and nothing else but text (a project page's service link, shown
 * as the pill). A body ending otherwise is all text.
 */
export function splitClosingLink(html: string): { text: string; link: string } {
  const last = /<p>((?:(?!<\/?p\b)[\s\S])*)<\/p>\s*$/.exec(html);
  const inner = last?.[1] ?? '';
  const links = inner.match(/<a\b/g) ?? [];
  const rest = inner.replace(/<a\b[^>]*>[\s\S]*?<\/a>/, '');
  if (!last || links.length !== 1 || rest.includes('<')) return { text: html, link: '' };
  return { text: html.slice(0, last.index), link: html.slice(last.index) };
}

const escapeHtml = (text: string) =>
  text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

/** The brand that, followed by a comma, opens the home's h1 ("PaliCanon, the end of suffering"). */
const BRAND = 'PaliCanon,';

/**
 * An h1 that starts with "PaliCanon," gets the brand on its own line
 * (`brand-line`, a block in chrome.css) and the phrase under it. The comma
 * stays for screen readers, which read "PaliCanon, the end of suffering",
 * and is hidden on screen. Any other h1 comes back unchanged.
 */
function brandLine(inner: string): string {
  if (!inner.startsWith(BRAND)) return inner;
  const rest = inner.slice(BRAND.length);
  return `<span class="brand-line">PaliCanon<span class="sr-only">,</span></span>${rest}`;
}

/**
 * The page's h1 dressed from its front matter: `eyebrow` as a small line
 * right before it, `highlight` (copied from the h1, content-check.ts) set in
 * a `<mark>` on its first occurrence. A highlight split by formatting inside
 * the h1 is left plain. An h1 whose text has a letter with a mark (above or
 * below) gets `has-marks` when highlighted, `bare-marks` otherwise (their
 * looser line heights, marksClass); an h1 opening on "PaliCanon," gets the
 * brand on its own line (brandLine). HTML with no h1 comes back unchanged.
 */
export function dressTitle(html: string, eyebrow?: string, highlight?: string): string {
  const open = html.indexOf('<h1');
  const start = html.indexOf('>', open) + 1;
  const end = html.indexOf('</h1>', start);
  if (open === -1 || end === -1) return html;
  let inner = html.slice(start, end);
  const mark = highlight ? escapeHtml(highlight) : '';
  const at = mark ? inner.indexOf(mark) : -1;
  if (at !== -1) {
    inner = `${inner.slice(0, at)}<mark>${mark}</mark>${inner.slice(at + mark.length)}`;
  }
  inner = brandLine(inner);
  const line = eyebrow ? `<p class="eyebrow">${escapeHtml(eyebrow)}</p>` : '';
  const room = marksClass(at !== -1, inner.replace(/<[^>]*>/g, ''));
  const tag = room
    ? html.slice(open, start).replace('<h1', `<h1 class="${room}"`)
    : html.slice(open, start);
  return `${html.slice(0, open)}${line}${tag}${inner}${html.slice(end)}`;
}
