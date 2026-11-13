output "hosts" {
  description = "Each attached host and the Worker serving it."
  value       = { (cloudflare_workers_domain.dev.hostname) = cloudflare_workers_domain.dev.service }
}

output "www_record" {
  description = "The www placeholder record: its host and the address it points at (no origin)."
  value       = { (cloudflare_record.www.hostname) = cloudflare_record.www.content }
}
