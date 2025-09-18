# This file defines the DigitalOcean Droplet that will run the backend services.

# This script will run on the Droplet's first boot to install Docker.
data "cloudinit_config" "docker_install" {
  part {
    content_type = "text/x-shellscript"
    content = <<-EOF
      #!/bin/bash
      # Install Docker
      apt-get update
      apt-get install -y ca-certificates curl gnupg lsb-release
      mkdir -p /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
      apt-get update
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

      # Add docker to the ubuntu user group
      usermod -aG docker ubuntu
    EOF
  }
}

resource "digitalocean_droplet" "backend" {
  name       = "asset-archive-backend-${terraform.workspace}"
  region     = var.do_region
  size       = var.droplet_size
  image      = var.droplet_image
  vpc_uuid   = digitalocean_vpc.main.id
  ssh_keys   = var.ssh_key_fingerprints
  user_data  = data.cloudinit_config.docker_install.rendered

  # Enable monitoring and backups for production readiness
  monitoring = true
  backups    = true

  tags = ["backend", terraform.workspace]
}

resource "digitalocean_project_resources" "backend" {
  project   = var.do_project_id
  resources = [digitalocean_droplet.backend.urn]
}

output "droplet_ip" {
  description = "The public IP address of the backend Droplet."
  value       = digitalocean_droplet.backend.ipv4_address
}
