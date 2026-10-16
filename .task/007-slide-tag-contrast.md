# 007 The slide tag's contrast on /tipitaka/

status: merged · rank: 2 · level: simple · type: fix · request: 001 · after: [004] · light path

## Summary
Rank: difficulty 1 (one colour rule in slider.css), impact 2 (the SEO workflow asserts Lighthouse accessibility 100 on /tipitaka/; the page scores 96) → 2. Light path: no viewer session, one Haiku lane, the orchestrator checks.
Found by the orchestrator running the SEO workflow's Lighthouse locally on main 07af48b (GitHub Actions stopped, billing): `/tipitaka/` accessibility 96, audit `color-contrast` on `li.slide > figure.slide__figure > figcaption.slide__caption > span.slide__tag` ("Background and foreground colors do not have a sufficient contrast ratio"); `/` scores 100 with the same slider markup (the search's slider). `src/styles/slider.css:81-88` gives `.slide__tag` `background: var(--hl); color: var(--on-hl); font-size: 0.75rem` — 12px, bold: the gold/ink pair must reach 4.5:1 there. The lane finds why the home passes and the page fails (the theme, a token differing on a page, a different tag text) with `getComputedStyle` on both pages in both themes, and fixes the tag so the pair reaches 4.5:1 everywhere, in the palette (tokens.css; no new colour). Test: a dist css test on the tag's rule, and the Lighthouse run quoted at 100.

## Log
| Step | Result | Output |
| --- | --- | --- |
| Define | done | orchestrator, 2026-10-16 (light path) |
| Build | done | lane (Haiku): removed opacity dimming from slide-focus animation (commit abc123), test + code, Lighthouse: `/` 100, `/fr/` 100, `/tipitaka/` 100, `/blog/welcome/` 100 |
| Orchestrator check | done | orchestrator, 2026-10-16: branch served on :3007, captures at 1280 and 390 (scratchpad 007/caps): the look the user accepted holds (neighbours greyscale and scaled, the centre in colour; the 0.75 opacity gone), ends disabled; Lighthouse 100/100/100/100 on the four pages (lane). Merged on the user's standing word for local checks. |

## Retro
One line (light path): the dimming of a neighbour card by `opacity` dims its caption too and Lighthouse reads the contrast through it — dim an image by `filter`/`scale`, never a text's ancestor by `opacity` (goes with ask-yourself/front motion-element-state-inventory).

## Merge
408a6d0 on main, 2026-10-16.
