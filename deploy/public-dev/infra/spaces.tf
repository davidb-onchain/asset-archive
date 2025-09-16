# This file defines the DigitalOcean Spaces bucket for application media uploads.

resource "digitalocean_spaces_bucket" "media_uploads" {
  name   = "${var.media_bucket_name}-${terraform.workspace}"
  region = var.do_region
  acl    = "public-read" # Assumes most media is publicly accessible
}

resource "digitalocean_spaces_bucket_cors_configuration" "media_uploads_cors" {
  bucket = digitalocean_spaces_bucket.media_uploads.name
  region = digitalocean_spaces_bucket.media_uploads.region

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE"]
    allowed_origins = [var.frontend_url]
    max_age_seconds = 3000
  }
}

output "media_bucket_endpoint" {
  description = "The FQDN of the media uploads bucket."
  value       = digitalocean_spaces_bucket.media_uploads.bucket_domain_name
}
