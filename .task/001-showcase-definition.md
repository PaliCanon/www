# 001 The showcase at palicanon.app — definition

status: validated · rank: 6 · level: hard · type: feature (a new repository) · request: user, 2026-10-13 ("un site vitrine sur palicanon.app présentant les différents services. J'aimerais bien les écrire manuellement. Mais j'aimerais que tu fasses le SEO etc. Le design doit être façon website vitrine 2026.") · session: www-001-showcase · process: ../../docs/workflows/requirements.mmd, then development-process.mmd

## Summary
Rank: difficulty 5 (a new repository and its stack, static generation in three languages, SEO done properly, a design to define, the cutover of palicanon.app from today's site with its old URLs), impact 7 (the project's front door and its search ranking; a wrong cutover breaks every link to palicanon.app) → 6. Level hard: a domain cutover.
Ground (docs decisions.md 2026-10-08): `www` serves palicanon.app, presents the services and links to them (search.palicanon.app, learn.palicanon.app); today's site (palisearch `web/`, React on Cloudflare Pages) keeps palicanon.app until then, and its `/?q=` redirects to search.palicanon.app. repos.md: `www` is static, holds no search and no service.
The user writes the content by hand; the orchestrator's side: structure, SEO, the build, the design, the deploy.

## Requirements
(answers written here as they come, before anything is drawn — prompts/requirements/product.md)

Round 1 (user, 2026-10-13):
- Languages: en, fr, vi; `/`, `/fr/`, `/vi/`.
- Structure: a home page presenting each service briefly, a page per service, and a blog (news, guides).
- v1 content: the search, learning Pāli, the Tipiṭaka iPhone app, the project and support (who, why, free and non-commercial, Ko-fi, Instagram, the legal pages).
- Writing: Markdown in the repository, one file per page and language; the site rebuilds on push.

