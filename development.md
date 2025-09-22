# Asset Archive - Development Summary

## Project Overview & Goals

The Asset Archive project is a full-stack application designed to archive, manage, and display digital assets. The primary goal is to create a robust, scalable, and maintainable system with a fully automated CI/CD pipeline for seamless deployments.

## Technology Stack

- **Frontend**: Next.js (React)
- **Backend**: Strapi (Node.js CMS)
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose
- **Infrastructure**: DigitalOcean (Droplets, VPC, Firewall, Spaces for Terraform state)
- **Infrastructure as Code (IaC)**: Terraform
- **CI/CD**: GitHub Actions
- **Container Registry**: GitHub Container Registry (GHCR)

## Core Philosophies

- **GitOps-Driven**: The Git repository is the single source of truth for both application code and infrastructure.
- **"Build Once, Deploy Anywhere"**: Applications are containerized for consistency across all environments.
- **Immutable Infrastructure**: All infrastructure changes are versioned, reproducible, and automated via Terraform.
- **Automated Deployment Pipeline**: Code changes automatically flow through build, test, and deployment stages.
- **Data Persistence**: Critical data (database, uploads) is preserved across deployments using persistent Docker volumes.
- **Zero-Downtime Updates**: Application updates are performed by gracefully restarting containers without taking down the entire system.

## System Architecture

### Local Development
- The entire application stack can be run locally using a single `docker-compose.yml` file.
- An `.env.example` file documents all required environment variables for local setup.
- This allows for consistent development environments and easy onboarding.

### Infrastructure (DigitalOcean)
- **Terraform-Managed**: All resources are defined and managed via Terraform code in `deploy/infra/`.
- **Components**:
    - **Droplet**: A single `s-2vcpu-4gb` Droplet running Ubuntu hosts all application services.
    - **VPC**: Provides a private network for resources.
    - **Firewall**: Secures the Droplet by only allowing necessary traffic (SSH, HTTP, application ports).
    - **Project**: Organizes all related resources within DigitalOcean.
    - **Tags**: Used for resource identification and organization.
    - **SSH Key**: Securely configured for access to the Droplet.
- **Provisioning**: A `cloud-init` script (`provision.sh.tpl`) runs on first boot to:
    - Install Docker and Docker Compose.
    - Set up the application directory and environment variables.
    - Create a `docker-compose.yml` file from a template.
    - Launch all application services.
    - Configure a systemd service for auto-start on boot.
    - Set up a UFW firewall as an additional security layer.

### CI/CD Pipeline (GitHub Actions)

The CI/CD pipeline is composed of three interconnected workflows:

1.  **Build Workflow (`build-images.yml`)**:
    - **Trigger**: On push to `develop` or `main` with changes in `services/**`.
    - **Action**:
        - Detects which service's code has changed (CMS or Frontend).
        - Builds new Docker images for the changed services.
        - Tags images with the branch name and commit SHA for traceability.
        - Pushes the new images to GitHub Container Registry (GHCR).

2.  **Deployment Workflow (`deploy.yml`)**:
    - **Trigger**: On successful completion of the Build Workflow on the `develop` branch.
    - **Action**:
        - Determines the tags of the newly built images.
        - Uses DigitalOcean API to get the droplet IP address.
        - Connects directly to the droplet via SSH.
        - Updates container images and restarts services without Terraform involvement.

3.  **Infrastructure Workflow (`terraform.yml`)**:
    - **Trigger**: On push to `develop` with changes in `deploy/infra/**`.
    - **Action**: Runs `terraform apply` to create, update, or destroy infrastructure resources.
    - **PR Integration**: Runs `terraform plan` on pull requests targeting `develop` and posts the plan as a comment.

#### **How the Automated Update Works:**

