import { createHash } from 'node:crypto';

/**
 * The CSP source expression that allows exactly one inline script: its
 * sha256, over the UTF-8 bytes of the text between the tags.
 */
export function scriptHash(script: string): string {
  return `'sha256-${createHash('sha256').update(script, 'utf8').digest('base64')}'`;
}

/**
 * The content of the page's CSP `<meta>`: same-origin everything, no
 * script but the one allowed by `hash`. Only directives a `<meta>` honours
 * (`frame-ancestors` is a header: `public/_headers`).
 */
export function cspContent(hash: string): string {
  return [
    "default-src 'self'",
    `script-src ${hash}`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'none'",
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
  ].join('; ');
}

/**
 * The CSP `<meta>` content of a page, or nothing in development: `astro dev`
 * injects its own module script (`/@vite/client`, HMR) that a hash-only
 * `script-src` would block. A production build (`import.meta.env.PROD`)
 * always has the policy; the tests over `dist/` check it.
 */
export function pageCsp(production: boolean, script: string): string | undefined {
  return production ? cspContent(scriptHash(script)) : undefined;
}
