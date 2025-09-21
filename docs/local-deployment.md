# Deploying to DigitalOcean with Terraform

This document outlines the process for deploying the complete Asset Archive application stack to a public test environment on DigitalOcean using Terraform. The goal is to provision a single Droplet that runs the entire `docker-compose.yml` defined in the project, providing a simple, reproducible, and scalable "single compute resource" setup as requested.

### 1. Objective

- Provision the necessary DigitalOcean infrastructure using Terraform.
- Deploy the entire application stack (Strapi, Next.js, Workers, ArchiveBox, Postgres) via Docker Compose on a single Droplet.
- Create a repeatable, automated workflow for setting up a test or staging environment.

### 2. Architecture

The Terraform configuration will create the following resources:

1.  **DigitalOcean Droplet**: A single virtual machine (e.g., 4vCPU / 8GB RAM) running Ubuntu. This Droplet will be the host for our Docker containers.
2.  **DigitalOcean Firewall**: A network firewall to restrict traffic to necessary ports (SSH, HTTP, HTTPS).
3.  **DigitalOcean SSH Key**: To provide secure SSH access to the Droplet for administration.

The Droplet will be provisioned using a `cloud-init` script to automate the setup process, running the entire docker-compose stack directly on the machine.

### 3. Terraform Remote State Management

To ensure that the infrastructure state is managed safely and collaboratively, we will use a **remote backend** instead of storing the `terraform.tfstate` file locally. This provides locking to prevent concurrent modifications and a central source of truth for your infrastructure's state.

We will use a DigitalOcean Space for this purpose. Note that this Space is **only for Terraform's use** and is separate from any data storage the application itself might use.

#### Backend Setup Steps

1.  **Manually Create a DigitalOcean Space**:
    -   In your DigitalOcean control panel, create a new Space.
    -   Choose a globally unique name (e.g., `[your-project-name]-tfstate`).
    -   Select the same region you intend to deploy your Droplet to.
    -   Keep the access settings private.

2.  **Generate Access Keys**:
    -   In the DigitalOcean control panel, navigate to **API** and then the **Spaces access keys** section.
    -   Generate a new key pair. Securely store both the Access Key and the Secret Key.

3.  **Configure the Terraform Backend**:
    -   Create a new file, `backend.tf`, in your terraform directory. Add the following configuration, replacing the placeholder values with your own.

    ```terraform
    # In backend.tf
    terraform {
      backend "s3" {
        endpoint                    = "nyc3.digitaloceanspaces.com" # Change to your space's region
        region                      = "us-east-1" # This can be any value, S3 provider requires it
        bucket                      = "[your-project-name]-tfstate" # The name of the space you created
        key                         = "asset-archive.tfstate"
        access_key                  = "YOUR_SPACES_ACCESS_KEY"
        secret_key                  = "YOUR_SPACES_SECRET_KEY"
        skip_credentials_validation = true
      }
    }
    ```

When you next run `terraform init`, Terraform will prompt you to migrate your state to the new remote backend.

### 4. Execution Plan with Terraform

The infrastructure will be defined in `.tf` files within the `develop/deploy/terraform` directory (this directory will need to be created).

#### Step 1: Terraform Setup

