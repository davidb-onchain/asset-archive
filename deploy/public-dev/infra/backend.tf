terraform {
  backend "s3" {
    # Instructions:
    # 1. Get the full endpoint URL from your TF_STATE_BUCKET_DEV secret.
    #    It will look like: https://<bucket-name>.<region>.digitaloceanspaces.com
    # 2. Fill in the placeholders below using the values from the URL.

    endpoint = "nyc3.digitaloceanspaces.com" # e.g., "nyc3.digitaloceanspaces.com"
    region   = "nyc3"                       # e.g., "nyc3"
    bucket   = "state-space"                  # e.g., "your-tf-state-bucket"
    key      = "dev/terraform.tfstate"

    # These settings are required for DigitalOcean Spaces.
    skip_credentials_validation = true
    skip_metadata_api_check     = true
  }
}
