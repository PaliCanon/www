# 016 Images on GHCR, no cloud account in the workflow

status: merged · rank: 2 · level: simple · type: chore · request: user, 2026-11-13 («Passer à GHCR … Aller!», «quand tout est bon on vire cloudrun») · light path

## Summary
Rank: difficulty 2 (one workflow job, its shape test, two doc paragraphs), impact 2 (a tag pushes the image to another registry; prod, on ssh.lsh.tech, runs by digest and is not touched) → 2.
Everything PaliCanon serves runs on the user's server (Lsh0x/lsh-tech, `stacks/palicanon/prod`). This repository never had Cloud Run, so only the registry changes: the `image` job of `deploy.yml` builds and pushes `ghcr.io/palicanon/www` (tags `h-<hash of the tracked inputs>`, same computation as before, and the release tag), logs in with `docker/login-action` (actor, `GITHUB_TOKEN`), has `packages: write` and no identity token, labels the image `org.opencontainers.image.source`, skips the build when the `h-` tag exists on GHCR (`docker buildx imagetools inspect`; the release tag is then added with `imagetools create`), and writes `ghcr.io/palicanon/www@sha256:…` and the `h-` tag to the job summary. The GCP auth, `setup-gcloud` and `configure-docker` steps are gone: nothing else in the repo needs GCP. `test/deploy.test.ts` rewritten first (8 red against the old workflow). READMEs updated. No application code changed; `infra/` is untouched (the `www` placeholder record stays).
Unused now, by hand on GitHub (they were never set on this repository, task 013): variables `WIF_PROVIDER`, `DEPLOYER_SA`, `GCP_PROJECT`; the `Cloudflare` secrets are already listed in 015.

## Log
| Step | Result | Output |
| --- | --- | --- |
| Tests first | done | deploy.test.ts image block rewritten; 8 failed against the old workflow |
| Build | done | deploy.yml, READMEs; checks in the commit |

## Retro
One line (light path): to be written at merge.
