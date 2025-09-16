### Phased Action Plan for DigitalOcean Deployment

This document outlines a clear, step-by-step action plan to deploy your project to DigitalOcean across two distinct environments. The goal is to create a `development` environment deployed from the `develop` branch and a `production` environment deployed from the `main` branch, following the secure GitOps strategy.

### Phase 1: Foundational Security & Secrets Setup (One-Time, Manual)

This phase is done once to create the secure container for our automation for both environments.

1.  **Create DigitalOcean Resources for Terraform**:
    *   Log in to DigitalOcean and create a single **private Spaces bucket**. Name it something unique like `yourproject-terraform-state`. This one bucket will securely store the state for both `dev` and `prod` environments.
    *   Generate a **DigitalOcean API Access Token** for the `dev` environment with read/write permissions.
    *   Generate a separate **DigitalOcean API Access Token** for the `prod` environment with read/write permissions.

2.  **Configure GitHub Secrets**:
    *   In your GitHub repository, go to `Settings` > `Secrets and variables` > `Actions`.
    *   Create a secret named `DO_DEV_TOKEN` and paste the `dev` environment API token.
    *   Create a secret named `DO_PROD_TOKEN` and paste the `prod` environment API token.
    *   Create secrets for your Spaces bucket details, e.g., `TF_STATE_BUCKET`, `DO_SPACES_ENDPOINT`, `DO_SPACES_REGION`.

### Phase 2: Scaffolding the Infrastructure Code (Local)

Now, we'll create the Terraform code, making it flexible enough to support multiple environments.

3.  **Initialize the `infra/` Directory**:
    *   Create a new top-level directory named `infra`.
    *   Inside `infra/`, create a `.gitignore` file and add `*.tfstate`, `*.tfstate.*`, `.terraform`, and `*.tfvars` to it.

4.  **Define the Backend and Provider**:
    *   Create a `backend.tf` file to configure Terraform to use your Spaces bucket. Terraform Workspaces will automatically handle creating separate state files within this bucket for `dev` and `prod`.
    *   Create a `provider.tf` file to configure the DigitalOcean provider.

5.  **Define Resources with Variables**:
    *   Create resource files (`network.tf`, `database.tf`, etc.). Use variables for environment-specific settings (like Droplet size or database tier).
    *   In `variables.tf`, define all inputs.
    *   Create `dev.tfvars` with values for the development environment (e.g., smaller Droplet size).
    *   Create `prod.tfvars` with values for the production environment (e.g., larger Droplet size). Do not commit `.tfvars` files if they contain secrets.

6.  **Initial Local Apply for Development Environment**:
    *   From the `infra/` directory, run `terraform init`.
    *   Create and switch to the development workspace: `terraform workspace new dev`.
    *   Run `terraform apply -var-file="dev.tfvars"`. This creates the `dev` infrastructure and confirms your setup is working. Commit the code to the `develop` branch.

### Phase 3: Building the Automation Pipeline (GitHub Actions)

We now build the CI/CD pipeline to be aware of our branching strategy.

7.  **Create the "Plan" Workflow**:
    *   In `.github/workflows/terraform-plan.yml`, configure the workflow to trigger on pull requests to both `develop` and `main`.
    *   Add logic to the workflow to:
        *   Check out the correct branch.
        *   Select the corresponding Terraform workspace (`dev` or `prod`).
        *   Run `terraform plan` using the correct variables (`-var-file="dev.tfvars"` or `-var-file="prod.tfvars"`).

8.  **Create the "Apply" Workflow**:
    *   In `.github/workflows/terraform-apply.yml`, configure the workflow to trigger on pushes to `develop` and `main`.
    *   Add logic to the workflow to:
        *   On a `develop` push, select the `dev` workspace, use `dev` secrets/variables, and run `terraform apply`.
        *   On a `main` push, select the `prod` workspace, use `prod` secrets/variables, and run `terraform apply`.

### Phase 4: Full Infrastructure Rollout (GitOps Workflow)

Now, we use the automated pipeline to build out the full infrastructure for both environments.

9.  **Add Core Compute Resources to `dev`**:
    *   On a new feature branch off of `develop`, add the resources for the Droplet, Spaces bucket, etc., to your Terraform files.
    *   Open a pull request targeting `develop`. Verify the "Plan" workflow runs and shows the correct changes for the `dev` environment.
    *   Merge the PR. Verify the "Apply" workflow runs and successfully creates the resources in your `dev` environment on DigitalOcean.

10. **Promote Infrastructure to `prod`**:
    *   Once you are satisfied with the `dev` environment, create a new pull request from the `develop` branch to the `main` branch.
    *   Verify the "Plan" workflow runs and shows a plan to create the *same set of resources* for the `prod` environment (using `prod.tfvars`).
    *   Merge the pull request. Verify the "Apply" workflow triggers and successfully creates the `prod` infrastructure.

### Phase 5: Application Deployment & Final Configuration

With the infrastructure live for an environment, the final step is to deploy your application code onto it. This process must be repeated for each environment.

13. **Configure and Deploy the Backend (`dev` and `prod`)**:
    *   For the target environment, get the database connection string and Droplet IP from the Terraform outputs (`terraform workspace select <env>`, then `terraform output`).
    *   SSH into the correct Droplet, install Docker, and create a `.env` file with the secrets for that environment.
    *   Run `docker compose up -d` to launch the backend stack.

14. **Configure and Deploy the Frontend (`dev` and `prod`)**:
    *   In the DigitalOcean console, configure the App Platform app for the target environment.
    *   Set its environment variables to point to the backend services for that specific environment.
    *   Trigger its deployment from the corresponding branch (`develop` for `dev`, `main` for `prod`).

After completing these steps, you will have two fully independent application environments, managed by a secure, repeatable, and automated IaC workflow. 