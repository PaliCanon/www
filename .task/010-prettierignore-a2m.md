# 010 Prettier ignores the a2m caches

status: building · rank: 1 · level: simple · type: chore · request: 006 · light path

## Summary
Rank: difficulty 1 (one line in `.prettierignore`), impact 1 → 1. Light path, one Haiku lane.

Found at 006's fix rounds (2026-10-16): the reviewer's a2m runs leave `.a2m/cache/**/index.json` in a worktree (gitignored) and `npm run format:check` then fails on them. Rule: `.prettierignore` lists `.a2m/`, as it lists `.terraform/` since 008. Test: `npm run format:check` passes with a dummy `.a2m/cache/x.json` of broken formatting present (red before), the dummy removed after.

## Log
| Step | Result | Output |
| --- | --- | --- |
| Define | done | orchestrator, 2026-10-16 (light path) |
| Build | done | lane (Haiku), c37485e, red: "Code style issues found in .a2m/cache/x.json", green: "All matched files use Prettier code style!" |

## Retro
One line (light path): every tool that leaves files in a worktree (tofu init, a2m) has its line in the ignore list of each linter (008, 010).
