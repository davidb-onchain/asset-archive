# Docker Installation and Configuration Guide

This document outlines the definitive steps to install Docker Engine on Ubuntu and configure it to use a custom data directory on an external drive.

## 1. Purge Previous Installations

To avoid conflicts, completely remove all old Docker-related packages and configurations.

```bash
# Purge all conflicting packages
sudo apt-get purge -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin docker-ce-rootless-extras docker.io docker-doc docker-compose podman-docker containerd runc docker-desktop

# Clean up dependencies
sudo apt-get autoremove -y

# Remove residual configuration files and directories
sudo rm -rf /var/lib/docker /var/lib/containerd /etc/docker ~/.docker
```

## 2. Install Docker Engine from Official Repository

These steps ensure you are installing the latest stable version of Docker Engine.

### 2.1. Set up Docker's `apt` repository

```bash
# Update package index and install prerequisites
sudo apt-get update
sudo apt-get install -y ca-certificates curl

# Add Docker's official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Update package index again
sudo apt-get update
```

### 2.2. Install Docker packages

```bash
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

## 3. Configure a Custom Data Directory

This is the recommended method to move Docker's data root to an external drive without changing the `daemon.json` file, which can be problematic.

### 3.1. Stop Docker and Prepare Directories

```bash
# Stop the Docker service and socket
sudo systemctl stop docker docker.socket

# Create the new data directory on the external drive
sudo mkdir -p /mnt/Hot/Services/docker
```

### 3.2. Sync Data and Create a Bind Mount

This method safely moves existing data and "tricks" Docker into thinking it's using the default path, when in fact the data is on the external drive.

```bash
# Sync existing Docker data to the new location
sudo rsync -aHAX --delete /var/lib/docker/ /mnt/Hot/Services/docker/

# Add an entry to /etc/fstab to make the bind mount permanent
echo '/mnt/Hot/Services/docker  /var/lib/docker  none  bind  0  0' | sudo tee -a /etc/fstab

