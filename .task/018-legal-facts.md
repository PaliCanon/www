# 018 Legal and privacy pages say what we actually do

status: build
rank: 3
repository: www

The pages in `content/{en,fr,vi}` contradicted each other (legal: "no cookie, no personal data", privacy: 24 months, localStorage only, Google Cloud) and the facts. The user decided: check what we have, fix the pages to match. The copy is the user's (CLAUDE.md); this rewrite is the user's explicit decision.

## Summary

Establish the facts (table below), rewrite `privacy.md` and `legal.md` in en/fr/vi to be consistent with them and each other, fix the two sentences of `terms.md` that were false, drop the duplicated Ko-fi block and the "cloud hosting" line of `support.md`. Dates 2026-11-14. `test/legal-facts.test.ts` keeps the pages from contradicting each other or the facts again (24 tests, seen red on the old pages before any edit).

## Lanes

| Lane | Slice | Files | State |
| --- | --- | --- | --- |
| lead | research, pages, test (content only, no lane: one slice, no code) | `content/*/{legal,privacy,terms,support}.md`, `test/legal-facts.test.ts` | done |

## Fact table (claim -> evidence)

Paths relative to `~/projects/palicanon/` (`lt/` = `~/projects/lsh-tech`). Checked 2026-11-14.

### Cookies and browser storage

| Claim | Evidence |
| --- | --- |
| ui-lib keeps preferences in cookies written by the browser, 1 year, `SameSite=Lax`, `Domain=palicanon.app` on any `*.palicanon.app` host | `ui-lib/src/store.rs:107` (`MAX_AGE_SECONDS`), `:123-130` (`cookie_assignment`); `ui-lib/src/persisted.rs:1-18` |
| `pc_lang` (language), `pc_theme` (theme), `pc_rail` (rail open) | `ui-lib/src/shell.rs:87,99,103,278`; `ui-lib/src/language_menu.rs:15` |
| The server reads these cookies from the request to draw the first page (so they ARE sent to our servers) | `ui-lib/src/persisted.rs:7-10`; `search-front/app/src/app.rs:30`; `vizualisation/app/src/app.rs:35` |
| www reads `pc_theme` and writes `pc_lang` when a language link is clicked | `www/src/lib/theme-script.ts:7,15,21` |
| Learn: selected deck is a cookie `pc_learn_deck` on the site | `learn-pali/app/src/web.rs:3,38,87` |
| Learn: localStorage `pc_learn` (progress), `pc_learn_hint`, `pc_learn_sync` (sync on + email) | `learn-pali/app/src/store.rs:21`; `web.rs:25,76,90`; `web_sync.rs:18,77-79` |
| Map: host-only cookies `viz_legend`, `viz_textlang`, 1 year; localStorage `suttasmap.section.v2.<id>` | `vizualisation/app/src/map/cookies.rs:1-20`; `legend.rs:15`; `texts_lang.rs:15`; `map/ui/section.rs:3,11,117` |
| search-front sets no cookie of its own (uses ui-lib); no localStorage code | grep of `search-front/app/src` (only the old notice text mentions localStorage) |
| No `Set-Cookie` anywhere; cookies are written by the browser only | grep `Set-Cookie` over ui-lib, search-front, learn-pali, vizualisation, www: none; `cookies.rs:4-5` ("written by the browser only") |
| No third-party script or font on www (CSP `connect-src 'none'`, fonts self-hosted via @fontsource) | `www/src/lib/csp.ts:25`; `www/package.json` deps; grep of CDN hosts over ui-lib, fronts, www: none outside a test |
| Learn loads Google's sign-in script only when the sync UI is opened | `learn-pali/app/src/web_sync.rs:3-14,74` |

### Search queries

