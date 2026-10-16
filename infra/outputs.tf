output "hosts" {
  description = "Each attached host and the Worker serving it."
  value = merge(
    { (cloudflare_workers_domain.dev.hostname) = cloudflare_workers_domain.dev.service },
    { for d in cloudflare_workers_domain.prod : d.hostname => d.service },
  )
}
