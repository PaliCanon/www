# 009 deploy-check: a Cloudflare challenge is a skip, not a failure

status: building · rank: 2 · level: simple · type: fix · request: 005 · light path

## Summary

Rank: difficulty 2 (one branch in a shell script and its workflow step), impact 2 (every dev deploy's host check from a GitHub runner) → 2. Light path, one Haiku lane.

Found 2026-10-16 at the first CI deploy of www (run 38884031419): the upload succeeded, then `scripts/deploy-check.sh https://dev.palicanon.app noindex` failed six times with "Cloudflare challenged the runner (cf-mitigated: challenge)" — Cloudflare challenges GitHub's runners; from the laptop the same check is OK. deploy.md: "a Cloudflare challenge is a skip the orchestrator re-runs by hand, never a pass"; search-front's `scripts/rollout-check.sh` exits 3 on `cf-mitigated` ("challenged").

Rule: `deploy-check.sh` exits 3 (not 1) when a `cf-mitigated` header answers, with one line "deploy-check: challenge: Cloudflare challenged this runner; re-run `scripts/deploy-check.sh <url> …` by hand" and no further checks; `deploy.yml`'s check step treats exit 3 as a warning in the job summary (`::warning::` + `$GITHUB_STEP_SUMMARY`) and does not fail the job; any other non-zero exit still fails.

Tests: `scripts/deploy-check.test.sh` gains the case "a challenged response exits 3 and runs no further check"; `test/deploy.test.ts` (the workflow's tests) asserts the step's handling of exit 3.

## Log

| Step | Result | Output |
| --- | --- | --- |
| Define | done | orchestrator, 2026-10-16 (light path) |
| Build | done | lane (Haiku): b4b0fdf, 26 bash tests passed, 306 TypeScript tests passed (coverage 99.73%), format check clean, lint clean |
| Orchestrator check | done | orchestrator, 2026-10-16: diff read — `challenged()` exits 3 on `cf-mitigated` before any `fail`, the workflow step turns 3 into a warning and a summary line, other exits still fail; 26 shell cases, vitest 306; the same rule as search-front's rollout-check (deploy.md). |

## Retro
One line (light path): a host check from a GitHub runner meets Cloudflare's challenge; every deploy check treats a challenge as a skip to re-run by hand, never a failure nor a pass (deploy.md; search-front 018, www 009).
