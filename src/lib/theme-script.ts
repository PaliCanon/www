/**
 * The one inline script of every page, under 1 KB, first in `<head>` before
 * any stylesheet. Its text is the exact text the page inlines and the
 * CSP hashes (`csp.ts`): change a character and the hash follows, since both
 * read this constant.
 *
 * - Before paint: a `pc_theme=light|dark` cookie (shared by `*.palicanon.app`)
 *   sets `<html data-theme>`; `system`, no cookie or any other value leaves
 *   the system theme.
 * - A click on a language link (`a[hreflang]` en, fr or vi) writes `pc_lang`,
 *   on the parent domain on `*.palicanon.app`. It is written, never read, and
 *   nothing redirects: the URL is the language's only source.
 */
export const themeScript =
  '(function(){var d=document,m=d.cookie.match(/(?:^|; )pc_theme=(light|dark)(?:;|$)/);' +
  'if(m)d.documentElement.dataset.theme=m[1];' +
  'd.addEventListener("click",function(e){' +
  'var a=e.target.closest&&e.target.closest("a[hreflang]");' +
  'if(!a||!/^(en|fr|vi)$/.test(a.hreflang))return;' +
  'var p=/(^|\\.)palicanon\\.app$/.test(location.hostname)?"; Domain=palicanon.app":"";' +
  'd.cookie="pc_lang="+a.hreflang+"; Path=/; Max-Age=31536000; SameSite=Lax"+p},true)})()';
