# 001 The showcase at palicanon.app — definition

status: design · rank: 6 · level: hard · type: feature (a new repository) · request: user, 2026-10-13 ("un site vitrine sur palicanon.app présentant les différents services. J'aimerais bien les écrire manuellement. Mais j'aimerais que tu fasses le SEO etc. Le design doit être façon website vitrine 2026.") · session: www-001-showcase · process: ../../docs/workflows/requirements.mmd, then development-process.mmd

## Summary
Rank: difficulty 5 (a new repository and its stack, static generation in three languages, SEO done properly, a design to define, the cutover of palicanon.app from today's site with its old URLs), impact 7 (the project's front door and its search ranking; a wrong cutover breaks every link to palicanon.app) → 6. Level hard: a domain cutover.
Ground (docs decisions.md 2026-10-08): `www` serves palicanon.app, presents the services and links to them (search.palicanon.app, learn.palicanon.app); today's site (palisearch `web/`, React on Cloudflare Pages) keeps palicanon.app until then, and its `/?q=` redirects to search.palicanon.app. repos.md: `www` is static, holds no search and no service.
The user writes the content by hand; the orchestrator's side: structure, SEO, the build, the design, the deploy.

## Requirements
(answers written here as they come, before anything is drawn — prompts/requirements/product.md)

## Log
| Step | Result | Output |
| --- | --- | --- |
| Ground | done | orchestrator, 2026-10-13: decisions 2026-10-08, repos.md; no `www` repository yet (local folder holds this task file only, no remote) |