| Claim | Evidence |
| --- | --- |
| The API emits one `search.query` event per `/v1/search` response: `query` (trimmed, collapsed, lower case, <= 200 chars), `lang`, `detected_lang`, `mode`, `hits`, `cached`. No token, IP, request id, country, collections | `api/api/src/lib.rs:729-760` (`log_query`, `normalize_query`); `api/README.md:114,120-124` |
| No other event carries a query (`search.completed` has counts only) | `api/README.md:113`; `api/api/tests/telemetry.rs:369,447` |
| There is NO country and no hour-rounding: the old notice ("country of origin", "time to the hour") was false for this event | same as above (no such field) |
| Alloy copies those lines to the Loki stream `log_stream="search-query"` | `lt/platform/config/alloy.alloy:63-70` |
| Loki keeps that stream 30 days (`720h`), everything else forever (`retention_period: 0s`) | `lt/platform/config/loki.yaml:2-4,43-52`; `lt/README.md` (Data: "Nothing is deleted by age: Loki has no retention") |
| Search is done server-side by search-front, with the API token held there; the browser never calls the API, so the API never sees the visitor's IP | `search-front/README.md:10-23` |
| The "24 months" came from the first draft of search-front's notice (commit e928bea, 2026-10-12), written for the Cloud Run era; no code, sink or dataset ever implemented it | `git -C search-front log -S"Up to 24 months"`; `bq ls --project_id=palicanon-app`: no dataset; Cloud Logging sinks: only `_Required`/`_Default`; `_Default` bucket retention 30 days |
| Firestore search cache held responses keyed by SHA-256 of the cache key, TTL 30 days; the database is being deleted today (still listed at 2026-11-14) | `api/api/src/firestore.rs:1-9,58`; `api/infra/gcp.tf:15-37`; `gcloud firestore databases list --project=palicanon-app` |
| Cloud Run: no service left in palicanon-app | `gcloud run services list --project=palicanon-app`: empty |

### Request logs

| Claim | Evidence |
| --- | --- |
| www nginx logs one JSON line per request: time, route, method, status, duration, bytes; "No address, user agent or referer" | `www/docker/www.conf.template:36-47` |
| api logs no headers, cookies, IP, query strings, prompts | `api/README.md:106-122` |
| learn/map log method, route, status, duration only | `learn-pali/README.md:277`; `vizualisation/app/src/telemetry/server.rs`; grep for user agent / peer address / X-Forwarded in the Rust sources of all fronts: none |
| search-front logs nothing (no tracing calls) | grep `tracing::|info!|warn!` over `search-front/app/src`: none |
| Logs go to Loki on the publisher's own server `ssh.lsh.tech` via Alloy; no retention except search-query | `lt/README.md` (opening, Data); `lt/platform/config/alloy.alloy`; `loki.yaml` |
| Containers' raw logs rotate 5 x 10 MB on the host | `lt/README.md` (Containers), `lt/host/daemon.json` |
| Cloudflare sees every request; a poller copies per-minute groups to Loki with `clientIP`, `clientCountryName`, path, browser, OS, device, user agent of security events; no retention | `lt/platform/edge-analytics.tf:1-8`; `lt/platform/config/cf-analytics.py:36-58`; dashboards use `clientIP` (35 uses: `lt/platform/dashboards/palicanon/*.json`, `infra/cloudflare.json`) |

### Processors and hosts

