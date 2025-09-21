terraform {
  backend "s3" {
    # DigitalOcean Spaces configuration for Terraform state
    endpoint                    = "https://nyc3.digitaloceanspaces.com"
    region                      = "us-east-1" # Required but not used by DO Spaces
    bucket                      = "aa-secrets-space"
    key                         = "terraform/public-dev/terraform.tfstate"
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_region_validation      = true
    force_path_style            = true
  }

  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }

  required_version = ">= 1.0"
} 