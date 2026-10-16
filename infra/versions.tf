terraform {
  required_version = ">= 1.8"

  # Its own state, beside search-front's, the API's and learn-pali's in the
  # same bucket (prefix "www"). The gcs backend reads the credentials of
  # `gcloud auth application-default login`; no google provider is needed.
  backend "gcs" {
    bucket = "palicanon-app-tofu-state"
    prefix = "www"
  }

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.52"
    }
  }
}

# CLOUDFLARE_API_TOKEN comes from the environment (README, "Order"): zone
# read and Workers custom domains. Nothing is read from a file here.
provider "cloudflare" {}