1.  **Create Terraform files**:
    -   `main.tf`: Defines the DigitalOcean provider, the Droplet, Firewall, and other resources.
    -   `variables.tf`: Defines input variables (e.g., `do_token`, `region`, `droplet_size`).
    -   `outputs.tf`: Defines outputs (e.g., the Droplet's IP address).
    -   `provision.sh.tpl`: A template for the `cloud-init` script.

2.  **Provider Configuration (`main.tf`)**:
    ```terraform
    terraform {
      required_providers {
        digitalocean = {
          source  = "digitalocean/digitalocean"
          version = "~> 2.0"
        }
      }
    }

    provider "digitalocean" {
      token = var.do_token
    }
    ```

#### Step 2: Define Infrastructure (`main.tf`)

1.  **SSH Key**:
    ```terraform
    resource "digitalocean_ssh_key" "main" {
      name       = "Deploy Key"
      public_key = file(var.ssh_public_key_path)
    }
    ```

2.  **Firewall**:
    ```terraform
    resource "digitalocean_firewall" "main" {
      name = "asset-archive-firewall"

      droplet_ids = [digitalocean_droplet.main.id]

      inbound_rule {
        protocol         = "tcp"
        port_range       = "22"
        source_addresses = ["0.0.0.0/0"] # Or restrict to your IP
      }
      inbound_rule {
        protocol         = "tcp"
        port_range       = "80"
        source_addresses = ["0.0.0.0/0"]
      }
      inbound_rule {
        protocol         = "tcp"
        port_range       = "443"
        source_addresses = ["0.0.0.0/0"]
      }
      # Add other ports like 3000, 1337 for direct access if needed

      outbound_rule {
        protocol              = "tcp"
        port_range            = "1-65535"
        destination_addresses = ["0.0.0.0/0"]
      }
      outbound_rule {
        protocol              = "udp"
        port_range            = "1-65535"
        destination_addresses = ["0.0.0.0/0"]
      }
    }
    ```

3.  **Droplet**:
    ```terraform
    resource "digitalocean_droplet" "main" {
      image    = "ubuntu-22-04-x64"
      name     = "asset-archive-server"
      region   = var.region
      size     = var.droplet_size
      ssh_keys = [digitalocean_ssh_key.main.id]
      user_data = templatefile("${path.module}/provision.sh.tpl", {
        git_repo_url = var.git_repo_url
        # Pass other variables like database passwords here
      })
    }
    ```

#### Step 3: Automate Provisioning (`provision.sh.tpl`)

This `cloud-init` script will be executed when the Droplet is first created.

```bash
#!/bin/bash
set -e

# 1. Install Docker and Docker Compose
apt-get update
apt-get install -y apt-transport-https ca-certificates curl software-properties-common
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo apt-key add -
add-apt-repository "deb [arch=amd64] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable"
apt-get update
apt-get install -y docker-ce
# Install Docker Compose V2
mkdir -p /usr/local/lib/docker/cli-plugins
curl -SL "https://github.com/docker/compose/releases/download/v2.17.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/lib/docker/cli-plugins/docker-compose
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# 2. Install Git
apt-get install -y git

# 3. Clone the Project Repository
git clone "${git_repo_url}" /srv/asset-archive
cd /srv/asset-archive

# 4. Create the .env file
# WARNING: This is a simplified example. Use a secrets manager in production.
cat <<EOF > .env
# --- GENERAL ---
HOST=0.0.0.0

# --- DATABASE ---
POSTGRES_DB=strapi
POSTGRES_USER=strapi
POSTGRES_PASSWORD=YOUR_STRONG_PASSWORD_HERE # Replace with variable

# --- STRAPI ---
DATABASE_CLIENT=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=${POSTGRES_DB}
DATABASE_USERNAME=${POSTGRES_USER}
DATABASE_PASSWORD=${POSTGRES_PASSWORD}
# ... add all other required env vars from .env.example
EOF

# 5. Launch the Application
docker compose up -d
```

#### Step 4: Deployment Workflow

1.  **Prerequisites**:
    -   Install Terraform.
    -   Get a DigitalOcean API Token.
    -   Generate an SSH key pair.
    -   Create a `terraform.tfvars` file to store your secrets (`do_token`, etc.). **Do not commit this file.**

2.  **Initialize Terraform**:
    ```sh
    terraform init
    ```

3.  **Plan the deployment**:
    ```sh
    terraform plan -var-file="terraform.tfvars"
    ```
    Review the plan to see what resources will be created.

4.  **Apply the configuration**:
    ```sh
    terraform apply -var-file="terraform.tfvars"
    ```
    Confirm with `yes` when prompted. Terraform will now provision all the resources.

### 5. Post-Deployment

-   **Accessing the Droplet**: Use the IP address from the Terraform output to SSH in:
    ```sh
    ssh root@<droplet_ip_address>
    ```

-   **Checking Logs**: View the logs of all running services:
    ```sh
    cd /srv/asset-archive
    docker compose logs -f
    ```

-   **Updating the Application**: To deploy a new version:
    ```sh
    cd /srv/asset-archive
    git pull origin main # Or your deployment branch
    docker compose up -d --build
    ```

### 6. Security and Production Considerations

-   **Secrets Management**: The example uses a simple `cat <<EOF` to create the `.env` file. For a real environment, you should use a more secure method like injecting environment variables securely via your CI/CD system, or using a tool like Doppler.
-   **Firewall Rules**: Restrict the SSH port (`22`) to your IP address for better security.
-   **Data Persistence & Backups**: The Droplet's local storage is used for the database and file uploads as defined in `docker-compose.yml`. It is critical to set up regular, automated snapshots of the Droplet's entire disk via the DigitalOcean control panel. This is your primary mechanism for backups and disaster recovery. 