| Claim | Evidence |
| --- | --- |
| Served from the publisher's own server `ssh.lsh.tech` (Debian, Docker), Cloudflare tunnel + DNS + proxy in front | `lt/README.md`; memory note lsh-tech-platform; `lt/platform/tunnel.tf` |
| GCP palicanon-app holds only the CI assets bucket, tofu state and a cloudbuild bucket; no visitor data | `gcloud storage buckets list --project=palicanon-app`: `palicanon-app-assets`, `-tofu-state`, `_cloudbuild` |
| GCP lsh-tech: state, KMS, secrets, uptime checks (Google's probes hit the public URLs; no visitor data) | `lt/README.md`; `lt/monitoring/`; `gcloud monitoring uptime list-configs --project=lsh-tech` |
| Images only on GHCR | `www/.github/workflows/deploy.yml`; `lt` commit 7d3d27b |
| ntfy.sh only relays a "new message" poke for the publisher's phone alerts; no visitor data | `lt/platform/ntfy.tf:1-8,43` |
| Learn Drive sync: scope `drive.appdata email`, hidden app folder, file `pc_learn.json`, token in tab memory only, email hint in localStorage, no server of ours in between | `learn-pali/app/src/web_sync.rs:1-40,69,97,255`; `drive_location.rs:1-15` |
| AI relay: `POST /v1/ai/relay` forwards the visitor's own key and body to an allow-listed provider, stores and logs nothing; NO front calls it (search-front's test even asserts the notice has no AI row) | `api/api/src/relay.rs:1-30,83`; grep `ai/relay` over the fronts: none; `search-front/app/src/pages/view.rs:961` |

### Publisher / controller

Thibault Rivière, riviere.thibault@icloud.com (as in the pages before this task; `terms.md`, `privacy.md`, `support.md`).

## What changed per page

- `privacy` (en/fr/vi): queries = 30 days, fields as the API really logs them (no country, no hour rounding); added the server logs row and the Cloudflare row (IP, country, browser, copy kept without limit); recipients = Cloudflare + own server + Google only for Drive sync, Google Cloud removed; section 3 now lists the cookies (sent to the servers, not "never sent") and the localStorage keys; "sets no cookies" -> "sets only the preference cookies".
- `legal` (en/fr/vi): publisher named (Thibault Rivière + contact); hosting = own server behind Cloudflare; the false "no cookie, no personal data" replaced by a short summary pointing to Privacy; Drive section adds the email hint and the on-demand Google script; texts/licence links point to Acknowledgements (About lists no licences), "its texts" no longer claimed under CC BY-NC; last-updated line added.
- `terms`: "suttas are in the public domain" was false for the French and Vietnamese translations -> precise wording; date.
- `support`: duplicated Ko-fi paragraph and button merged into the first bullet; "cloud hosting" -> the server.
- `acknowledgements`: untouched (true; date kept at 2026-10-01).

## Not established / open

1. Where the server physically is and which hosting company/address (legal notice law needs a host's name and address if a third party hosts it): not in lsh-tech; the pages say "a server operated by the publisher himself" and name no location. Needs the user.
2. Cloudflare copy in Loki keeps IP addresses and country with NO retention (Loki `retention_period: 0s`; only `search-query` is limited). The pages now say so, truthfully. If that is not wanted: add a `retention_stream` for the `cf.*` events in `lt/platform/config/loki.yaml` and then change the three Kept cells.
3. That `cf-analytics` is running in production (it needs a token; the dashboards use its fields, the token falls back to the deploy token): inferred, not checked on the host (reading its logs would read visitor IPs).
4. Docker's rotated raw logs on the host (50 MB per container) also hold `search.query` lines until overwritten, beyond Loki's 30 days: bounded by size, not time.
5. Tempo (ten years) and Prometheus: whether any span attribute carries a path/IP was not checked; the api installs no trace exporter (`api/README.md:104`), the fronts were not audited for spans.
6. `terms.md` section 3 says the Service is "the property of the Publisher" and bars bulk extraction, while `legal.md` licenses the site's pages and code CC BY-NC 4.0: compatible only if read as licensor, left as is.
7. The iPhone/macOS app (`app/`) was not in scope; legal's Keychain sentence is kept as written (`learn-pali/app/src/backend.rs:155`).
8. search-front still carries its own copy of the old notice (`search-front/app/src/pages/content_*.rs`, "24 months", localStorage); its task 037 redirects to www, but the stale text should go with it.

## Log

| Date | Step | Who | What |
| --- | --- | --- | --- |
| 2026-11-14 | build | lead | facts gathered, `test/legal-facts.test.ts` red (24/24) on the old pages, pages rewritten, green |
