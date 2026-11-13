# 015 Drop dev: nothing deploys a Worker any more

status: merged · rank: 3 · level: simple · type: chore · request: user, 2026-11-13 («vire le dev totalement») · light path

## Summary
Rank: difficulty 2 (one workflow job, one config file, three tofu declarations, tests and docs), impact 2 (dev.palicanon.app stops answering; prod is the container and is untouched) → 3.
After 014 the only Worker left was `www-dev` at dev.palicanon.app, uploaded by `deploy.yml` on every push to main. Removed: the `dev` job and the `check` input of `deploy.yml` (the `image` job and the triggers are unchanged: a push to main now starts the workflow and runs no job); `wrangler.jsonc` (nothing else used wrangler: package.json and the lockfile never had it); `scripts/noindex.sh` and its test (`test/deploy-scripts.test.ts`) and the dev-only block of `test/dist/build-form.test.ts` (noindex was dev's only); in `infra/`, `cloudflare_workers_domain.dev`, `var.dev_host`, `var.cloudflare_account_id` and the `hosts` output. Kept: the `www.palicanon.app` placeholder AAAA record, `var.zone`, output `www_record`. `seo.yml` and `ci.yml` never targeted dev.palicanon.app (they build for localhost and run the container); nothing to replace. READMEs say prod is the container and nothing deploys a Worker.
Left alone on purpose: `scripts/deploy-check.sh`'s `noindex` mode and its shell test (generic, still usable by hand against any origin); `Dockerfile` and `docker/` comments that recall the Workers behaviour the container copies (history, not an environment). The image hash drops `scripts/noindex.sh`, so the next tag builds one image whose content differs by that file only.
`tofu plan` will destroy one resource, `cloudflare_workers_domain.dev`. Not applied. Outside the repo, by hand: the Worker script `www-dev` (wrangler's, never in the state) and the GitHub secrets `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

## Log
| Step | Result | Output |
| --- | --- | --- |
| Tests first | done | deploy.test.ts and infra.test.ts rewritten; 10 failed against the old workflow, wrangler and infra |
| Build | done | workflow, wrangler, noindex, infra, READMEs; checks in the commit |

## Retro
One line (light path): to be written at merge.
