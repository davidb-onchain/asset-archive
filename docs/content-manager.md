# Strapi CMS Specification for UnityAssets4Free Refresh

## Overview

This document provides a comprehensive specification for the Strapi-based Content Management System (CMS) powering the UnityAssets4Free website. Strapi serves as the headless CMS, managing all asset-related data, including metadata, thumbnails, categories, and publishers. It acts as the single source of truth for the frontend (detailed in `site-frontend.md`), providing REST/GraphQL APIs for fetching and displaying assets, categories, and other content. The CMS is designed for easy content ingestion from external tools, manual administration, and seamless integration with the Next.js frontend.

Key goals:
- Enable automated ingestion of scraped Unity Asset Store data.
- Support hierarchical categories and relational data models.
- Ensure secure, performant APIs for frontend consumption.
- Provide admin tools for oversight and manual edits.

## Architecture

### Components
- **Strapi (Headless CMS)**: Handles content types, relations, admin UI, and APIs.
- **CMS Database (PostgreSQL)**: Stores all structured data; already provisioned in the stack.
- **Ingestion Worker**: A backend service that processes uploaded assets, scrapes metadata, and syncs data into Strapi (detailed in the ingestion flow).
- **Media Library**: Uses Strapi's Upload Provider (local or S3-compatible) for thumbnails and assets.
- **Optional Integrations**:
  - MediaFire uploader for file hosting (see `mediafire-uploader.md`).
  - Real-time logging for ingestion monitoring.

### Data Flow
1. **Ingestion**: Assets are uploaded via the interactive uploader (see `upload.md`), processed for metadata, and inserted into Strapi.
2. **Frontend Consumption**: The Next.js frontend queries Strapi APIs to fetch assets, categories, and publishers for pages like home, category listings, and asset details.
3. **Admin Management**: Strapi's admin panel allows manual edits, with overrides to prevent automated ingestion from overwriting changes.

## Content Ingestion Flow

The ingestion process synchronizes asset data from user uploads into Strapi.

1. **Source Data**: Users upload `.unitypackage` files via the frontend uploader.
2. **Processing**: The backend scrapes Unity Asset Store data based on filenames, extracts metadata (JSON), and downloads thumbnails.
3. **Sync to Strapi**: The ingestion worker creates/updates `Asset`, `Publisher`, and `Category` entries via Strapi's API, uploading thumbnails to the media library.

## Data Model (Strapi Content Types)

### 1) Asset (Collection Type)
- `name` (string, required): Product name.
- `slug` (UID, from `name`): URL-friendly identifier.
- `assetId` (string, required, unique): Unity Asset Store ID.
- `assetStoreUrl` (string): Link to the asset's store page.
- `rating` (decimal): Store rating.
- `thumbnail` (media, single): Asset thumbnail.
- `publisher` (relation, many-to-one → Publisher): Linked publisher.
- `categories` (relation, many-to-many → Category): Associated categories.
- `megaNzUrl` (string): Link to the asset file on mega.nz.
- `sourceFile` (string): Original filename.
- `metadata` (JSON): Additional scraped data (e.g., search query, confidence).

### 2) Publisher (Collection Type)
- `name` (string, required, unique): Publisher name.
- `slug` (UID, from `name`): URL-friendly identifier.
- `assetStoreUrl` (string): Link to publisher's store page.

### 3) Category (Collection Type)
- `name` (string, required, unique): Category name.
- `slug` (UID, from `name`): URL-friendly identifier.
- `parent` (relation, many-to-one → Category): For hierarchical nesting.

## Deployment (Docker Compose)

- **Services**:
  - `strapi`: The CMS application.
  - `postgres`: Database.
  - `ingestion-worker`: For data syncing.
- **Network**: Internal bridge; Strapi exposed as needed.
- **Configuration**: Environment variables for database connection, API keys, and upload providers.

## Permissions, Roles, and Access

- **Public API**: Read-only for published content.
- **Roles**:
  - Admin: Full access.
  - Editor: Content management.
  - Viewer: Read-only.
- **CORS**: Configured for the Next.js frontend.
- **Authentication**: JWT for admin access.

## Logging & Observability

### System Health
- Health checks for all services.
- Alerts for failures.

## Security & Privacy

- No secrets in logs.
- Admin authentication with optional IP restrictions.
- Read-only public APIs; audited actions.

## API Contracts for Frontend

Strapi provides REST/GraphQL endpoints for the frontend:

- **Assets**: `GET /api/assets?populate=*&pagination[page]=1&[pageSize]=24` (with filters for categories, sorting by date).
- **Categories**: `GET /api/categories?populate=parent` (for hierarchy).
- **Publishers**: `GET /api/publishers`.
- **Asset Detail**: `GET /api/assets/{slug}?populate=*`.

## Execution Plan

### Phase 1: Foundation
- Set up Docker Compose and configure Strapi.

### Phase 2: Content Types
- Implement models and admin views.

### Phase 3: Ingestion Worker
- Build and integrate the worker (TBD).

### Phase 4: Frontend Integration
- Connect APIs to the Next.js frontend.

### Phase 5: QA
- Test and document.

## Deliverables

- Docker Compose stack.
- Strapi repository with models and configs.
- Example data.

## Acceptance Criteria

- Assets are ingested and queryable via APIs.
- Frontend fetches and displays data correctly.
- System is secure and performant. 