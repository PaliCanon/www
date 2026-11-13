# The public names of the showcase served by Cloudflare. The Worker www-dev
# (static assets, no script) is wrangler's, uploaded by deploy.yml from
# wrangler.jsonc: the cloudflare provider ~> 4.52 cannot hold assets on a
# script (ruling 2026-10-15). Tofu attaches it to dev.palicanon.app with a
# Workers Custom Domain: Cloudflare creates the proxied DNS record and the
# certificate for the exact host, so there is no record for it and no route
# here (the only record is www's placeholder, at the end). The Worker must
# exist before its domain (README, "Order"). Prod is not here: palicanon.app
# is served by the nginx container of the lsh-tech stack (task 014), and its
# Workers Custom Domain was destroyed.


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
