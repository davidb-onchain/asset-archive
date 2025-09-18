variable "do_region" {
  type        = string
  description = "The DigitalOcean region to deploy resources in."
  default     = "nyc3"
}

variable "droplet_size" {
  type        = string
  description = "The size slug for the DigitalOcean Droplet."
  default     = "s-2vcpu-4gb-intel" # A good starting point for the backend services.
}

variable "droplet_image" {
  type        = string
  description = "The image slug for the DigitalOcean Droplet."
  default     = "ubuntu-22-04-x64"
}

variable "ssh_key_fingerprints" {
  type        = list(string)
  description = "A list of SSH key fingerprints to embed in the Droplet for root access. You can find yours in the DigitalOcean control panel under Settings > Security."
  # No default - this is a required variable for security.
}

variable "media_bucket_name" {
  type        = string
  description = "The globally unique name for the DigitalOcean Spaces bucket that will store application media. e.g., 'asset-archive-media-prod'"
  # No default - this must be unique.
}

variable "frontend_url" {
  type        = string
  description = "The full URL of the frontend application (e.g., 'https://www.example.com') to be used in CORS rules for the Spaces bucket."
  # No default.
}

variable "allowed_ssh_ips" {
  type        = list(string)
  description = "A list of CIDR-formatted IP addresses that are allowed to connect via SSH. WARNING: Leaving this as the default is insecure and should be updated to your own IP address."
  default     = ["0.0.0.0/0"]
}

variable "do_project_id" {
  type        = string
  description = "The ID of the DigitalOcean project to deploy resources into."
  # No default - this is a required variable.
}
