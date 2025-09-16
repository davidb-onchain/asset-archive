## Strapi CMS for `https://unityassets4free.com` Refresh Site 


### Components
- Strapi (Headless CMS): Core content types, relations, admin UI, API for frontend.
- CMS DB: PostgreSQL for Strapi.
- Content Server SQL: Source of truth for raw URLs and extracted metadata (from Unity project).
- Ingestion Worker: Node.js/TypeScript sidecar that syncs content-server SQL → Strapi via Admin API.
- ArchiveBox: Page archiving system (Dockerized) with data at `/srv/archivebox/data` (see `page-archiver.md`).
- Archive Orchestrator: Worker module to enqueue ArchiveBox jobs and poll statuses; persists snapshots in Strapi.
- Media Library:
  - Image assets collected from content-server are stored using Strapi Upload Provider (local, S3, or compatible) and linked to Products.
  - Optional: MediaFire uploader integration for downloadable files (page URLs recorded; see `mediafire-uploader.md`).
- Log Stream:
  - Unity Metadata Extractor emits `run.log`, `metadata.jsonl` (see `metadata-project.md`).
  - Log shipper (e.g., `vector` or `promtail`) tails logs to Loki/Elastic, or a lightweight WebSocket tailer. Strapi Admin plugin displays live feed and summaries.

### High-Level Data Flow
1) Unity extractor processes `.unitypackage` files → writes JSONL/CSV + logs.
2) Content-server SQL aggregates package metadata and associated source URLs.
3) Ingestion Worker periodically syncs new/updated rows into Strapi content types.
4) Archive Orchestrator triggers ArchiveBox for missing/updated URLs; stores snapshot data in Strapi.
5) Frontend fetches Products/Categories/Publishers/Images via Strapi REST/GraphQL.
6) Admins manage overrides, manual entries, and ad-hoc ArchiveBox runs via Strapi.

### Deployment (Docker Compose)
- Services: `strapi`, `postgres`, `redis` (queues), `ingestion-worker`, `archive-orchestrator` (can be one worker), `archivebox`, `log-collector` (optional `loki` + `promtail` or `vector`).
- Volumes: `/srv/archivebox/data`, Strapi uploads, database volumes.
- Network: Internal bridge; Strapi exposed on LAN/Internet per needs; ArchiveBox bound to loopback or behind reverse proxy.

---

## Data Model (Strapi Content Types)

### 1) Product (Collection type)
- `title` (string, required)
- `slug` (UID from `title`, unique)
- `shortDescription` (text)
- `description` (rich text/Markdown)
- `publisher` (relation: many-to-one → Publisher)
- `categories` (relation: many-to-many → Category)
- `tags` (JSON array of strings or Tag relation)
- `images` (media: multiple; gallery thumbnails and detail images)
- `sourceUrls` (relation: many-to-many → SourceUrl)
- `archiveSnapshots` (relation: one-to-many → ArchiveSnapshot)
- `unityPackages` (relation: one-to-many → UnityPackage)
- `status` (enum: draft, published, archived)
- `visibility` (enum: public, hidden; for editorial control)
- `originalCreatedAt` (datetime; from content-server if available)
- `originalUpdatedAt` (datetime)
- `metadata` (JSON: arbitrary key/values including heuristics: suspectedName, suspectedVersion)

Notes:
- Frontend cards use `images[0]` as thumbnail, `title`, `shortDescription`, `categories`, and `publisher`.
- Since site is free, no download gating; leave tier fields out or set `tier=public` if needed for UI consistency.

### 2) Publisher (Collection type)
- `name` (string, required, unique)
- `slug` (UID)
- `website` (string)
- `assetStoreUrl` (string)
- `logo` (media, single)
- `description` (rich text)

### 3) Category (Collection type)
- `name` (string, required, unique)
- `slug` (UID)
- `parent` (self-relation: many-to-one for hierarchy)
- `description` (text)

Ensure a dedicated "Complete Projects" category exists for parity with frontend nav.

### 4) SourceUrl (Collection type)
- `url` (string, required, unique)
- `type` (enum: assetstore, publisher, docs, video, community, other)
- `discoveredBy` (enum: cache, embedded, name-heuristics, guid-fingerprint, online-search)
- `confidence` (decimal 0.0–1.0)
- `firstSeenAt` (datetime)
- `lastSeenAt` (datetime)
- `notes` (text)
- Relations: `products` (many-to-many), `archiveSnapshots` (one-to-many)

### 5) ArchiveSnapshot (Collection type)
- `sourceUrl` (relation: many-to-one → SourceUrl)
- `product` (relation: many-to-one → Product)
- `jobId` (string)
- `status` (enum: queued, running, complete, failed)
- `pageUrl` (string; canonical URL archived)
- `snapshotUrl` (string; ArchiveBox index URL for the capture)
- `timestamp` (datetime; capture time)
- `outlinksCount` (integer)
- `sizeBytes` (bigint)
- `details` (JSON; ArchiveBox metadata)

