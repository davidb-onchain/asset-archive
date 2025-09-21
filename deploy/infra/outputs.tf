# =============================================================================
# DROPLET INFORMATION
# =============================================================================

output "droplet_id" {
  description = "ID of the main application droplet"
  value       = digitalocean_droplet.app.id
}

output "droplet_name" {
  description = "Name of the main application droplet"
  value       = digitalocean_droplet.app.name
}

output "droplet_ipv4_address" {
  description = "Public IPv4 address of the main application droplet"
  value       = digitalocean_droplet.app.ipv4_address
}

output "droplet_ipv4_address_private" {
  description = "Private IPv4 address of the main application droplet"
  value       = digitalocean_droplet.app.ipv4_address_private
}

# =============================================================================
# NETWORK INFORMATION
# =============================================================================

output "vpc_id" {
  description = "ID of the VPC"
  value       = digitalocean_vpc.main.id
}

output "vpc_ip_range" {
  description = "IP range of the VPC"
  value       = digitalocean_vpc.main.ip_range
}

output "firewall_id" {
  description = "ID of the web firewall"
  value       = digitalocean_firewall.web.id
}

# =============================================================================
# APPLICATION URLS
# =============================================================================

output "frontend_url" {
  description = "URL to access the frontend application"
  value       = "http://${digitalocean_droplet.app.ipv4_address}:3000"
}

output "cms_url" {
  description = "URL to access the Strapi CMS"
  value       = "http://${digitalocean_droplet.app.ipv4_address}:1337"
}

output "cms_admin_url" {
  description = "URL to access the Strapi CMS admin panel"
  value       = "http://${digitalocean_droplet.app.ipv4_address}:1337/admin"
}

# =============================================================================
# SSH CONNECTION
# =============================================================================

output "ssh_connection" {
  description = "SSH connection command"
  value       = "ssh root@${digitalocean_droplet.app.ipv4_address}"
}

# =============================================================================
# DOMAIN INFORMATION (if configured)
# =============================================================================

output "domain_name" {
  description = "Domain name (if configured)"
  value       = var.domain_name != "" ? var.domain_name : "No domain configured"
}

output "domain_record_fqdn" {
  description = "Full domain name with subdomain (if configured)"
  value = var.domain_name != "" ? (
    var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
  ) : "No domain configured"
}

# =============================================================================
# PROJECT INFORMATION
# =============================================================================

output "project_id" {
  description = "DigitalOcean project ID"
  value       = data.digitalocean_project.main.id
}

output "project_name" {
  description = "Project name"
  value       = "${var.project_name}-${var.environment}"
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "region" {
  description = "DigitalOcean region"
  value       = var.region
}

# =============================================================================
# CONTAINER INFORMATION
# =============================================================================

output "container_images" {
  description = "Container images being deployed"
  value = {
    cms      = var.container_registry_images.cms
    frontend = var.container_registry_images.frontend
  }
} 