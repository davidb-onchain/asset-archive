terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  # The DigitalOcean API token is automatically sourced from the
  # DIGITALOCEAN_TOKEN environment variable. In your CI/CD environment,
  # you should set this variable using your DO_DEV repository secret.
}