### 6) UnityPackage (Collection type)
- `inputPath` (string; absolute path)
- `fileName` (string)
- `fileSizeBytes` (bigint)
- `sha256` (string)
- `sha1` (string)
- `assetCount` (integer)
- `assetExtensions` (JSON)
- `rootFolders` (JSON)
- `guidSample` (JSON)
- `guidCount` (integer)
- `suspectedName` (string)
- `suspectedVersion` (string)
- `publisherName` (string)
- `assetStoreUrl` (string)
- `assetId` (string)
- `confidence` (decimal)
- `detectionMethods` (JSON array)
- `error` (string, nullable)
- `processedAt` (datetime)
- `durationMs` (integer)
- Relations: `product` (many-to-one → Product)

### 7) MediaFireFile (Optional; Collection type)
- `localPath` (string)
- `sizeBytes` (bigint)
- `mimeType` (string)
- `checksum` (string)
- `quickKey` (string)
- `pageUrl` (string)
- `directUrl` (string, nullable)
- `folderKey` (string, nullable)
- `status` (enum: uploaded, failed)
- `createdAtRemote` (datetime)
- Relations: `products` (many-to-many) for linking downloads.

### 8) IngestionRun (Single or Collection type)
- `startedAt`, `completedAt`, `status` (enum)
- `stats` (JSON: processed, created, updated, skipped, errors)
- `logExcerpt` (text)

### 9) LiveLog (Virtual/Read-Only)
- Not persisted by Strapi; exposed by a custom admin plugin that tails Unity `run.log` and `metadata.jsonl` events. Provides WebSocket feed and searchable history via Log backend.

---

## Ingestion & Sync Design

### Sources
- Content-server SQL views/tables containing:
  - Unity package metadata and derived fields (see `metadata-project.md`).
  - URL tables mapping packages/products to discovered `assetstore.unity.com` and other links.

### Connector
- Ingestion Worker connects to content-server SQL (read-only) and to Strapi Admin API.
- Scheduling via cron (e.g., every 10–30 minutes) and on-demand via admin action.

### Mapping & Idempotency
- Deterministic keys:
  - Product identity: normalized `publisherName + suspectedName + suspectedVersion` or `assetId` when present.
  - SourceUrl identity: `url` unique.
  - UnityPackage identity: `sha256` or `inputPath` + `sha1`.
- Conflict resolution:
  - Prefer manual edits in Strapi over automated fields (flag `isManualOverride` per field set tracked in `metadata` with source-of-truth markers).
  - Ingestion only updates fields not marked overridden.
- Upserts:
  - Create missing entities; update existing based on identities.
  - Attach relations (publisher/category/sourceUrls) idempotently.
- Audit:
  - Record `IngestionRun` with counts and error messages.

### Media Handling (Images)
- Content-server provides or references image assets; Ingestion Worker imports these into Strapi using Upload API and attaches to Product `images`.
- Dedup via content hash; avoid duplicates in the media library.

---

## ArchiveBox Integration

### Triggering Captures
- For each `SourceUrl` linked to a `Product`, if no recent `ArchiveSnapshot` exists or older than TTL (e.g., 180 days), enqueue capture.
- Admin can trigger a capture from Strapi (custom controller/action) for any `SourceUrl`.

### Execution Paths
- Primary: `docker compose run archivebox add <URL>` or HTTP if ArchiveBox API is enabled.
- Orchestrator polls ArchiveBox index (SQLite/JSON/FS) or CLI `list`/`status` to determine completion.

### Persisting Results
- On completion, create `ArchiveSnapshot` with `snapshotUrl`, `timestamp`, size, and metadata.
- Link snapshot to `Product` and `SourceUrl`.

### Retry & Backoff
- Exponential backoff on transient errors; cap retries; surface failures in `ArchiveSnapshot.status=failed` with reason.

---

## Manual Workflows (Admin UX in Strapi)

- Create/Edit Product:
  - Title, description, publisher, categories, tags.
  - Upload/select images for gallery.
  - Attach existing `SourceUrl` or create new ones.
  - Button: "Archive Now" to enqueue ArchiveBox for attached URLs.
- Create Publisher/Category entries.
- Link Unity Packages to Products (for provenance and details).
- Add/Link MediaFire files (optional downloads section) using quickkey/page URL.
- Override fields (lock certain fields against future sync updates).
- View ingestion runs; re-run ingestion; view diffs for a Product.
- Live Logs page: real-time Unity extractor logs with filters; quick links to latest errors and to assets referenced in the logs.

---

## Permissions, Roles, and Access

- Public API access: read-only across published content.
- Roles:
  - Admin: full access; manage settings, triggers, and plugins.
  - Editor: manage content, run ArchiveBox jobs, view logs.
  - Viewer: read-only admin view (optional), no mutations.
- CORS: allow Next.js frontend origin(s).

---

## API Contracts for Frontend (Strapi)

### REST (default)
- List Products (home, category):
  - `GET /api/products?populate=images,publisher,categories&sort=createdAt:desc&pagination[page]={n}&pagination[pageSize]=24`
