import { OG_LOCALES, SITE_NAME } from './site';
import { alternates, type Alternate } from './alternates';
import type { OgImage } from './og';
import type { Route } from '../routes';
import { pageTitle } from './title';
import { url } from '../url';

/** What a page's `<head>` needs, besides the CSP and the script. */
export interface HeadInput {
  site: string;
  /** The page's own title, as written in its front matter. */
  title: string;
  description: string;
  /** The page's route; none for a page that is no route (the 404). */
  route?: Route;
  /** The preview image; none when `route` is none. */
  image?: OgImage;
  /** The date of a blog post. */
  published?: Date;
}

/** A `<meta>` as `[property or name, content]`. */
export type MetaPair = readonly [string, string];

/** The values the `<head>` writes. */
export interface HeadData {
  title: string;
  description: string;
  canonical?: string;
  alternates: Alternate[];
  openGraph: MetaPair[];
  twitter: MetaPair[];
  /** Whether the page asks search engines to leave it out. */
  noindex: boolean;
}

/** The title, description, canonical, hreflang, Open Graph and Twitter card of a page. */
export function headData(input: HeadInput): HeadData {
  const { route, image } = input;
  const home = route?.kind === 'page' && route.key === 'index';
  const title = pageTitle(input.title, home);
  const base = { title, description: input.description };
  if (!route || !image) {
    return { ...base, alternates: [], openGraph: [], twitter: [], noindex: true };
  }
  const canonical = url(route.lang, route.key, input.site);
  return {
    ...base,
    canonical,
    alternates: alternates(route, input.site),
    openGraph: openGraph({ ...input, title, route, image }, canonical),
    twitter: twitterCard(title, input.description, image),
    noindex: false,
  };
}

function openGraph(
  input: HeadInput & { route: Route; image: OgImage },
  canonical: string,
): MetaPair[] {
  const { route, image } = input;
  const post = route.kind === 'post';
  const others = route.translations.filter((lang) => lang !== route.lang);
  return [
    ['og:title', input.title],
    ['og:description', input.description],
    ['og:url', canonical],
    ['og:type', post ? 'article' : 'website'],
    ['og:site_name', SITE_NAME],
    ['og:locale', OG_LOCALES[route.lang]],
    ...others.map((lang): MetaPair => ['og:locale:alternate', OG_LOCALES[lang]]),
    ['og:image', image.url],
    ['og:image:width', String(image.width)],
    ['og:image:height', String(image.height)],
    ['og:image:alt', image.alt],
    ...(post && input.published
      ? [['article:published_time', input.published.toISOString().slice(0, 10)] as MetaPair]
      : []),
  ];
}

function twitterCard(title: string, description: string, image: OgImage): MetaPair[] {
  return [
    ['twitter:card', 'summary_large_image'],
    ['twitter:title', title],
    ['twitter:description', description],
    ['twitter:image', image.url],
    ['twitter:image:alt', image.alt],
  ];
}
