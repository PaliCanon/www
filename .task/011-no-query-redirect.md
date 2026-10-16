# 011 No /?q= redirect on palicanon.app

status: merged · rank: 2 · level: simple · type: chore · request: 006 · light path

## Summary
Rank: difficulty 2 (one check and its cases removed, docs), impact 2 (the prod host check no longer asserts a rule that will not exist) → 2. Light path, one Haiku lane.
Decision (user, 2026-10-16, docs decisions.md 774a27b: "puisque le search ne l'utilise pas, tu peux virer"): the showcase does not forward `palicanon.app/?q=…` to the search; the old site's search URLs land on the showcase's home. 006 had put that rule in the user's dashboard steps and asserted it in `scripts/deploy-check.sh` (index form, `moved_query`). Rule: remove `moved_query` and its call, its shell cases, and every mention of the `/?q=` redirect in the script's header, the README and `.task/006-cutover.md`'s After-the-merge note (one line there: dropped by the user, 011). The www → apex rule and its check stay. Tests: the shell suite without the `/?q=` cases passes; a case asserting the index form passes when `/?q=metta` answers 200 (the home) is added.

## Log
| Step | Result | Output |
| --- | --- | --- |
| Define | done | orchestrator, 2026-10-16 (light path) |
| Build | done | lane (Haiku), f2bb5cd, red: `FAIL /?q=metta: status 200 (want 301)`, green: 68 passed, vitest 315 passed, lint and format clean |

## Retro
One line (light path): a cutover rule the product does not need (the old site's search URLs) is dropped with its check the same day it is questioned; the decision is written before the code (decisions.md 774a27b).

## Merge
dfb14b5 on main, 2026-10-16.
