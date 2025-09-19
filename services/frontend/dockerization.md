# Dockerization Plan for the Frontend Application

This document outlines the plan to containerize the Next.js frontend application, enabling it to run as part of the project's unified Docker Compose setup.

### 1. Objective

The goal is to create a `Dockerfile` for the frontend application that builds a production-ready, optimized container image. This service will then be integrated into the main `docker-compose.yml` file at the project root.

### 2. File Creation

Two new files will be created in the `develop/frontend/apps/frontend/` directory:

1.  **`Dockerfile`**: This file will contain the instructions to build the frontend's Docker image.
2.  **`.dockerignore`**: This file will prevent unnecessary or sensitive files from being included in the build context, which improves build speed and security.

### 3. Dockerfile Strategy (Multi-Stage Build)

A multi-stage build is the best practice for Next.js applications to keep the final image small and secure.

#### Stage 1: `deps` - Dependency Installation

This stage installs all necessary dependencies. It is isolated so that this layer is only rebuilt when the `package.json` or lock file changes, speeding up subsequent builds.

-   Start from a `node:22-alpine` base image.
-   Set the working directory to `/app`.
-   Copy `package.json` and `package-lock.json` (or `yarn.lock`).
-   Run `npm install` (or `yarn install`) to download all dependencies.

#### Stage 2: `builder` - Application Build

This stage builds the production version of the Next.js application.

-   Start from the `deps` stage.
-   Copy the rest of the application source code into the `/app` directory.
-   Run the `npm run build` command. This will generate the optimized output in the `.next` directory.

#### Stage 3: `runner` - Production Image

This is the final, minimal image that will be used to run the application in production.

-   Start from a fresh `node:22-alpine` image.
-   Set the working directory to `/app`.
-   Set the `NODE_ENV` to `production`.
-   Copy the `public`, `.next`, and `package.json` from the `builder` stage.
-   Install **only** the production dependencies by running `npm install --production`.
-   Expose port `3000`.
-   Set the final command to `npm start` to run the Next.js production server.

### 4. `.dockerignore` Content

This file will exclude files that are not needed in the final image or contain sensitive information.

```
.env
.next
node_modules
*.log
```

### 5. Integration with `docker-compose.yml`

The root `develop/docker-compose.yml` file will be updated to include the new `frontend` service.

```yaml
services:
  # ... existing postgres and strapi services
  
  frontend:
    build:
      context: ./frontend/apps/frontend
    ports:
      - "3000:3000"
    environment:
      # This connects the frontend to the Strapi container on the internal Docker network.
      - NEXT_PUBLIC_STRAPI_URL=http://strapi:1337
    depends_on:
      - strapi
    # For local development, a volume mount can be added to sync code changes.
    # volumes:
    #   - ./frontend/apps/frontend:/app
    #   - /app/node_modules
    #   - /app/.next
```

### 6. Outcome

Upon completion, the frontend will be a fully containerized service within the project. It will be built and started automatically with the `docker compose up` command, will connect to the Strapi backend over the internal Docker network, and will be accessible on `http://localhost:3000`. 