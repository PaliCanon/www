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

## Licence

CC-BY-NC-4.0 (`LICENSE`).