1.  **Code Change** → A developer pushes a code change to the `develop` branch.
2.  **Build Workflow** → New container images are built and pushed to GHCR.
3.  **Deploy Workflow** → Automatically triggers and:
    - Uses DigitalOcean API to find the droplet IP address.
    - Connects directly to the droplet via SSH.
    - Updates the `docker-compose.yml` file with new image tags.
    - Pulls new images and restarts containers using `docker compose up -d --force-recreate`.
    - Preserves persistent data in Docker volumes.
    - Performs health checks to ensure services are running.

**Key Architecture Decision**: Container deployments are handled by **GitHub Actions via direct SSH**, not Terraform. This provides:
- **Faster deployments** (no Terraform state locking or remote-exec delays)
- **Clear separation of concerns** (Terraform for infrastructure, GitHub Actions for application deployment)
- **Better error handling and logging** through GitHub Actions
- **No more hanging deployments** due to cloud-init or remote-exec issues

## Current Status

- **Infrastructure**: The Terraform setup for the development environment is complete and stable.
- **Provisioning**: The `cloud-init` script successfully provisions a new Droplet with all necessary dependencies and services.
- **Container Builds**: The GitHub Actions workflow to build and push container images is functional.
- **Automated Deployments**: A complete, automated deployment pipeline for application updates using GitHub Actions and direct SSH (no longer dependent on Terraform remote-exec).
- **Data Persistence**: The deployment strategy ensures that database data and file uploads are preserved across application updates.
- **Architecture Optimization**: Moved from Terraform-based container updates to GitHub Actions direct SSH deployment, eliminating hanging deployments and improving speed.
- **Documentation**: `workflow.md` has been updated with a comprehensive overview of the project's architecture, philosophy, and deployment processes.

### Recent Accomplishments (Summary of Today's Session)

- Successfully set up a robust, automated CI/CD pipeline for deploying the Asset Archive project to DigitalOcean.
- Implemented a complete Terraform configuration for all necessary infrastructure resources.
- Developed and debugged a GitHub Actions workflow (`terraform.yml`) to automate `terraform plan` and `apply`.
- Resolved numerous errors related to Terraform state, provider versions, resource attributes, and GitHub Actions permissions.
- Created and refined a `cloud-init` provisioning script to automate Droplet setup, including Docker installation and service startup.
- Fixed a critical bug where the provisioning script would hang due to interactive prompts during package upgrades.
- Designed and implemented a zero-downtime container update strategy that preserves data.
- Created a new deployment workflow (`deploy.yml`) that automatically deploys new container images via direct SSH.
- **Major Architecture Improvement**: Refactored from Terraform remote-exec to GitHub Actions direct SSH for container deployments, solving hanging deployment issues and improving performance.
- Authored comprehensive documentation in `workflow.md` detailing the project's architecture, philosophy, and CI/CD processes.

## Next Steps & Future Work

### Immediate Tasks for Next Session

- **Test the full E2E workflow**:
    1.  Make a small code change to the frontend or CMS.
    2.  Push the change to the `develop` branch.
    3.  Verify that the `build-images.yml` workflow runs and creates new images.
    4.  Verify that the `deploy.yml` workflow triggers and successfully updates the running containers on the Droplet.
    5.  Confirm that the application is accessible and reflects the code change, with all previous data intact.
- **Verify SSH Deployment**: Ensure the `SSH_PRIVATE_KEY` GitHub Actions secret is properly configured for the new direct SSH deployment workflow.

### Long-Term Goals

- **Production Environment**: Adapt the Terraform configuration and workflows for a production environment (e.g., using the `main` branch, potentially larger Droplet, managed database).
- **Custom Domain & SSL**: Add configuration for a custom domain and SSL certificates (e.g., using Let's Encrypt).
- **Database Backups**: Implement a strategy for regular backups of the PostgreSQL database, potentially storing them in DigitalOcean Spaces.
- **Monitoring & Logging**: Set up a monitoring solution (e.g., DigitalOcean Monitoring, Prometheus/Grafana) to track Droplet performance and container health. Implement centralized logging for easier debugging.
- **User-Facing Documentation**: Create documentation for end-users on how to use the Asset Archive application. 