resource "digitalocean_vpc" "main" {
  name     = "asset-archive-vpc-dev"
  region   = var.do_region
  ip_range = "10.10.10.0/24"
}
