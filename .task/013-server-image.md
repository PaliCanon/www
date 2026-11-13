# 013 Serve the showcase from a container on ssh.lsh.tech

status: built · rank: 5 · level: standard · type: feat · request: the user, 2026-11-13: "le www on le passe aussi cote serveur, comme ca on aura des stats dessus et on peut le mettre dans le dashboard."

## Summary
Rank: difficulty 5 (a new runtime, nginx, and a CI job), impact 5 (the prod showcase) → 5. The rank-5 full process is waived by the orchestrator for speed: no viewer session, no voices.
palicanon.app is served by Cloudflare Workers static assets today. The user wants it served from their server (Lsh0x/lsh-tech, stacks/palicanon/prod, behind a Cloudflare tunnel, like api, learn and map) so its traffic shows in Grafana. This task builds the image and its CI; the orchestrator wires it into the stack and does the cutover (the cutover removes the wrangler prod job).

## Design
- `Dockerfile`: node (.nvmrc) builds dist/ (`npm ci`, `npm run build` and `npm run test:dist`, SITE_URL=https://palicanon.app), nginx-unprivileged serves it on 8080, non-root. No build arg: the release (WWW_ENV, WWW_SHA, WWW_DEPLOYMENT_ENV) is env at runtime, so the image is content-addressed (`h-<hash of tracked inputs>`). The history is in the build context (`.git`): a page's lastmod is the date of its last commit.
- `scripts/nginx-conf.mjs` generates the nginx config from `public/_headers` and `public/_redirects` at image build (the files stay the single source, and are not served): headers by one map per rule (does the path match) and one map per header name (its value for each combination of matching rules: the `! Name` and append semantics of test/headers-rules.ts), redirects as exact locations (a `*` splat as a regex location).
- `docker/www.conf.template` (envsubst at start, only `WWW_*`): html_handling auto-trailing-slash (307, relative Location), not_found_handling 404-page, /healthz (200 ok, not logged), JSON access log on stdout in the PaliCanon schema, error log on stderr at warn.
- `.github/workflows/deploy.yml`: job `image` on v* tags, content-addressed, built only when missing (the pattern of learn-pali's deploy.yml). The wrangler prod job stays.
- `scripts/container-test.sh`: builds the image, runs it, curls every behaviour, parses the log line. Runs in ci.yml.

## Lanes
| Lane | Files | Result |
| --- | --- | --- |
| lead (alone: one small coupled slice, no lane started) | Dockerfile, docker/, scripts/nginx-conf.mjs, scripts/container-test*, deploy.yml, ci.yml, tests, README | done |

## Log
| Step | Result | Output |
| --- | --- | --- |
| Build | done | red: test/nginx-conf.test.ts failed to import scripts/nginx-conf.mjs (absent); one mutation (the `! Name` removal dropped) turned 6 header cases red; one mutation (`if:` of the build step changed) turned the image-job test red. Green: prettier, eslint, astro check, build, test:dist, vitest --coverage all exit 0 |
| Not run | open | no docker and no nginx on this machine (Homebrew is broken here, and compiling nginx from source was refused by the permission system): the nginx config and the Dockerfile were never run. scripts/container-test.sh is the check, run by ci.yml |

## Open
- Repository variables WIF_PROVIDER, DEPLOYER_SA, GCP_PROJECT are not set on PaliCanon/www (only the two CLOUDFLARE_* secrets exist); the workload identity provider must also accept this repository. Not created here.
- Divergences from Workers, read from the docs (not tested against Cloudflare): the redirect of /foo/ when only foo.html exists is a 404 here (Astro builds directories only); /404.html asked directly answers the 404 page with status 404 (Cloudflare: not tested); the query is kept on the 307s and dropped on the _redirects targets.
- Dev's `X-Robots-Tag: noindex` (scripts/noindex.sh) has no counterpart: the image is prod only.
- 2026-11-13, orchestrator: image built on ssh.lsh.tech from a clean clone of afcc83c (docker 29, linux/amd64); scripts/container-test.sh www:test: every check ok but the access-log one, which needs node on the host (absent there). The log line checked by hand instead: one JSON line, the 14 schema keys, service.name www, http.route /blog/ for /blog/?q=secret, no query string. CI's container job runs the full script.
- 2026-11-13, orchestrator: CI image push blocked: PaliCanon/www has no WIF_PROVIDER, DEPLOYER_SA, GCP_PROJECT variables and is not in the palicanon-app pool's attribute_condition nor the deployer's workloadIdentityUser binding (Lsh0x/palicanon infra/variables.tf github_repos; that state needs variables not in the repo). Left to the user.
