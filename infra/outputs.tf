output "www_record" {
  description = "The www placeholder record: its host and the address it points at (no origin)."
  value       = { (cloudflare_record.www.hostname) = cloudflare_record.www.content }
}
