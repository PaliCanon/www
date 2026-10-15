import { SITE_NAME } from './site';

/**
 * The `<title>` of a page: `<page title> · PaliCanon`. A home page's title is
 * its content title alone: it already names PaliCanon (ruling 2026-10-15).
 */
export function pageTitle(title: string, home: boolean): string {
  return home ? title : `${title} · ${SITE_NAME}`;
}
