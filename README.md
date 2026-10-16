# www — palicanon.app

The PaliCanon showcase: the project and its services, each presented here
and linked to its own site. Static pages in English, French and Vietnamese.

Holds: the showcase's pages, its blog, its SEO (sitemap, hreflang, Open
Graph, structured data, robots.txt). Never holds: the search, a service,
a secret.

## Writing the content

The copy lives in `content/`, one folder per language, one Markdown file
per page. A page's path is its address:

| Page | English | French | Vietnamese |
| --- | --- | --- | --- |
| Home, its opening | `content/en/index.md` → `/` | `content/fr/index.md` → `/fr/` | `content/vi/index.md` → `/vi/` |
| Home, section 1: the Tipiṭaka and its teaching | `content/en/home/teaching.md` | `content/fr/home/teaching.md` | `content/vi/home/teaching.md` |
| Home, section 2: the search | `content/en/home/search.md` | `content/fr/home/search.md` | `content/vi/home/search.md` |
| Home, section 3: the map (viz) | `content/en/home/viz.md` | `content/fr/home/viz.md` | `content/vi/home/viz.md` |
| Home, section 4: learning Pāli | `content/en/home/learn.md` | `content/fr/home/learn.md` | `content/vi/home/learn.md` |
| The search | `content/en/search.md` → `/search/` | `content/fr/search.md` → `/fr/search/` | `content/vi/search.md` → `/vi/search/` |
| The map of the Canon | `content/en/viz.md` → `/viz/` | `content/fr/viz.md` | `content/vi/viz.md` |
| Learning Pāli | `content/en/learn.md` | `content/fr/learn.md` | `content/vi/learn.md` |
| The Tipiṭaka app | `content/en/tipitaka.md` | `content/fr/tipitaka.md` | `content/vi/tipitaka.md` |
| The project | `content/en/about.md` | `content/fr/about.md` | `content/vi/about.md` |
| Support | `content/en/support.md` | `content/fr/support.md` | `content/vi/support.md` |
| Legal notice | `content/en/legal.md` | `content/fr/legal.md` | `content/vi/legal.md` |
| A blog post | `content/en/blog/<slug>.md` → `/blog/<slug>/` | `content/fr/blog/<slug>.md` | `content/vi/blog/<slug>.md` |

The three languages of a page share its file name: that is how they are
linked to each other (hreflang). A blog post missing in one language is
simply not listed there. Images go in `content/images/`.

Every file starts with a front matter block between two `---` lines:

```markdown
---
title: Search the Pāli Canon
description: One or two sentences, at most 160 characters, shown under the title in search results and link previews.
---

The page's text, in Markdown.
```

A home section has no description; it takes a small line above its title
(`eyebrow`), its title, and the part of the title shown highlighted
(`highlight`, copied exactly from the title, optional):

```markdown
---
eyebrow: The teaching
title: What the Tipiṭaka is
highlight: Tipiṭaka
---

The section's text, in Markdown.
```

A blog post adds its date, and may add an image for link previews:

```markdown
---
title: The search is online
description: …
date: 2026-10-14
image: images/search-home.jpg
---
```

## Building the site

Astro, generated as static pages (`dist/`), Tailwind 4, no ui-lib
dependency: the theme tokens (`src/styles/theme.css`), the lotus
(`src/assets/lotus.png`) and the favicon are copied by hand from
**ui-lib v0.1.1** (`style/theme.css`; search-front's `lotus.png` and
`favicon.ico`). Taking a newer tag is a manual copy.

Node is pinned in `.nvmrc` (CI reads it) and Astro exactly in
`package.json`.

```
npm ci
npm run dev        # http://localhost:4321
npm run build      # fails, naming file, line and rule, when a content rule is broken
npm run check      # astro check
npx vitest run --coverage                         # src/lib
npx vitest run --config vitest.dist.config.ts     # over dist/, after a build
npx vitest run --config vitest.e2e.config.ts      # real builds of fixture sites
```

`SITE_URL` is the origin of the build (`https://palicanon.app`); default
`http://localhost:4321`. `CONTENT_DIR` points the build at another content
folder (the tests use it).

## SEO

Everything a page and the sitemap say about it comes from `src/lib/seo/`
(with `url`, `translations` and `lastmod` behind it), so the `<head>`, the
sitemap and the tests agree:

- the `<title>` is `<title> · PaliCanon`; a home page's title is its content
  title alone; a 404 is `noindex`;
- the canonical is the page's own address; `hreflang` lists the languages the
  page exists in plus `x-default` (English), in the head and in the sitemap
  (`<xhtml:link>`), with each page's `lastmod` (its last git commit; CI
  fetches the full history);
- Open Graph and Twitter card on every page; the preview image is the post's
  `image` when given, else the default card of the language. A post's image is
  optimised (cropped to 1200 x 630) only when it is in this repository's
  `content/images/`: a `CONTENT_DIR` elsewhere uses the default card;
