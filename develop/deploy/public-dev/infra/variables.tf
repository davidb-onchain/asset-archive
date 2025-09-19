# =============================================================================
# DIGITALOCEAN PROVIDER VARIABLES
# =============================================================================

variable "do_token" {
  description = "DigitalOcean Personal Access Token"
  type        = string
  sensitive   = true
}

variable "spaces_access_key_id" {
  description = "DigitalOcean Spaces Access Key ID"
  type        = string
  sensitive   = true
}

variable "spaces_secret_access_key" {
  description = "DigitalOcean Spaces Secret Access Key"
  type        = string
  sensitive   = true
}

# =============================================================================
# PROJECT CONFIGURATION
# =============================================================================

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "asset-archive"
}

variable "environment" {
  description = "Environment name (dev, staging, prod)"
  type        = string
  default     = "dev"
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "nyc3"
}

# =============================================================================
# DROPLET CONFIGURATION
# =============================================================================

variable "droplet_size" {
  description = "DigitalOcean Droplet size"
  type        = string
  default     = "s-2vcpu-4gb"  # 2 vCPU, 4GB RAM - good for development
}

variable "droplet_image" {
  description = "DigitalOcean Droplet image"
  type        = string
  default     = "ubuntu-22-04-x64"
}

variable "ssh_key_name" {
  description = "Name of the SSH key to use for the droplet"
  type        = string
  default     = "asset-archive-key"
}

# =============================================================================
# CONTAINER REGISTRY
# =============================================================================

variable "container_registry_images" {
  description = "Container images to deploy"
  type = object({
    cms      = string
    frontend = string
  })
  default = {
    cms      = "ghcr.io/davidb-onchain/asset-archive-cms:develop-137d3d6"
    frontend = "ghcr.io/davidb-onchain/asset-archive-frontend:develop-137d3d6"
  }
}

# =============================================================================
# APPLICATION CONFIGURATION
# =============================================================================

variable "postgres_db" {
  description = "PostgreSQL database name"
  type        = string
  default     = "strapi"
}

variable "postgres_user" {
  description = "PostgreSQL username"
  type        = string
  default     = "strapi"
}

variable "postgres_password" {
  description = "PostgreSQL password"
  type        = string
  sensitive   = true
  default     = "secure_postgres_password_change_me"
}

variable "app_keys" {
  description = "Strapi APP_KEYS"
  type        = string
  sensitive   = true
  default     = "change_me_app_key_1,change_me_app_key_2,change_me_app_key_3,change_me_app_key_4"
}

variable "api_token_salt" {
  description = "Strapi API_TOKEN_SALT"
  type        = string
  sensitive   = true
  default     = "change_me_api_token_salt"
}

variable "admin_jwt_secret" {
  description = "Strapi ADMIN_JWT_SECRET"
  type        = string
  sensitive   = true
  default     = "change_me_admin_jwt_secret"
}

variable "transfer_token_salt" {
  description = "Strapi TRANSFER_TOKEN_SALT"
  type        = string
  sensitive   = true
  default     = "change_me_transfer_token_salt"
}

variable "jwt_secret" {
  description = "Strapi JWT_SECRET"
  type        = string
  sensitive   = true
  default     = "change_me_jwt_secret"
}

variable "encryption_key" {
  description = "Strapi ENCRYPTION_KEY"
  type        = string
  sensitive   = true
  default     = "change_me_encryption_key"
}

# =============================================================================
# NETWORKING
# =============================================================================

variable "allowed_ssh_ips" {
  description = "List of IP addresses allowed to SSH to the droplet"
  type        = list(string)
  default     = ["0.0.0.0/0"]  # WARNING: This allows SSH from anywhere. Restrict in production!
}

variable "domain_name" {
  description = "Domain name for the application (optional)"
  type        = string
  default     = ""
} 