# Apply the mount immediately without rebooting
sudo mount --bind /mnt/Hot/Services/docker /var/lib/docker
```

## 4. Finalize Installation

### 4.1. Start Docker

```bash
sudo systemctl start docker
```

### 4.2. Add User to Docker Group (Post-installation)

This allows running Docker commands without `sudo`.

```bash
sudo usermod -aG docker $USER
```
**Important**: You must **log out and log back in** for this change to take effect.

### 4.3. Verify Installation and Configuration

```bash
# After logging back in, run this command without sudo
docker info | grep 'Docker Root Dir'
```
The output should be `Docker Root Dir: /var/lib/docker`, confirming that Docker is running and using the bind-mounted custom directory.

---

# Dockerization Plan for the Asset Archive Project

This document outlines the step-by-step plan to create a fully containerized, single-command setup for the entire Asset Archive application stack.

### 1. Objective

The goal is to create a unified `docker-compose.yml` file at the project root. This file will define and orchestrate all the necessary services, allowing a developer or a server to launch the entire application with a single command: `docker compose up`. This directly addresses the client's request for a single compute resource deployment.

### 2. Services to be Containerized

The `docker-compose.yml` file will orchestrate the following services:

1.  **`postgres`**: A PostgreSQL database container, which will serve as the primary data store for the Strapi CMS.
2.  **`strapi`**: The Strapi CMS backend application.
3.  **`frontend`**: The Next.js frontend application.
4.  **`worker-ingestion`**: The standalone ingestion worker service.
5.  **`worker-archive`**: The standalone archive orchestrator service.
6.  **`archivebox`**: The ArchiveBox service for webpage snapshotting.

### 3. Execution Plan

#### Step 1: Create Master `docker-compose.yml`

I will create the main `docker-compose.yml` file at the root of the project. This file will contain the definitions for all the services listed above.

#### Step 2: Configure the Database Service (`postgres`)

-   **Image**: Use the official `postgres:14-alpine` image for a lightweight and robust database.
-   **Data Persistence**: Create a named Docker volume (`postgres_data`) to ensure that all database data persists even if the container is removed or recreated.
-   **Configuration**: Use an `.env` file to manage the database name, user, and password securely.

#### Step 3: Configure the Backend Service (`strapi`)

-   **Dockerfile**: I will create a dedicated `Dockerfile` for the Strapi application. This will handle installing dependencies, building the Strapi admin panel, and defining the start command.
-   **Configuration**: The Strapi container will be configured via the `.env` file to connect to the `postgres` service on the internal Docker network.
-   **Data Persistence**: A named volume (`strapi_data`) will be used for uploaded media and other persistent files, ensuring they are not lost.
-   **Port Mapping**: The container's port `1337` will be mapped to the host machine's port `1337`.

#### Step 4: Configure the Frontend Service (`frontend`)

-   **Dockerfile**: I will create a `Dockerfile` for the Next.js application. This will handle dependency installation, building the production version of the site, and running the application.
-   **Configuration**: The frontend will be configured to communicate with the `strapi` service for its API needs.
-   **Port Mapping**: The container's port `3000` will be mapped to the host machine's port `3000`.

#### Step 5: Configure the Worker Services (`worker-ingestion`, `worker-archive`)

-   **Dockerfiles**: Each worker will get its own simple `Dockerfile` to install dependencies and define its run command.
-   **Dependencies**: They will be configured to depend on the `strapi` and `postgres` services, ensuring they start in the correct order.

#### Step 6: Configure the Archiving Service (`archivebox`)

-   **Image**: Use the official `archivebox/archivebox` image.
-   **Data Persistence**: A named volume (`archivebox_data`) will be created to store the archive snapshots permanently.
-   **Port Mapping**: The container's port `8000` will be mapped to the host machine's port `8000` to make the ArchiveBox web UI accessible.

#### Step 7: Centralize Configuration

-   I will create a single `.env.example` file at the project root. This file will document every single environment variable needed to run the entire stack. You will be able to copy this to `.env`, fill in the secrets, and have the entire application configured in one place.

### 4. Outcome

The final result will be a project that is:

-   **Portable**: It can run on any machine with Docker installed (your local machine, a client's server, etc.).
-   **Simple**: It starts with a single command (`docker compose up`).
-   **Robust**: It uses best practices for data persistence and container networking.
-   **Exactly what the client asked for.**

This is a huge win and will provide a solid, professional foundation for the project moving forward.

### 5. DevOps Implications and Workflow

This containerized setup introduces a powerful and modern DevOps workflow that clearly separates local development from production deployment.

#### Local Development Workflow

For local development, we will use **volume mounts**. This creates a real-time, two-way sync between your local project files and the code running inside the Docker containers.

1.  **Run `docker compose up`**: This command starts all services.
2.  **Edit Code Locally**: You will edit the project files on your local machine using your code editor, exactly as you do now.
3.  **Instant Sync**: Every time you save a file, the change is instantly reflected inside the running container. Services with hot-reloading (like the Next.js frontend) will automatically update.

There is **no manual syncing or copying of files**. Your local directory *is* the source of truth for the running containers.

#### Production Deployment Workflow

For deploying to a production server (the client's single compute resource), the process is different and focuses on creating a stable, immutable artifact.

1.  **Build Docker Images**: On a CI/CD server (like GitHub Actions) or locally, a `docker build` command is run. This uses the `Dockerfile` for each service to create a self-contained, production-ready **Docker Image**. This image is a snapshot of your application and all its dependencies.
2.  **Push to Registry**: The newly built images are pushed to a **Container Registry** (e.g., Docker Hub, GitHub Container Registry).
3.  **Deploy on Server**: You log into the client's server, pull the latest images from the registry, and restart the application using `docker compose up`. The server will now be running the exact, tested code from the images.

#### Key Benefits of This Approach

-   **Development/Production Parity**: The environment inside the Docker containers is nearly identical, whether on your machine or on the server. This drastically reduces "it works on my machine" bugs.
-   **Portability**: The entire application is now a set of portable Docker images that can run on any server or cloud provider that supports Docker.
-   **Simplified Onboarding**: New developers can get the entire application stack running with just two commands: `git clone` and `docker compose up`.
-   **Automation Ready**: The build and deploy process is fully scriptable, making it perfect for CI/CD automation.