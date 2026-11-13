variable "cloudflare_account_id" {
  description = "The Cloudflare account holding the Worker www-dev."
  type        = string
  default     = "c0690c72f1b7c85737052c3a9ebac154"
}

variable "zone" {
  description = "The zone the hosts are in (the site's, managed by platform)."
  type        = string
  default     = "palicanon.app"
}

# The dev host (user, 2026-10-14): the dev build's SITE_URL in deploy.yml.
variable "dev_host" {
  description = "The host of the dev Worker www-dev."
  type        = string
  default     = "dev.palicanon.app"
}
