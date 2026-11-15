# 019 — Editorial showcase redesign

status: ready-to-merge
rank: 2
level: small

Difficulty 2, risk 2: a bounded static-site presentation change, local image
assets and manual carousel navigation. No authentication, API, persistence
or deployment behavior changes. The repository's light path applies.

## Request

Review Taste Skill, Landing Page Design and UI UX Pro Max, redesign this
showcase and run it locally for the user's visual review. On 2026-11-15,
after the screenshot-driven revisions and the selected parallels view, the
user approved the result and requested the merge: "looks good, nerge".
Production deployment is not requested.

## Skills reviewed

- [Taste Skill](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md):
  strong emphasis on actual product images, deliberate typography, consistent
  edges and visible keyboard focus. Its current 2.5.1 instructions also
  prescribe randomly dealt layouts, mandatory effects and full-screen
  sections. Those prescriptions do not fit this content-led, non-commercial
  project or its existing compact-scroll requirement. No toolkit or hooks
  installed; useful design principles retained.
- [Landing Page Design](https://github.com/2389-research/landing-page-design/blob/main/skills/SKILL.md):
  clear opening, coherent section composition and contextual actions. The
  site's existing author-owned Markdown supplies the copy; no conversion
  claims, customer logos, testimonials or pricing invented.
- [UI UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill/blob/main/.claude/skills/ui-ux-pro-max/SKILL.md):
  useful priority order for accessibility, touch targets, responsive layout,
  performance and motion preferences. Reviewed the instructions; the database
  generator was not run. The palette and composition below are project-specific
  design choices, not recommendations attributed to that generator.

## Design

The user rejected the first version as too restrained and lacking character.
The second direction is ink, light and a lotus: a continuous navy opening,
large Newsreader typography, warm gold actions, and a photographic lotus
composed for the site. Source Sans 3 handles the body and navigation. Both
fonts are self-hosted and include Vietnamese and extended Latin.

The opening keeps the original layout and paragraph; the user requested the
English heading's capitalization change from "the end" to "The end". The generated artwork
is a symbolic brand visual, marked decorative, not a product photograph.
On mobile the flower occupies its own space below the copy. Four translated
verbs provide direct tool navigation. The teaching section shows the actual
Tipiṭaka reader, cropped from existing promotional artwork in CSS. At the
user's latest request, every home section now follows that accepted fixed
composition: one actual screenshot beside a different botanical photograph.
Reading uses the lotus bud; search uses a leaf with dew; the map uses pond
leaves behind the parallels view selected by the user (`screens/viz/parallels.jpg`);
learning uses bodhi leaves behind a real vocabulary card. The same
photographic identity follows each tool into its product-page masthead.
They use responsive AVIF/WebP images,
with decorative semantics. On small screens, masthead imagery has its own
space below the copy. [Asset paths and final prompts](019-photographic-assets.md).
The original section order remains intact; the requested capital T is the
only Markdown copy change.

Desktop navigation is visible. Small screens use a native details menu,
usable without JavaScript. The header stays in view and language switching
retains its existing behavior. Following the user's screenshot feedback, the
accepted lotus opening remains intact, and the ink, ivory and warm gold
palette now extends to every page, menu, section and carousel. This showcase
keeps that palette independently of the apps' shared theme preference; the
saved preference is not modified.

All four product pages now hold their complete screenshot galleries after
the description, following the Tipiṭaka page's structure. The home contains
no carousel. The learning gallery uses the existing five real screenshots
and translations from search-front's support page.

These manual screenshot sliders loop continuously in both directions using
buttons, arrow keys or native horizontal scrolling. Decorative, inert copies
provide matching neighbours at each end; after scrolling settles, the track
recenters on the corresponding original. There is no autoplay. Only the
original screenshots enter the accessibility tree. Without JavaScript the
original native scrollable list remains usable. Reduced motion skips smooth
scrolling and the opening animation.

The new presentation is scoped in `src/styles/showcase.css`, loaded after
the existing theme. Existing routes, metadata and external service
destinations are unchanged.

## Validation

- Astro check: 0 errors, warnings or hints.
- Build: 40 static pages.
- Unit and interaction tests: 376 passed, 100% measured line coverage.
- Carousel event tests cover repeated wraps in both directions, keyboard and
  reduced motion, swipe settling without `scrollend`, resize preservation,
  single-card handling and duplicate accessibility suppression. These tests
  use controlled geometry; they do not validate browser scroll physics.
- ESLint on changed components, script and navigation tests: passed.
- Prettier on changed production files and `git diff --check`: passed.
- Current palette: ten foreground/background pairs exceed 4.5:1 (minimum 7.43).
- Current HTTP preview: English and French homes and all four English product
  pages return 200. Each home has four static compositions and no carousel;
  each product page has one gallery between its description and footer.
  Both new decorative images return 200 from the image-optimization endpoint.
  Their served CSS contains the fixed ink/ivory/gold tokens and no previous
  light or ochre surface. The served script contains the carousel loop.
- Generated-page tests: 1,391 passed after all four home compositions became
  static and the four dedicated product galleries were placed on their pages.
- The running Astro process retained the old inline CSS while updating markup.
  Restarted the owned preview process; HTTP output now contains the new
  `hero-art` CSS and reader, with no old `folio__book` CSS.
- Lotus AVIF variants are approximately 6–20 KB; WebP variants 9–32 KB.
- New botanical AVIF variants are approximately 3–21 KB. The generated source
  files were inspected; their light, botanical details and negative space
  match the accepted direction. No browser screenshot of the new layout
  could be taken with the unavailable browser access host.
- The photographic mastheads supersede the earlier map drawing presentation;
  its four rendering-specific point-cloud tests were retired. Existing
  masthead-presence checks now accept the decorative photograph as well as
  the drawings retained on informational pages.

Final merge checks ran with the repository's Node 24.21.0 after rebasing on
`a7e3d228e646ae47f3f4f79aa2a98762a52e202f`; implementation revision
`4a81b51192db91eda4c8af84f226aa9ae96e9ce1`. `npm ci`, full Prettier and
ESLint, Astro check, unit coverage, fixture builds, the production build and
generated-page tests passed. There are 368 unit tests after upstream removed
the eight obsolete infrastructure tests. `npm audit --audit-level=high`
passed; ten moderate tooling vulnerabilities remain in the existing
dependency tree. Container and browser audits run in hosted CI; Docker is
not installed locally. The local `infra/.terraform/` cache became untracked
after upstream removed the infrastructure module; it is preserved and not
part of this change.

Hosted CI passed the container build and Lighthouse. The full-page axe pass
identified low contrast during the opening copy's opacity animation and on
blog-list dates inheriting the apps' light-theme subtle color. The opening
now moves without fading its text or actions; subtle text uses the showcase's
muted token. The accepted artwork, palette and final layout are unchanged.

Review outcome: no merge-blocking issue found in the local diff review.
The user's visual approval covers the final screenshots and selected map
view. No broader architecture or unrelated dependency update was added.
Retro: the user's screenshots established the approved composition; reuse
the real product images, keep decoration separate, and inspect the served
CSS after restarting Astro when visual changes appear stale.

Earlier design checks used the available Node 26.8.1.
The browser access host is unavailable (no browser surfaces), so visual
desktop/mobile inspection and interactive browser validation remain unverified.
Existing CSS tests encode parts of the previous presentation; they do not
substitute for that visual review.

## Preview

`http://127.0.0.1:4321/fr/` — Astro development server for this checkout,
started with `npm run dev -- --host 127.0.0.1`. The server is left running
for the requested review. Branch: `feat/www-editorial-redesign`.

## Generated asset

Built-in `image_gen` was used, not the CLI or an API key. The selected image
is saved at `src/assets/lotus-pond-v2.png` and optimized by Astro at build time.
The original generated file remains in the tool's output directory.

Final prompt:

> Use case: photorealistic-natural. Asset type: photographic hero artwork for the PaliCanon website, a free non-commercial library of early Buddhist texts. Generate one wide cinematic photograph, landscape 3:2 ratio. A single exquisite ivory-white lotus flower with a subtly warm golden center rising above a perfectly still deep blue-black pond at dusk. The open lotus is positioned in the right third, framed in side profile, petals luminous with natural fine veins, a real green stem touching the water, soft reflection below, one or two understated dark round lotus leaves at the lower right edge. Large tranquil dark negative space across the entire left half, nearly uniform deep ink navy #101e28, for white website typography to be overlaid in HTML. Natural soft side light, restrained fine-art botanical photography, realistic textures, high-end photographic color grading, quiet beauty. Flower occupies roughly 40 percent of image height. Deep navy and muted warm ivory palette, no neon teal. No text, no letters, no people, no statues, no temple, no logo, no watermark, no UI, no book, no visual effects, no gold particles, no ornate frame. This is a symbolic brand image, not an app screenshot.
