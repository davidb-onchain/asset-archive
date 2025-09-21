# =============================================================================
# PROVIDER CONFIGURATION
# =============================================================================

provider "digitalocean" {
  token             = var.do_token
  spaces_access_id  = var.spaces_access_key_id
  spaces_secret_key = var.spaces_secret_access_key
}

# =============================================================================
# DATA SOURCES
# =============================================================================

# Get existing SSH key
data "digitalocean_ssh_key" "main" {
  name = var.ssh_key_name
}

# =============================================================================
# NETWORKING
# =============================================================================

# VPC for the project
resource "digitalocean_vpc" "main" {
  name     = "${var.project_name}-${var.environment}-vpc"
  region   = var.region
  ip_range = "10.10.0.0/16"
}

# Firewall rules
resource "digitalocean_firewall" "web" {
  name = "${var.project_name}-${var.environment}-web"

  tags = [
    "project:${var.project_name}",
    "environment:${var.environment}"
  ]

  # SSH access
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.allowed_ssh_ips
  }

  # HTTP
  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # HTTPS
  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Frontend (development)
  inbound_rule {
    protocol         = "tcp"
    port_range       = "3000"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Strapi CMS (development)
  inbound_rule {
    protocol         = "tcp"
    port_range       = "1337"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Allow all outbound traffic
  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# =============================================================================
# COMPUTE
# =============================================================================

# Main application droplet
resource "digitalocean_droplet" "app" {
  image    = var.droplet_image
  name     = "${var.project_name}-${var.environment}-app"
  region   = var.region
  size     = var.droplet_size
  vpc_uuid = digitalocean_vpc.main.id

  ssh_keys = [data.digitalocean_ssh_key.main.id]

  # User data script for initial setup
  user_data = templatefile("${path.module}/provision.sh.tpl", {
    # DigitalOcean Spaces credentials
    spaces_access_key_id     = var.spaces_access_key_id
    spaces_secret_access_key = var.spaces_secret_access_key
    spaces_region            = var.region

    # Container images
    cms_image      = var.container_registry_images.cms
    frontend_image = var.container_registry_images.frontend

    # Database configuration
    postgres_db       = var.postgres_db
    postgres_user     = var.postgres_user
    postgres_password = var.postgres_password

    # Strapi configuration
    app_keys            = var.app_keys
    api_token_salt      = var.api_token_salt
    admin_jwt_secret    = var.admin_jwt_secret
    transfer_token_salt = var.transfer_token_salt
    jwt_secret          = var.jwt_secret
    encryption_key      = var.encryption_key

    # Project configuration
    project_name = var.project_name
    environment  = var.environment
  })

  tags = [
    "project:${var.project_name}",
    "environment:${var.environment}",
    "role:app",
    "terraform:true",
    "test-tag:workflow-test"
  ]

  # Ensure firewall is created first
  depends_on = [digitalocean_firewall.web]
}

# =============================================================================
# DOMAIN CONFIGURATION (OPTIONAL)
# =============================================================================

# DNS record (only if domain is provided)
resource "digitalocean_record" "app" {
  count = var.domain_name != "" ? 1 : 0

  domain = var.domain_name
  type   = "A"
  name   = var.environment == "prod" ? "@" : var.environment
  value  = digitalocean_droplet.app.ipv4_address
  ttl    = 300
}

# =============================================================================
# PROJECT ORGANIZATION
# =============================================================================

# Get existing DigitalOcean Project
data "digitalocean_project" "main" {
  id = var.project_id
}

# Assign resources to the existing project
resource "digitalocean_project_resources" "main" {
  project = data.digitalocean_project.main.id
  resources = [
    digitalocean_droplet.app.urn,
    digitalocean_vpc.main.urn,
    digitalocean_firewall.web.urn
  ]
} 