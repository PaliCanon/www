import type { Route } from '../routes';
import { SERVICE_LINKS } from '../strings';
import { absoluteUrl, url } from '../url';
import { LOGO_PATH } from './og';
import { SITE_NAME, SOCIAL_PROFILES } from './site';

/** What the structured data of a page is built from. */
export interface JsonLdInput {
  site: string;
  route: Route;
  /** The page's own title and description, as written in its front matter. */
  title: string;
  description: string;
  /** The date of a blog post. */
  published?: Date;
  /** The absolute address of the post's preview image. */
  image?: string;
}

type JsonLd = Record<string, unknown>;

const CONTEXT = 'https://schema.org';

const orgId = (site: string) => absoluteUrl('/#organization', site);

/**
 * The structured data of a page, by its type: Organization and WebSite on a
 * home page, MobileApplication on the Tipiṭaka page, BlogPosting on a post,
 * nothing elsewhere. No rating and no SearchAction, ever.
 */
export function jsonLdFor(input: JsonLdInput): JsonLd[] {
  const { route } = input;
  if (route.kind === 'post') return [blogPosting(input)];
  if (route.kind !== 'page') return [];
  if (route.key === 'index') return [organization(input.site), website(input)];
  if (route.key === 'tipitaka') return [mobileApplication(input)];
  return [];
}

function organization(site: string): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'Organization',
    '@id': orgId(site),
    name: SITE_NAME,
    url: absoluteUrl('/', site),
    logo: { '@type': 'ImageObject', url: absoluteUrl(LOGO_PATH, site) },
    sameAs: [...SOCIAL_PROFILES],
  };
}

function website({ site, route, description }: JsonLdInput): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'WebSite',
    name: SITE_NAME,
    url: url(route.lang, 'index', site),
    inLanguage: route.lang,
    description,
    publisher: { '@id': orgId(site) },
  };
}

function mobileApplication({ site, route, title, description }: JsonLdInput): JsonLd {
  return {
    '@context': CONTEXT,
    '@type': 'MobileApplication',
    name: title,
    url: url(route.lang, route.key, site),
    description,
    inLanguage: route.lang,
    operatingSystem: 'iOS',
    applicationCategory: 'ReferenceApplication',
    installUrl: SERVICE_LINKS.tipitaka,
    publisher: { '@id': orgId(site) },
  };
}

function blogPosting({ site, route, title, description, published, image }: JsonLdInput): JsonLd {
  const page = url(route.lang, route.key, site);
  return {
    '@context': CONTEXT,
    '@type': 'BlogPosting',
    headline: title,
    description,
    ...(published ? { datePublished: published.toISOString().slice(0, 10) } : {}),
    inLanguage: route.lang,
    mainEntityOfPage: page,
    ...(image ? { image } : {}),
    author: { '@id': orgId(site) },
    publisher: {
      '@type': 'Organization',
      '@id': orgId(site),
      name: SITE_NAME,
      logo: { '@type': 'ImageObject', url: absoluteUrl(LOGO_PATH, site) },
    },
  };
}

/** The JSON of a `<script type="application/ld+json">`: `<` is escaped, so no text can close the tag. */
export function serializeJsonLd(data: JsonLd): string {
  return JSON.stringify(data).replaceAll('<', '\\u003c');
}
