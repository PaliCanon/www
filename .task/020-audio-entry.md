# 020 Audio entry

status: review, rank: 2 — difficulty 1 (one entry, one string, the same in every PaliCanon site), impact 2 (a link to the new audio site)
level: simple
request: the user, 2026-11-16: «oui, mais il faut aussi dans about je crois, et dans le site vitrine»
repository: www (light path: no Studio conversation)

## Summary
Audio becomes the fifth service: content/<lang>/audio.md and content/<lang>/home/audio.md in en/fr/vi, header, explore nav, home section, SERVICE_LINKS.audio, README; acknowledgements gain "The voice" (Chatterbox, Resemble AI, MIT). No screenshot yet (SCREENS.audio empty; the home scene gets a min-height stage).

## Log
| Step | Result | Output |
|---|---|---|
| Build | green | 07ea6a3 fix(www): give the Audio scene a stage when it has no screenshot;03d2af6 feat(www): add Audio as a fifth service, after Map |
| Verify | green | prettier, eslint, astro check, build, vitest with coverage (369), dist vitest (1499), e2e config (34), npm audit: exit 0. Not run: lychee (not installed), container-test (no docker). |
| Open | — | The Audio copy is the agent's wording: the user reads it before the push. Privacy page row for Audio's cookies, screenshots, the stale acknowledgements date: follow-ups. |

## Retro
One line: the brief assumed an about page with a services list; none exists in the Rust sites (their footers link to palicanon.app/acknowledgements), so the brief was checked against the code before cutting.
