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