- Category Listing:
  - `GET /api/categories?populate=deep`
- Products by Category Slug:
  - `GET /api/products?filters[categories][slug][$eq]={slug}&populate=images,publisher,categories&pagination[page]={n}&pagination[pageSize]=24`
- Product Detail by Slug:
  - `GET /api/products/{id or slug}?populate=images,publisher,categories,archiveSnapshots`
- Publishers:
  - `GET /api/publishers?populate=logo`

### GraphQL (optional)
- Enable Strapi GraphQL plugin for typed queries used by Next.js RSC.

### SEO & Metadata
- Include canonical URL, Open Graph fields derived from Product fields and images.

---

## Logging & Observability

### Unity Extractor Live Logs
- Log shipper tails `run.log` and pushes to a store (Loki/Elastic) and a lightweight WebSocket endpoint.
- Strapi Admin plugin subscribes to WebSocket; displays stream with severity filters, search, and links into content.
- Summaries: recent runs, error rate, processed counts (from `IngestionRun`).

### System Health
- Health checks for Strapi, DB, ArchiveBox, Ingestion Worker.
- Alerts (optional): container restarts, ingestion failures.

---

## Security & Privacy
- No secrets in logs.
- Strapi Admin behind authentication; optional IP allowlist or SSO.
- ArchiveBox bound to loopback; exposed only via reverse proxy if needed.
- Public content is read-only; admin actions audited.

---

## Execution Plan

### Phase 1 — Foundation (0.5–1 day)
- Provision Docker Compose for Strapi + Postgres + ArchiveBox.
- Configure Strapi Upload provider (local disk or S3-compatible).
- Bootstrap roles, CORS, and basic settings.

### Phase 2 — Content Types & Admin UX (1–2 days)
- Implement content types: Product, Publisher, Category, SourceUrl, ArchiveSnapshot, UnityPackage, IngestionRun, MediaFireFile.
- Configure list/detail views, default populations, and field layouts in Strapi admin.
- Create custom actions: "Archive Now", override locks, ingestion trigger.

### Phase 3 — Ingestion Worker (1–2 days)
- Build Node.js worker:
  - SQL connector to content-server (read-only).
  - Mapping + idempotent upserts into Strapi Admin API.
  - Media import/upload and dedupe.
  - IngestionRun records and metrics.
- Schedule cron and manual trigger endpoints.

### Phase 4 — Archive Orchestration (1 day)
- Implement ArchiveBox enqueue + poll; snapshot parsing and persistence.
- TTL-based refresh; admin-triggered jobs.

### Phase 5 — Live Logs & Metrics (1 day)
- Set up log shipper (promtail/vector) and lightweight WebSocket relay.
- Build Strapi Admin plugin page for real-time logs and summaries.

### Phase 6 — Frontend Integration & Polish (1 day)
- Validate API contracts with Next.js frontend (`site-frontends.md`).
- Ensure pagination, categories, product detail, images, and publisher data are correctly exposed with ISR-friendly caching headers.
- Add basic E2E checks.

### Phase 7 — QA & Handover (0.5–1 day)
- Backfill archive snapshots for existing URLs.
- Load test listing endpoints and media delivery.
- Document runbooks and backup/restore for Strapi and ArchiveBox data.

---

## Deliverables
- Docker Compose stack:
  - `strapi`, `postgres`, `archivebox`, `ingestion-worker`, `archive-orchestrator`, optional `redis`, `log-collector`.
- Strapi project repository:
  - Content types and relations defined as code (schema JSON).
  - Role & permission configuration; CORS; Upload provider config.
  - Admin customizations (views, actions, and Live Logs plugin page).
- Ingestion Worker repository:
  - SQL connector, mapping logic, idempotent upserts, media import, CLI + cron.
  - Config via environment variables; structured logging.
- Archive Orchestrator module:
  - Enqueue/poll logic; ArchiveBox integration; snapshot persistence.
- Example data:
  - Sample imported Products, Categories, Publishers, SourceUrls.
  - A few ArchiveSnapshots and Media images for the frontend.

---

## Acceptance Criteria
- Given a populated content-server SQL, running the Ingestion Worker creates/updates Strapi Products with publishers, categories, images, and linked source URLs.
- Admin can:
  - Manually edit Products and lock fields against future automatic updates.
  - Create new Products and SourceUrls not present in the content-server.
  - Trigger ArchiveBox for any SourceUrl and see resulting snapshots.
  - View real-time Unity extractor logs in the Strapi admin UI.
- Frontend can:
  - List Products (24/page), filter by category, view product detail with gallery, publisher, categories, and snapshot links.
  - Access public read endpoints with appropriate CORS headers.
- System stability:
  - Ingestion is idempotent and resume-safe; failures are logged with actionable errors.
  - ArchiveBox jobs complete and persist snapshot metadata with statuses.
  - Logs stream reliably and are viewable historically (if log store is enabled).
