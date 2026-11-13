# 014 Prod is the container: drop the prod Worker deploy

status: merged · rank: 3 · level: simple · type: chore · request: user, 2026-11-13 («le www on le passe aussi cote serveur») · light path

## Summary
Rank: difficulty 2 (one workflow job, one wrangler env, one tofu resource, tests and docs), impact 2 (nothing user-visible: the Worker served no host; a tag no longer uploads it nor checks palicanon.app early) → 3 by the orchestrator's brief.
palicanon.app is served by the nginx container (task 013) on ssh.lsh.tech behind the lsh-tech tunnel; the prod Worker's custom domain was destroyed (www/infra, `prod_host` left null); www.palicanon.app redirects to the apex through a zone ruleset in Lsh0x/palicanon. Dev stays on the Worker `www-dev` at dev.palicanon.app. The `prod` job of `deploy.yml` kept uploading to `www-prod` on every `v*` tag and ran `scripts/deploy-check.sh` against palicanon.app before the server was updated: both are useless now.
Done: the `prod` job is removed (jobs: `dev`, `image`; the image job and its condition are unchanged, so a `workflow_dispatch` on a tag deploys no Worker and builds the image as a push does); `wrangler.jsonc` keeps only `env.dev`; `infra/` loses `cloudflare_workers_domain.prod`, `var.prod_host` and the output merge that read it; the comments and READMEs say prod is the lsh-tech stack (`stacks/palicanon/prod`, image deployed by digest) and that `scripts/deploy-check.sh https://palicanon.app index` is run by hand after that deploy. `test/deploy.test.ts` and `test/infra.test.ts` assert the new truth.
Left alone on purpose: the `Dockerfile` header still says "deploy.yml's prod job" (the Dockerfile is an input of the image hash: editing a comment would rebuild an identical image); `test/dist/build-form.test.ts` has a comment on `www-prod`. Not applied: no `tofu apply` (the destroy was done earlier).

## Log
| Step | Result | Output |
| --- | --- | --- |
| Tests first | done | deploy.test.ts and infra.test.ts rewritten; 4 failed against the old workflow, wrangler and infra |
| Build | see commits | workflow, wrangler, infra, README |

## Retro
One line (light path): to be written at merge.
