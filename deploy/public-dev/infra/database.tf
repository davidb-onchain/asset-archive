resource "digitalocean_database_cluster" "postgres" {
  name       = "asset-archive-db-cluster-dev"
  engine     = "pg"
  version    = "14"
  size       = "db-s-1vcpu-2gb" # A small, cost-effective size suitable for development/staging.
  region     = var.do_region
  node_count = 1

  # This places the database within your private network,
  # preventing access from the public internet.
  private_network_uuid = digitalocean_vpc.main.id
}

output "database_cluster_uri" {
  description = "The connection URI for the PostgreSQL database cluster."
  value       = digitalocean_database_cluster.postgres.uri
  sensitive   = true
}

output "database_cluster_host" {
  description = "The hostname for the PostgreSQL database cluster."
  value       = digitalocean_database_cluster.postgres.host
  sensitive   = true
}

output "database_cluster_port" {
  description = "The port for the PostgreSQL database cluster."
  value       = digitalocean_database_cluster.postgres.port
}

output "database_cluster_database" {
  description = "The default database for the PostgreSQL cluster."
  value       = digitalocean_database_cluster.postgres.database
}

output "database_cluster_user" {
  description = "The default user for the PostgreSQL cluster."
  value       = digitalocean_database_cluster.postgres.user
}

output "database_cluster_password" {
  description = "The password for the default user of the PostgreSQL cluster."
  value       = digitalocean_database_cluster.postgres.password
  sensitive   = true
}
