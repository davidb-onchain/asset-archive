# Deployment Guide: Test Environment on DigitalOcean

This document outlines the architecture and deployment process for the Asset Archive application stack to a public test environment on DigitalOcean. The infrastructure is managed by Terraform, and application updates are deployed via GitHub Actions.

### 1. Architecture Overview

The architecture is designed for simplicity, security, and reproducibility, separating infrastructure provisioning from application deployment.

#### 1.1 Infrastructure (Managed by Terraform)

A dedicated Terraform configuration, located in `deploy/infra/`, provisions and manages all necessary cloud resources on DigitalOcean. This Infrastructure-as-Code (IaC) approach ensures a consistent and repeatable setup.

The following resources are created:
-   **VPC**: A Virtual Private Cloud to provide network isolation for the Droplet.
-   **DigitalOcean Droplet**: A single virtual machine running Ubuntu that hosts the Dockerized application services.
-   **DigitalOcean Firewall**: A tag-based firewall that restricts traffic to essential ports (SSH, HTTP, HTTPS, and application ports). Rules are applied to any resource with the correct tags, not just a specific Droplet.
-   **SSH Key**: Uses an existing SSH key from your DigitalOcean account for secure server access.
-   **Resource Tags**: All resources are tagged for better organization, cost tracking, and to dynamically associate the firewall.
-   **Project Association**: All created resources are automatically assigned to a designated DigitalOcean Project.

The Droplet is provisioned with a `cloud-init` script (`provision.sh.tpl`) that installs Docker, sets up the application directory at `/opt/asset-archive`, and configures a systemd service to ensure the application runs on startup.

#### 1.2 Application (Docker Containers & CI/CD)

The application stack (Strapi CMS, Next.js Frontend, Postgres DB) runs as a set of Docker containers orchestrated by Docker Compose on the Droplet.

-   **Image Builds**: The `.github/workflows/build-images.yml` GitHub Actions workflow automatically builds new Docker images for the CMS and frontend whenever code is pushed to the `main` branch. These images are pushed to the GitHub Container Registry (ghcr.io).
-   **Application Updates**: The `.github/workflows/deploy.yml` workflow handles deploying new application versions. It connects to the Droplet via SSH and runs an update script (`/opt/asset-archive/update-containers.sh`) that pulls the specified Docker images and restarts the services.

### 2. Deployment Process

Deployment is a two-part process: managing the infrastructure and deploying the application code.

#### 2.1 Part 1: Provisioning the Infrastructure (Terraform)

This process is only necessary for the initial setup or when making changes to the underlying cloud resources (e.g., changing the Droplet size, adding firewall rules).

##### **Prerequisites**

1.  **Terraform CLI** installed locally.
2.  **DigitalOcean Personal Access Token** with read/write permissions.
3.  **DigitalOcean Spaces Access Key & Secret Key** for remote state management.
4.  **An SSH Key** uploaded to your DigitalOcean account.

##### **Configuration**

1.  Navigate to the `deploy/infra/` directory.
2.  Copy the example variables file: `cp terraform.tfvars.example terraform.tfvars`.
3.  Edit `terraform.tfvars` and populate it with your secrets (DO token, Spaces keys, the name of your SSH key in DigitalOcean, etc.). **This file should never be committed to version control.**

##### **Execution via CI/CD (Recommended)**

The `.github/workflows/terraform.yml` workflow automates this process.

1.  **Make Changes**: Modify the Terraform files in `deploy/infra/` as needed.
2.  **Create a Pull Request**: When a PR is opened with changes in `deploy/infra/`, the workflow will automatically run `terraform plan` and post the output as a comment on the PR. This allows for peer review of infrastructure changes.
3.  **Merge to `main`**: Upon merging the PR to the `main` branch, the workflow will automatically run `terraform apply` to provision or update the infrastructure.

#### 2.2 Part 2: Deploying Application Updates

This is the standard process for deploying new features or bug fixes to the application code.

##### **Prerequisites**

-   Your code changes have been merged into the `main` branch.
-   The `Build and Push Docker Images` workflow has successfully completed, creating new images for the services you updated.

##### **Execution**

Application updates are deployed by manually triggering a GitHub Action.

1.  In the project's GitHub repository, navigate to the **Actions** tab.
2.  In the left sidebar, click on the **"Deploy Containers"** workflow.
3.  Click the **"Run workflow"** dropdown button on the right.
4.  You can optionally specify the exact CMS and Frontend image tags you wish to deploy. If left blank, it will deploy the default images specified in the workflow (typically the latest from the `main` branch).
5.  Click the **"Run workflow"** button to start the deployment. The workflow will securely connect to the Droplet and update the running containers.

### 3. Post-Deployment

#### **Accessing the Server**

-   After a successful `terraform apply`, the Droplet's IP address and a full SSH command will be printed in the Terraform outputs.
-   You can connect using: `ssh root@<your_droplet_ip>`

#### **Viewing Logs**

-   The application directory is located at `/opt/asset-archive`. You can view container logs here using `docker compose logs -f`.
-   The initial server provisioning log can be found at `/var/log/provision.log`.

### 4. Security and Production Considerations

-   **Secrets Management**: All secrets (API keys, passwords) are managed via GitHub Secrets for workflows and the git-ignored `terraform.tfvars` file for infrastructure provisioning.
-   **Firewall Rules**: The `allowed_ssh_ips` variable in your `terraform.tfvars` file should be restricted to your IP address to enhance security.
-   **Separation of Concerns**: The infrastructure (Terraform) and application code (Docker images) are managed and deployed independently. This is a best practice that improves stability and security. 