- structured data (JSON-LD): Organization and WebSite on each home page,
  MobileApplication on the Tipiṭaka page, BlogPosting on each post; no rating;
- `robots.txt`: the search and answer bots are allowed and the bots that
  collect text to train models are refused. The two lists are `ALLOWED_BOTS`
  and `DISALLOWED_BOTS` in `src/lib/seo/robots.ts`.

The default cards (`public/og/default-<lang>.png`, 1200 x 630) and the lotus
logo (`public/og/lotus.png`) are committed. Run `node scripts/make-og.mjs`
(it needs Chrome; `CHROME_PATH` names it) when a home page's title changes,
then commit the images.

CI (`.github/workflows/seo.yml`) runs the checks over `dist/`, Lighthouse CI
(accessibility, SEO and best practices at 100) and axe on every page.
Lighthouse audits a copy of `dist/` without the CSP meta, because the CSP
(`connect-src 'none'`) blocks the robots.txt fetch Lighthouse makes from the
page; the shipped CSP is tested by `test/dist/head.test.ts`.

## The content rules

Checked before any page is generated (`src/lib/content-check.ts`); a broken
one fails the build with `file:line [rule] message`:

- front matter: `title`, `description` (at most 160 characters), blog
  `date` (`YYYY-MM-DD`), optional blog `image: images/<file>`; nothing else;
- exactly one `#` heading, which is the page's h1 (a home section has none:
  its title is its h2, and any `#` in its text is an error);
- every image has a description (`![description](images/file.jpg)`) and exists
  in `content/images/` (`image-missing` for the text, `frontmatter-image-missing`
  for a blog `image:`); a blog `image:` is `images/<file name>`
  with no sub-folder, as images live flat in `content/images/`
  (`frontmatter-image-not-in-images`: any other path is refused, not turned
  into the default card);
- no raw HTML;
- the content folder exists and holds Markdown (`content-missing`,
  `content-empty`);
- the 8 main pages exist in `en`, `fr` and `vi`; no other page name (a
  `blog.md` is refused: `blog/` is the folder of the posts);
- a home section has `title`, and optionally `eyebrow` and `highlight` (a part
  of the title, copied exactly: otherwise `highlight-not-in-title`); no
  description; the 4 sections (`teaching`, `search`, `viz`, `learn`) exist in
  every language and no other name is a section. They are shown on the home
  page, after `index.md`, in that order, each scene (its title, the whole
  card and a gold button under its text) leading to its project page: the
  teaching to the Tipiṭaka app page, the others to the search,
  map and learning pages. On those four pages, the last paragraph, when it
  holds only one link (the link to the app or the service), shows as a gold
  button at the top, in the page's header card: centred under its first
  paragraph on a phone, beside it on the right, under the drawing, on a
  wider screen. Every page but the home starts its bar with a back arrow
  to the home of its language.

## Deploying

Cloudflare Workers static assets, no Worker script (`wrangler.jsonc`):
`.github/workflows/deploy.yml` builds and uploads. A push to main deploys
dev, `www-dev` at https://dev.palicanon.app (SITE_URL of that build, every
response `X-Robots-Tag: noindex` through `scripts/noindex.sh`), then
checks the host (`scripts/deploy-check.sh`); a `v*` tag deploys prod,
`www-prod`, built for https://palicanon.app and indexable, then checks
https://palicanon.app the same way (`index` form: no noindex, and
`/support` and `/legal` end at a 200 on exactly their slash form
(`/support/`, `/legal/`), `www.` is a 301 to the apex, `/daily.json` is a 404, the IndexNow key is
served unchanged). Both forms check that `/acknowledgements`, `/terms` and
`/privacy` answer 301 to search.palicanon.app and that the redirects,
followed (at most 5), end at a 200 on that host. The response headers are
`public/_headers`. The custom domains are in `infra/`
(tofu, applied by hand: `infra/README.md`).

`public/_redirects` sends the old site's `/acknowledgements`, `/terms` and
`/privacy` to https://search.palicanon.app (301, absolute targets, both
slash forms); `/support` and `/legal` are pages here. The home ignores `?q=`;
`www` is the zone's Redirect Rules, set in the dashboard.
`public/ea61cff5ec8386a25c60f8d2ea079010.txt` is the old site's IndexNow
key, carried over unchanged so the search engines keep trusting the host.

When the host check runs in GitHub Actions and Cloudflare challenges the
runner, `scripts/deploy-check.sh` exits with code 3 and the workflow logs a
warning; the job stays green and the check must be re-run by hand from your
laptop.

```
bash scripts/deploy-check.test.sh                         # the check, over a stub curl
scripts/deploy-check.sh https://dev.palicanon.app noindex # the live dev host
scripts/deploy-check.sh https://palicanon.app index       # the live prod host
```

## Licence

CC-BY-NC-4.0 (`LICENSE`).
