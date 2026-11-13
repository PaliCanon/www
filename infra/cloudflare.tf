# The showcase's one Cloudflare resource: the www placeholder record. No
# Worker, no custom domain and no route: palicanon.app is served by the nginx
# container of the lsh-tech stack (task 014), and the dev Worker and its
# custom domain are gone (task 015).


data "cloudflare_zone" "site" {
  name = var.zone
}

# www.palicanon.app: a proxied placeholder so the zone's Redirect Rule
# (www -> apex, in Lsh0x/palicanon: 006) answers; no origin behind it.
resource "cloudflare_record" "www" {
  zone_id = data.cloudflare_zone.site.id
  name    = "www"
  type    = "AAAA"
  content = "100::"
  proxied = true
  ttl     = 1
}
