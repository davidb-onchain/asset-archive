# Technical Specification: Interactive Asset Uploader

This document outlines the architecture for a full-stack, user-driven asset uploader. This system will replace the manual, script-based process prototyped in `@/extractor` with an interactive web interface for processing and ingesting Unity assets into the Strapi CMS.

## 1. Architecture Overview
The uploader consists of three main components: a web-based frontend, a file processing backend, and a PostgreSQL database for persistent state management.

- **Frontend**: A Next.js application providing the user interface for file uploads and real-time progress tracking.
- **Backend**: A Node.js service that handles file uploads, orchestrates the asset processing pipeline, and communicates with Strapi.
- **Object Storage**: An S3-compatible object storage service. For production, this will be Backblaze B2. For local development, this is simulated using a MinIO container.
- **Database**: The existing PostgreSQL container, which will be used to store a comprehensive history and the real-time state of all upload jobs.

## 2. Object Storage (Backblaze & MinIO)
To handle large file uploads scalably and decouple storage from the application server, the system will use an S3-compatible object storage service. This allows the backend to remain stateless and supports a seamless transition from local development to a production environment.

- **Production (Backblaze B2)**: In the production environment, all uploaded asset files will be stored in a private Backblaze B2 bucket. The backend will use the S3-compatible API to interact with B2.

- **Local Development (MinIO)**: To simulate the production environment locally, a MinIO container will be used. MinIO provides a high-fidelity, S3-compatible API that runs within the project's Docker Compose stack. All files uploaded during local development will be stored in the `./storage` directory, managed by the MinIO service. This ensures that developers can work with a realistic storage layer without relying on cloud services.

## 3. Persistent State Management (PostgreSQL)
To ensure that the state of all uploads is durable and available across user sessions, the backend will use the project's PostgreSQL container. A dedicated table, `UploadJob`, will be created to track each asset's journey through the ingestion pipeline.

### `UploadJob` Table Schema
- `id` (Primary Key, UUID)
- `originalFilename` (string): The name of the file uploaded by the user.
- `status` (enum): The current state of the job (e.g., `UPLOADING`, `PROCESSING`, `SCRAPING`, `COMPLETE`, `ERROR`).
- `progress` (integer): A percentage representing the job's completion.
- `errorMessage` (text, nullable): Stores any error messages if a job fails.
- `assetId` (string, nullable): A reference to the final asset in Strapi once the job is complete.
- `createdAt` / `updatedAt` (timestamps).

## 4. Core Flow

The system is designed to provide a seamless experience for users to upload local asset files, have them processed automatically, and see them appear on the main site with real-time feedback.

1.  **User Interaction (Frontend)**: 
    *   On page load, the frontend queries the backend to fetch a comprehensive list of all historical and in-progress `UploadJob` records from the PostgreSQL database.
    *   The user then drags and drops local Unity asset files into the interface. The status table immediately updates to show these new files with an initial "Pending" status.

2.  **Upload and Stream to Object Storage**:
    *   The frontend uploads the selected files to the backend.
    *   The backend immediately streams the incoming file to the configured object storage service (MinIO locally, Backblaze in production).
    *   Simultaneously, it creates a new record in the `UploadJob` table with an initial status of `UPLOADING`.

3.  **Backend Processing**:
    *   Once the upload to object storage is complete, the backend's processing logic begins.
    *   It fetches the file *from object storage* to perform each step of the `@/extractor` logic (scraping, parsing, thumbnail download).
    *   Throughout this process, it continuously updates the corresponding `UploadJob` record with the current `status` and `progress`.

4.  **Integration with Strapi**: Once processing is complete, the backend communicates with the Strapi API to create the `Asset` and `Publisher` entries. Upon success, it updates the final `UploadJob` record with a `COMPLETE` status and links it to the newly created asset.

5.  **Real-Time Feedback**: The backend uses a WebSocket connection to broadcast state changes from the `UploadJob` table to the frontend. This ensures the user's status table is always live, reflecting the true state of the database without needing page refreshes.
