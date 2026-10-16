# 008 Prettier ignores infra/.terraform

status: merged · rank: 1 · level: simple · type: chore · request: 005 · light path

## Summary
Rank: difficulty 1 (one line in `.prettierignore`), impact 1 → 1. Light path, one Haiku lane.
Found at 005's merge gate (2026-10-16): `tofu init` run inside the worktree created `infra/.terraform/` (gitignored) and `npm run format:check` then failed on `infra/.terraform/providers/…/CHANGELOG.md`. Rule: `.prettierignore` lists `infra/.terraform/` (and `.terraform/` anywhere) so a local init never fails the format check. Test: `npm run format:check` passes with a dummy `infra/.terraform/x.md` of broken formatting present (red before: it fails), the dummy removed after.

## Log
| Step | Result | Output |
| --- | --- | --- |
| Define | done | orchestrator, 2026-10-16 (light path) |
| Build | done | lane (Haiku), commit c2d2870, red: `[warn] infra/.terraform/x.md` + `Code style issues found`, green: `All matched files use Prettier code style!`, lint ✓ 0 |

## Retro
One line (light path): a tool run inside a worktree (tofu init) leaves files a linter scans; the ignore list names them (claude-memory tofu-init-in-a-worktree).

## Merge
c014613 on main, 2026-10-16.
