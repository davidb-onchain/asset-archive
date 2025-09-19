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