Round 2 (user, 2026-10-13):
- Stack: "un truc vraiment propre. Ce serait bien en Leptos, façon Astro pour la nav/design" — Leptos with ui-lib, generated statically, with Astro-like navigation and design (pages pre-rendered, view transitions between pages, content from Markdown files at build time). The Zola / Astro recommendation is ruled out by the user.
- Design: the user shows reference sites; the design starts from them (pending).
- AI crawlers: search and answer bots allowed (they cite), training bots blocked (GPTBot, CCBot, Google-Extended, ClaudeBot's training use…) in robots.txt.
- Links between services: "le site vitrine avec un lien vers les sous-domaines, le site du sous-domaine lui a dans le site lui-même les autres liens vers les sous-domaines" — the showcase links to each service; each service links to the others from inside (ui-lib's rail entries, memory nav-rail-services), and back to the showcase. The old URLs of today's palicanon.app: not answered (the 2026-10-08 decision stands: `/?q=` redirects to the search; the rest asked again at the cutover).

Scope (user, 2026-10-14: "la recherche et le site vitrine sont différentes choses. La vitrine présentera et renverra vers le site web"): the showcase and the search are two separate sites. The showcase presents each service and links to its site; the SEO work of this task is the showcase's only. The search's own SEO is out of scope.

Research (researcher, discussion #5942–#5944): a content-first page, a bento of three tiles (Search, Learn, Tipiṭaka) with real screenshots light and dark, a phone frame for the iOS app only, short motion under reduced-motion, no testimonials or counters; SEO checklist (hreflang both ways + x-default in the sitemap, self-canonicals, OG per page, JSON-LD Organization/WebSite/MobileApplication without a fabricated rating, no SearchAction effect since 2024-11, `/?q=` needs a zone Redirect Rule, 301 per old URL, Search Console domain property + Bing); stack recommendation Zola + Tailwind 4 standalone on Cloudflare Workers static assets (alternatives Astro, Leptos SSG); targets LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1, Lighthouse 100, WCAG 2.2 AA (gold on parchment contrast, focus not hidden, 24 px targets, lang per page, Pāli and Vietnamese diacritics in the font).

## Requirements draft (step 4)
- **The need**: palicanon.app presents the PaliCanon services and links to their own sites; the user writes every page in Markdown, the team builds the site, its SEO, its design and its deploy.
- **Content**: `content/<lang>/{index,search,learn,tipitaka,about,support,legal}.md` and `content/<lang>/blog/<slug>.md` (README "Writing the content"); front matter `title`, `description` (≤ 160), blog `date`, optional `image`. The three languages of a page share its file name.
- **Acceptance**: every page in en/fr/vi at `/`, `/fr/`, `/vi/`; a missing title or description fails the build; Lighthouse 100 in the four categories on the home and a service page; hreflang both ways with x-default, valid sitemap with alternates, robots.txt with the AI policy, valid JSON-LD (Rich Results test), OG preview per page; works with no JavaScript; phone and desktop; the old `/?q=` links reach the search after the cutover.
- **Out of scope**: the search's own SEO; comments, newsletter, analytics with cookies; a CMS.
- **Open**: the design (the user's reference sites); the dev host of the showcase; the list of today's site URLs to redirect (at 005).
- **Stack** (user, 2026-10-14): Astro static, no ui-lib dependency (tokens and lotus copied at a tag); raw HTML in Markdown forbidden.
- **Cut** (design v6): 002 skeleton (Astro, content rules, plain pages, CI) → 003 SEO, 004 design (the user's reference sites), 005 deploy to dev.palicanon.app, in parallel → go / no-go → 006 cutover of palicanon.app.
- **Noted for 005**: v6 says dev behind Cloudflare Access; learn-pali found the Cloudflare token refuses Access (decision 2026-10-13); 005 settles it (noindex either way).

## Design
Viewer: www-001-showcase/design v6, validated by the user 2026-10-14 ("Validé"); consensus summary discussion #6100.
```mermaid
flowchart TB
  classDef t2 fill:#e8f1ff,stroke:#4a6fa5,color:#13243d
  classDef t3 fill:#eef7ec,stroke:#4f8a3c,color:#1b3312
  classDef t4 fill:#fdf2e9,stroke:#d9822b,color:#4a2a00
  classDef t5 fill:#f3eefc,stroke:#7a5bb5,color:#2a1a45
  classDef t6 fill:#fbeaf0,stroke:#b5476e,color:#45101f
  classDef user fill:#fff8d6,stroke:#b59a00,color:#3a3000
  classDef err fill:#fde8e8,stroke:#c0392b,color:#5a1010

  W["The user writes content/&lt;lang&gt;/&lt;page&gt;.md, content/&lt;lang&gt;/blog/&lt;slug&gt;.md, content/images/ (front matter: title, description; blog: date, image). Paths unchanged (README)"]:::user

  subgraph T2["002 Skeleton: Astro static site, the content rules, plain pages, CI"]
    LOAD["Astro content collections read content/ as it is (glob loader, base ./content): pages = */*.md, blog = */blog/*.md; the language is the first folder; a remark plugin maps images/… to content/images/"]:::t2
    RULES["content rules, all in src/lib with their failure tests: schema.ts (zod, strict: title, description at most 160, blog date, optional image; unknown key fails); remark-rules.ts naming file and line: exactly one # heading (the page's only h1), image alt not empty, no raw HTML (user: forbidden); completeness.ts: the 7 main pages exist in en, fr and vi, checked before any route is generated"]:::t2
    FAIL["astro build fails: names the file, the line and the rule; nothing is deployed"]:::err
    ROUTES["routes: i18n en default at /, /fr/, /vi/ (prefixDefaultLocale false), trailingSlash always, build.format directory; getStaticPaths from the collections; the file name is the translation key; a blog post missing in a language is not generated there and has no hreflang to it; /blog/ in every language (empty state); internal links checked"]:::t2
    PAGE["src/lib: one url(lang, slug) = SITE_URL + path ending in /; translations(entry) = its existing languages; lastmod = last git commit of its file (CI checks out full history). Head, sitemap and links all call these"]:::t2
    SSG["astro build, output static, no adapter: dist/&lt;path&gt;/index.html, 404.html; assets content-hashed under _astro/; astro:assets images AVIF and WebP with width and height; SITE_URL from the environment, default http://localhost:4321"]:::t2
    SHELL["no ui-lib dependency: theme tokens (CSS custom properties), lotus SVG and the footer's look copied by hand from ui-lib at a tag; the README names the tag"]:::t2
    NAV["navigation with no JS framework: real links; language switcher = links to the page's existing translations; phone menu = HTML popover; view transitions in CSS cross-document (@view-transition navigation: auto), not Astro's ClientRouter; off under reduced motion"]:::t2
    JS["one script is:inline under 1 KB (its source in src/lib/theme-script.ts), first in head before any stylesheet, allowed by its sha256 computed by a tested src/lib helper and written into the CSP meta tag (not Astro's csp option): applies the pc_theme cookie before paint; a language link writes pc_lang (shared by *.palicanon.app). The URL is the language's only source: pc_lang is written, never read, no redirect. Without JS: system theme, every link works"]:::t2
    SLOTS["files and owners: Head.astro, src/lib/seo/, sitemap.xml.ts, robots.txt.ts, .github/workflows/seo.yml (003); layouts/, components/ except Head, src/styles/ (004); public/_headers, wrangler.jsonc, infra/, deploy.yml (005); public/_redirects (006); 002 creates each, minimal; 002 fixes astro.config.mjs for good (site from SITE_URL, i18n, trailingSlash, build.format, the Tailwind plugin) and adds every foreseen npm dependency, so no later task edits astro.config.mjs or package.json"]:::t2
    CSS["Tailwind 4 through @tailwindcss/vite, on the copied tokens"]:::t2
    CI["CI (.github/workflows/ci.yml), Node pinned, npm ci from the lockfile: prettier (plugin-astro), eslint with max-lines-per-function 50, astro check, astro build (the schema and rules run here), vitest with v8 coverage on src/lib (schema, remark rules, completeness, url, translations, lastmod, script hash), vitest over dist/ (every page present, one h1, lang), lychee link check on dist/; npm audit"]:::t2
  end

  subgraph T3["003 SEO"]
    HEAD["Head.astro from src/lib: title, description, canonical, html lang, hreflang both ways + x-default, Open Graph + Twitter card (one default image per language, blog image when given), the CSP meta"]:::t3
    MAP["sitemap.xml endpoint from the same translations() and lastmod, x-default included; robots.txt: search and answer bots allowed, training bots blocked, Sitemap line"]:::t3
    LD["JSON-LD: Organization, WebSite, MobileApplication (no rating), BlogPosting"]:::t3
    SEOCHK["CI (seo.yml): hreflang reciprocity over dist/, sitemap and JSON-LD parsed; Lighthouse CI on dist/ (accessibility, SEO, best practices must be 100; performance reported) and axe on every page"]:::t3
  end

  subgraph T4["004 Design 2026 (from the user's reference sites)"]
    LOOK["layouts and components restyled: home tiles with real screenshots light and dark; service pages; blog list; fonts with Pāli and Vietnamese diacritics; view-transition names; motion short, off under reduced motion"]:::t4
  end

  subgraph T5["005 Deploy to dev"]
    HOST["Cloudflare Workers static assets, no Worker script: dist/ is the only thing it receives; 404.html for unknown paths; public/_headers by hand: frame-ancestors none, HSTS, nosniff, referrer policy, _astro/* immutable, everything else revalidated; push to main builds with SITE_URL https://dev.palicanon.app and deploys it behind Access, X-Robots-Tag noindex"]:::t5
    RT["at request time nothing of ours runs: files only"]:::t5
  end

  subgraph T6["006 Cutover of palicanon.app"]
    GATE["go / no-go: 003, 004, 005 merged; Lighthouse and axe green on dev.palicanon.app; the user checked dev.palicanon.app"]:::t6
    CUT["tag builds with SITE_URL https://palicanon.app and deploys prod; palicanon.app moves from today's site: /?q= to search.palicanon.app (zone Redirect Rule), old URLs 301 one by one (public/_redirects), www to apex; Search Console + Bing"]:::t6
  end

  W --> LOAD --> RULES
  RULES -- "a rule broken" --> FAIL
  RULES -- "all pass" --> ROUTES --> PAGE --> SSG
  SHELL & NAV & JS & SLOTS & CSS --> SSG
  PAGE --> HEAD & MAP & LD
  HEAD & MAP & LD -. "rendered by the build" .-> SSG
  LOOK -. "restyles layouts, components" .-> SSG
  SSG -- "dist/" --> SEOCHK
  SSG -- "dist/ only" --> HOST --> RT
  SEOCHK & LOOK & HOST --> GATE --> CUT```

## Log
| Step | Result | Output |
| --- | --- | --- |
| Ground | done | orchestrator, 2026-10-13: decisions 2026-10-08, repos.md; no `www` repository yet (local folder holds this task file only, no remote) |
| Research | done | researcher: discussion #5942–#5944 |
| Questions round 1 | done | languages, structure (with a blog), v1 content, Markdown |
| Questions round 2 | done | stack Leptos (Astro-like), design from the user's examples (pending), AI: search yes training no, links between services |
| Scope | done | user, 2026-10-14: showcase and search are separate; SEO here is the showcase's |
| Repo init | done | 2026-10-14: PaliCanon/www created (private), CLAUDE.md, README (content layout), LICENSE, the 21 empty pages pushed (848d449); docs 36de594 (repos.md, task-check REPOS); viewer workspace www existed. CI and main protection come with 002 (the crate). |
| Requirements draft | done | this file; design v1 to consensus |
| Content drafts | done | user, 2026-10-14: "commence les md, un truc basic pour avoir un rendu"; dev host: dev.palicanon.app. 21 pages + blog/welcome.md in en/fr/vi, first drafts by the orchestrator for the user to rewrite. |
| Design v4 answer | revised | user, 2026-10-14: "Je ne pense pas qu'on ait besoin de Leptos pour le site vitrine", then Astro chosen over Zola; raw HTML in Markdown forbidden ("pas besoin de vidéo"). Stack reopened by the user: Astro static, ui-lib's tokens and lotus copied at a tag; consensus revises to v5. |
| Design consensus | done | consensus agent: v6, lenses contract, cache, seam, simplify, coupling, test; gemini and deep answered every round (#6024–#6097); summary #6100 |
| Validation | done | user, 2026-10-14: "Validé" (v6) |
