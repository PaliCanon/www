# infra

The showcase's own Cloudflare resources, in its own tofu state
(`gs://palicanon-app-tofu-state`, prefix `www`). Applied by the
orchestrator, never by an agent or by CI.

| What | Owner | Where |
| --- | --- | --- |
| The Workers `www-dev`, `www-prod`: static assets only, no script | wrangler, from `deploy.yml` | `../wrangler.jsonc` (`env.dev`, `env.prod`) |
| The custom domain `dev.palicanon.app` → `www-dev` | tofu | `cloudflare.tf`, `cloudflare_workers_domain.dev` |
| The custom domain `palicanon.app` → `www-prod` | tofu, task 006 | `cloudflare_workers_domain.prod`, attached only when `prod_host` is set |
| The response headers, dev's `X-Robots-Tag: noindex` | the build | `../public/_headers`, `../scripts/noindex.sh` |
| `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID` | GitHub repository secrets (set 2026-10-15) | read by `cloudflare/wrangler-action` |

Why the Workers are not in tofu: the cloudflare provider `~> 4.52`
(4.52.9) has no assets on `cloudflare_workers_script` (`tofu providers
schema`: no `assets` block, `content` required), and provider 5 would make
tofu and CI both upload `dist/` (ruling 2026-10-15). A Workers Custom
Domain creates its proxied DNS record and the certificate for the exact
host itself, so there is no record and no route here. `wrangler deploy`
publishes only the domains its config declares, none, so an upload never
touches a domain tofu attached.

`wrangler.jsonc` sets `workers_dev: false` and `preview_urls: false`: the
custom domain is the only way to a Worker. Always deploy with `--env`; a
bare `wrangler deploy` would create a third Worker named `www`.

## Order (dev), the orchestrator

Nothing here has been applied yet (task 005 wrote it).

1. **Precondition: free `dev.palicanon.app`.** palisearch's tofu holds it
   today: `cloudflare_record.dev` (the old site's Pages preview) and the
   Access application and policy on it
   (`cloudflare_zero_trust_access_application.dev`,
   `cloudflare_zero_trust_access_policy.dev_allow`). palisearch task 049
   removes the three (the `previews` Access app stays); apply it first.
   Until then a Workers Custom Domain cannot be created over the record,
   and Access keeps answering 302 to `cloudflareaccess.com` (the check names
   it). Check: `dig +short dev.palicanon.app` prints nothing.
2. **First upload, without the host check** (the domain needs its Worker
   to exist). Push the branch, then run the workflow by hand on it; the
   `check: false` input skips the host check, so no run is red on purpose:

   ```sh
   git push origin feat/deploy
   gh workflow run deploy.yml --repo PaliCanon/www --ref feat/deploy -f check=false
   gh run watch --repo PaliCanon/www "$(gh run list --repo PaliCanon/www --workflow deploy.yml --limit 1 --json databaseId --jq '.[0].databaseId')"
   ```

   (main's `deploy.yml` already declares `workflow_dispatch`, so GitHub
   runs the branch's version.) The job ends after `wrangler deploy --env
   dev`: `www-dev` exists, served nowhere yet. If GitHub refuses the
   dispatch, the same upload from a checkout of `feat/deploy` (the account
   id is `var.cloudflare_account_id`, not a secret):

   ```sh
   npm ci && SITE_URL=https://dev.palicanon.app npm run build && scripts/noindex.sh dist
   CLOUDFLARE_API_TOKEN=$(security find-generic-password -a lsh -s cloudflare-api-token -w) \
     CLOUDFLARE_ACCOUNT_ID=c0690c72f1b7c85737052c3a9ebac154 npx wrangler@4.151.0 deploy --env dev
   ```
3. **Attach the domain.** Credentials from the environment, the token
   from the keychain, never typed or printed:

   ```sh
   gcloud auth application-default login
   export CLOUDFLARE_API_TOKEN=$(security find-generic-password -a lsh -s cloudflare-api-token -w)
   cd infra
   tofu init
   tofu plan     # 1 to add: cloudflare_workers_domain.dev (dev.palicanon.app -> www-dev); 0 to change, 0 to destroy
   tofu apply
   ```

   Cloudflare issues the host's certificate on creation: the first
   requests can fail for a few minutes.
4. **Check by hand** (read-only GETs):

   ```sh
   scripts/deploy-check.sh https://dev.palicanon.app noindex   # deploy-check: OK https://dev.palicanon.app (noindex)
   ```

5. **Merge.** The push to main deploys dev again and runs the host check;
   from then on every push to main does.

## Prod (task 006)

`www-prod` is uploaded by the first `v*` tag (SITE_URL
`https://palicanon.app`, no noindex) and runs no host check: it has no
host yet. Task 006 frees `palicanon.app` (palisearch's `cloudflare_record.apex`
and `cloudflare_pages_domain.apex` serve the old site there), then
`tofu apply -var prod_host=palicanon.app`, and adds the prod check to
`deploy.yml`.

## Notes

- **Bot Fight Mode** (search-front's R6): the check from a GitHub runner
  can meet a Cloudflare challenge (403 with `cf-mitigated`); the check names
  it. If it happens, a WAF skip rule for the runner or dropping the check is
  the user's decision.
- **Checks of this directory**: `tofu fmt -check -recursive infra`; `tofu
  validate` after `tofu init -backend=false` in a scratch copy;
  `test/infra.test.ts` (no Worker script, the names shared with
  `wrangler.jsonc` and `deploy.yml`, no secret).
