# The public names of the showcase. The Workers themselves (www-dev,
# www-prod: static assets, no script) are wrangler's, uploaded by
# deploy.yml from wrangler.jsonc: the cloudflare provider ~> 4.52 cannot
# hold assets on a script (ruling 2026-10-15). Tofu attaches each Worker to
# its host with a Workers Custom Domain: Cloudflare creates the proxied DNS
# record and the certificate for the exact host, so there is no record for
# them and no route here (the only record is www's placeholder, at the end).
# The Worker must exist before its domain (README, "Order").

data "cloudflare_zone" "site" {
  name = var.zone
}

resource "cloudflare_workers_domain" "dev" {
  account_id  = var.cloudflare_account_id
  zone_id     = data.cloudflare_zone.site.id
  hostname    = var.dev_host
  service     = "www-dev"
  environment = "production"
}

# Task 006: attached once prod_host is set, not before.
resource "cloudflare_workers_domain" "prod" {
  count       = var.prod_host == null ? 0 : 1
  account_id  = var.cloudflare_account_id
  zone_id     = data.cloudflare_zone.site.id
  hostname    = var.prod_host
  service     = "www-prod"
  environment = "production"
}

# www.palicanon.app: a proxied placeholder so the zone's Redirect Rule
# (www -> apex, set in the dashboard: 006) answers; no origin behind it.
resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.site.id
  name    = "www"
  type    = "AAAA"
  content = "100::"
  proxied = true
  ttl     = 1
}
