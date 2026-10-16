# 006 Cutover: palicanon.app serves the showcase

status: design · rank: 6 · level: hard · type: infra · request: 001 · after: [005] · session: www-006-cutover · process: ../../docs/workflows/development-process.mmd

## Summary
Rank: difficulty 5 (two tofu states, the zone's rules, the apex certificate, old URLs and their ranking), impact 7 (the project's front door moves; a wrong redirect loses the search's traffic) → 6. Level hard: the orchestrator itself; the user applies what the token cannot (Pages, rulesets) and runs the palisearch destroy.
Request (user, 2026-10-16): "deploy la vitrine" after "la vitrine est bien sur palicanon.app ?" — the showcase takes palicanon.app (001 v6 node CUT: "tag builds with SITE_URL https://palicanon.app and deploys prod; palicanon.app moves from today's site: /?q= to search.palicanon.app (zone Redirect Rule), old URLs 301 one by one (public/_redirects), www to apex; Search Console + Bing").
Today: palicanon.app and www.palicanon.app are Pages custom domains of `palicanon-web` with CNAME records in palisearch's tofu (`cloudflare_pages_domain.apex/.www`, `cloudflare_record.apex/.www`); the old site's routes: `/` (`?q=` searches), `/acknowledgements`, `/terms`, `/privacy`, `/legal`, `/support` (web/src/components/Footer.tsx). The showcase has `/support/` and `/legal/`; search.palicanon.app has acknowledgements, terms, privacy. www-prod exists since the v0.1.0 tag (this task's first step, no public effect). Rights: the Cloudflare token (keychain) edits DNS and Workers, not Pages nor rulesets; a destroy apply by the orchestrator is refused by its permission mode (049): the user runs `tofu apply` in palisearch and sets the two Redirect Rules in the dashboard; the orchestrator applies the saved plan for the Workers domain (as for dev, user: "fais-le manuellement").
Open: the exact form of the `/?q=` rule (dynamic redirect preserving the query); whether www.palicanon.app keeps a record (a redirect needs a proxied record); the day Search Console is told.

## Log
| Step | Result | Output |
| --- | --- | --- |
| Prod upload | done | 2026-10-16: tag v0.1.0 pushed, deploy.yml prod job (www-prod, no domain). |
| Define | done | orchestrator, 2026-10-16: design v1 from 001's CUT node; consensus v3 (deep, sage, #10735) landed after the window had run on the user's word: ruling in ## Design. |

## Design
Viewer: www-006-cutover/design v3 (d931c2adc362c4c), consensus 2026-10-16 (deep, sage; summary #10735). **Orchestrator's ruling on arrival**: the window ran before the consensus landed, on the user's word ("attache palicanon.app à la vitrine"), in this order: the user removed the two Pages custom domains (the CNAMEs went with them), the orchestrator applied the saved www/infra plan (`cloudflare_workers_domain.prod`, 8636ab4d…), palisearch 050 removed the four resources from config and state. So the design's window nodes (O1/O2/N1, S1 spike, W-fast/W-gap, RB1) are superseded by what happened; the www CNAME the design keeps as a placeholder is gone too: N2 needs a proxied record for www (an AAAA `100::` in www/infra). Everything else of v3 stands and is what remains to build: N2 (record + the user's rule), N3 (the user's rule), N4 `_redirects` (absolute targets, both slash forms, 301; the IndexNow key file `ea61cff5ec8386a25c60f8d2ea079010.txt` carried over), P2 prod-build dist test, C1 old-URL assertions in deploy-check (index form), C3 the prod host check in deploy.yml, PG purge, C2 Search Console and Bing, O3 (delete the Pages project after 7 days, a task of its own), F1 (learn-pali's footer and the app link palicanon.app/terms and /privacy: follow-ups there).
```mermaid
flowchart TB
  subgraph PREP["1 Prepare: nothing public changes (the orchestrator and lanes)"]
    N4["N4 www/public/_redirects, one 301 per old URL, absolute targets, both slash forms: /acknowledgements /terms /privacy go to https://search.palicanon.app (same path); /legal goes to /legal/ and /support to /support/ (301 over html_handling's 307); the IndexNow key file ea61cff5ec8386a25c60f8d2ea079010.txt is carried over; dist test on _redirects. Merged to main, deployed to dev, curled on dev.palicanon.app (redirects follow to a 200, no loop) before any tag"]:::new
    P1["P1 tag v0.1.1 (v0.1.0 had no redirects): deploy.yml prod job, SITE_URL https://palicanon.app, no noindex, wrangler deploy --env prod uploads Worker www-prod, served nowhere yet"]:::new
    P2["P2 dist test on the prod build (SITE_URL set): canonical, hreflang and sitemap origin, robots Sitemap line, no X-Robots-Tag noindex, since www-prod has no workers.dev nor preview URL and nothing prod can be fetched before the domain"]:::new
    S1["S1 spike on a throwaway host (orchestrator, token): does PUT /workers/domains/records with override_existing_dns_record replace an existing CNAME in place? Written in the task file: yes means variant W-fast, no means W-gap"]:::new
    PF["PF preflight, read-only: search.palicanon.app /acknowledgements /terms /privacy answer 200; dig SOA palicanon.app; the saved plans exist (www/infra N1, palisearch O2: expected 1 destroy, 2 forgotten); the apex CNAME (to palicanon-web.pages.dev, proxied, TTL auto) copied aside; the Pages domain status of both hosts (active or pending) written down; a browser logged in to the dashboard"]:::new
  end
  subgraph RULES["2 Rules first (the user, dashboard): live on the old site, reversible by disabling"]
    N2["N2 zone palicanon.app, Rules, Redirect Rules, Create rule, template 'Redirect from WWW to root': when http.host eq www.palicanon.app, dynamic target concat(https://palicanon.app, http.request.uri.path), 301, Preserve query string on. The www CNAME in palisearch stays as a proxied placeholder (the rule answers before the origin), so www never has a gap and needs no new record"]:::user
    N3["N3 second Redirect Rule: when http.host eq palicanon.app and http.request.uri.path eq / and any(http.request.uri.args.names[*] eq q) (fallback if the editor refuses: http.request.uri.query contains q=), static target https://search.palicanon.app/, 301, Preserve query string on, so mode, c, chat and lang travel. From now on a search typed on the old site lands on search"]:::user
    NC["NC check: www.palicanon.app/x?a=1 gives 301 to https://palicanon.app/x?a=1; palicanon.app/?q=metta&mode=words gives 301 to search with the query intact; palicanon.app/ and /?lang=vi stay 200 (old site)"]:::new
  end
  subgraph WINDOW["3 The window (the user at a terminal, the orchestrator on the line, a quiet hour)"]
    O2["O2 palisearch: tofu apply of the saved plan: destroys cloudflare_record.apex only; removed blocks (destroy = false) forget cloudflare_pages_domain.apex and .www in state, no manual state rm; the Pages domains stay attached for now, the TXT google-site-verification stays"]:::user
    N1["N1 www/infra: tofu apply of the saved plan -var prod_host=palicanon.app: Workers domain prod to www-prod, Cloudflare creates the proxied apex record. W-fast variant if S1 said yes: the same attach with the override flag, no gap, then tofu import. If Cloudflare refuses because the Pages domain still holds the host: O1 first, then N1 again. If the apply errors after creating, never re-apply the saved plan: tofu plan afresh; a Workers domain the state does not know is deleted in the dashboard (Workers and Pages, www-prod, Settings, Domains and Routes) or tofu imported"]:::new
    N1C["N1C check at once: TLS valid on the apex (curl -sSI https://palicanon.app), the body is the showcase and not the old site (canonical https://palicanon.app/, no x-robots-tag). Abort rule: N1 failed twice, or TLS invalid ten minutes after N1, goes to RB. It is a point-in-time read, so it is repeated after O1 and after PG"]:::new
    O1["O1 dashboard: Workers and Pages, palicanon-web, Custom domains, remove palicanon.app and www.palicanon.app (the token lacks Pages rights); normally after N1C, so a rollback may stay cheaper; then N1C is run again, because Pages must not write the apex back"]:::user
    PG["PG purge by hostname, then N1C a third time: Caching, Configuration, Purge Cache, Custom Purge, Hostname palicanon.app, so no old Pages object (robots, sitemap, images) is served from the edge"]:::user
  end
  subgraph CHECK["4 Check and SEO"]
    C1["C1 from the laptop (the runner is challenged: 009): scripts/deploy-check.sh https://palicanon.app index plus every old URL: /acknowledgements /terms /privacy give 301 to search.palicanon.app and a final 200; /legal and /support give 301 and a final 200 on the showcase; /?q=metta gives 301 to search; www gives 301; /daily.json gives 404 (data of the old site, dropped)"]:::new
    C2["C2 Search Console, domain property palicanon.app (already verified, covers every host): Sitemaps, add sitemap.xml; URL inspection, Request indexing for / , /fr/ , /vi/ ; Bing Webmaster: import from Search Console, submit the sitemap. Old URLs will list as Page with redirect, expected. The user"]:::user
    C3["C3 deploy.yml prod job gains the host check (the custom domain exists now): deploy-check prod form; first exercised at the next tag"]:::new
  end
  subgraph AFTER["5 After"]
    O3["O3 the Pages project palicanon-web stays seven days, then is deleted with its secret API_TOKEN revoked (a task of its own, with palisearch)"]:::keep
    F1["F1 follow-ups: learn-pali and the app footers link palicanon.app/terms and /privacy: repoint to search.palicanon.app directly; docs: project diagrams and decisions"]:::keep
  end
  subgraph RB["Rollback (the user), by how far the window went"]
    RB1["RB1 before N1 succeeded: recreate the apex CNAME to palicanon-web.pages.dev, proxied, from the saved copy (dashboard DNS: a minute for the record, then Pages revalidates the domain within minutes); if PF's note says the Pages domain went inactive meanwhile, add the domains again in the Pages dashboard and wait for the certificate (the back half of RB2)"]:::user
    RB2["RB2 after N1: tofu apply -var prod_host=null in www/infra (a destroy, the user runs it), then RB1; if O1 is done, re-add both domains in the Pages dashboard (certificate reissue, minutes). Rules N2 and N3 may stay: they only point at search"]:::user
  end
  N4 --> P1 --> P2 --> PF
  S1 --> PF
  PF --> N2 --> N3 --> NC --> O2 --> N1 --> N1C --> O1 --> PG --> C1 --> C2 --> C3 --> O3
  C3 --> F1
  O2 -.-> RB1
  ST["ST stop rule: no step starts before the previous check is green. A red PF or NC stops before the window (fix, or disable the rules). A red N1C goes to RB. A red C1 on a redirect is fixed forward (patch _redirects, a new tag, nothing is rolled back); a red C1 on the showcase itself goes to RB2. A failed C2 or PG retries later, nothing is lost"]:::keep
  PF -.-> ST
  NC -.-> ST
  C1 -.-> ST
  N1C -.->|abort rule| RB2
  classDef done fill:#1f3a2a,stroke:#6c6,color:#dfd
  classDef new fill:#1f2d3a,stroke:#6af,color:#dff
  classDef user fill:#3a2f1f,stroke:#fc6,color:#ffd
  classDef keep fill:#2b2b2b,stroke:#888,color:#ddd
```
| N1 palicanon.app → www-prod | done | 2026-10-16: the user removed the two Pages custom domains (the CNAMEs went with them; the zone keeps the Google TXT); palisearch 050 merged (config) and the four resources removed from its state; `tofu apply` of the saved plan (`prod_host=palicanon.app`): `cloudflare_workers_domain.prod` created (8636ab4d…). Live: `/`, `/fr/`, `/vi/`, `/tipitaka/`, sitemap, robots 200, no x-robots-tag; `/support` and `/legal` 307 to their slash form; `/terms` 404 until N4's `_redirects`. |
