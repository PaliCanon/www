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
| Home | `content/en/index.md` → `/` | `content/fr/index.md` → `/fr/` | `content/vi/index.md` → `/vi/` |
| The search | `content/en/search.md` → `/search/` | `content/fr/search.md` → `/fr/search/` | `content/vi/search.md` → `/vi/search/` |
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

A blog post adds its date, and may add an image for link previews:

```markdown
---
title: The search is online
description: …
date: 2026-10-14
image: images/search-home.jpg
---
```

## Licence

CC-BY-NC-4.0 (`LICENSE`).
