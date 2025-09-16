# Strapi CMS Setup for Unity Asset Marketplace

## 🚀 Quick Start

### Start Development Environment

```bash
# 1. Start PostgreSQL
docker run -d --name assetarchive-postgres \
  -e POSTGRES_DB=strapi \
  -e POSTGRES_USER=strapi \
  -e POSTGRES_PASSWORD=password \
  -p 55432:5432 \
  -v assetarchive_pgdata:/var/lib/postgresql/data \
  postgres:15

# 2. Start Strapi CMS
cd apps/cms
npm run develop

# 3. Access admin panel
# URL: http://127.0.0.1:1337/admin
# Credentials: See .secrets/strapi-admin.txt
```

### Stop Development Environment

```bash
# Stop Strapi (Ctrl+C in terminal where it's running)
# OR if running in background:
pkill -f "strapi develop"

# Stop PostgreSQL
docker stop assetarchive-postgres

# Optional: Remove PostgreSQL (destroys data)
docker rm -f assetarchive-postgres
docker volume rm assetarchive_pgdata
```

### Service URLs

| Service | URL | Purpose |
|---------|-----|---------|
| **Strapi Admin** | http://127.0.0.1:1337/admin | Content management |
| **Strapi API** | http://127.0.0.1:1337/api | REST/GraphQL endpoints |
| **PostgreSQL** | localhost:55432 | Database |

---

# Strapi CMS Setup for Unity Asset Marketplace

## Overview

This document outlines the complete setup process for a Strapi CMS instance that will serve as the content management backbone for the Unity Asset Marketplace project (`unityassets4free.com`). The Strapi instance needs to replace the current Shopify integration in the frontend while supporting the complex data model required for Unity asset management.

## 🎯 Project Context

**Current State**: The frontend is a Next.js application originally built for Shopify integration (~25-30% complete ecommerce platform)

**Target State**: Strapi-powered headless CMS managing Unity assets with automated ingestion, archiving, and content management

**Key Requirements**:
- Replace Shopify product catalog with Unity asset catalog
- Support complex metadata from Unity package extraction
- Integrate with ArchiveBox for URL archiving
- Handle automated content ingestion from content-server SQL
- Provide admin UI for content management and live log monitoring

## 🏗 Required Strapi Content Types

Based on the site-dashboards specification, the following content types must be implemented:

### 1. Product (Collection Type) - Core Asset
```javascript
{
  title: "string, required",
  slug: "UID from title, unique", 
  shortDescription: "text",
  description: "rich text/Markdown",
  publisher: "relation: many-to-one → Publisher",
  categories: "relation: many-to-many → Category", 
  tags: "JSON array of strings",
  images: "media: multiple",
  sourceUrls: "relation: many-to-many → SourceUrl",
  archiveSnapshots: "relation: one-to-many → ArchiveSnapshot",
  unityPackages: "relation: one-to-many → UnityPackage",
  status: "enum: draft, published, archived",
  visibility: "enum: public, hidden",
  originalCreatedAt: "datetime",
  originalUpdatedAt: "datetime", 
  metadata: "JSON: arbitrary key/values"
}
```

### 2. Publisher (Collection Type)
```javascript
{
  name: "string, required, unique",
  slug: "UID",
  website: "string",
  assetStoreUrl: "string", 
  logo: "media, single",
  description: "rich text"
}
```

### 3. Category (Collection Type) 
```javascript
{
  name: "string, required, unique",
  slug: "UID",
  parent: "self-relation: many-to-one", 
  description: "text"
}
```

### 4. SourceUrl (Collection Type)
```javascript
{
  url: "string, required, unique",
  type: "enum: assetstore, publisher, docs, video, community, other",
  discoveredBy: "enum: cache, embedded, name-heuristics, guid-fingerprint, online-search",
  confidence: "decimal 0.0–1.0",
  firstSeenAt: "datetime",
  lastSeenAt: "datetime", 
  notes: "text",
  products: "relation: many-to-many → Product",
  archiveSnapshots: "relation: one-to-many → ArchiveSnapshot"
}
```

### 5. ArchiveSnapshot (Collection Type)
```javascript
{
  sourceUrl: "relation: many-to-one → SourceUrl",
  product: "relation: many-to-one → Product",
  jobId: "string",
  status: "enum: queued, running, complete, failed",
  pageUrl: "string",
  snapshotUrl: "string", 
  timestamp: "datetime",
  outlinksCount: "integer",
  sizeBytes: "bigint",
  details: "JSON"
}
```

### 6. UnityPackage (Collection Type)
```javascript
{
  inputPath: "string",
  fileName: "string", 
  fileSizeBytes: "bigint",
  sha256: "string",
  sha1: "string",
  assetCount: "integer",
  assetExtensions: "JSON",
  rootFolders: "JSON", 
  guidSample: "JSON",
  guidCount: "integer",
  suspectedName: "string",
  suspectedVersion: "string",
  publisherName: "string", 
  assetStoreUrl: "string",
  assetId: "string",
  confidence: "decimal",
  detectionMethods: "JSON array",
  error: "string, nullable",
  processedAt: "datetime",
  durationMs: "integer",
  product: "relation: many-to-one → Product"
}
```

### 7. MediaFireFile (Optional Collection Type)
```javascript
{
  localPath: "string",
  sizeBytes: "bigint", 
  mimeType: "string",
  checksum: "string",
  quickKey: "string",
  pageUrl: "string",
  directUrl: "string, nullable",
  folderKey: "string, nullable",
  status: "enum: uploaded, failed", 
  createdAtRemote: "datetime",
  products: "relation: many-to-many → Product"
}
```

### 8. IngestionRun (Collection Type)
```javascript
{
  startedAt: "datetime",
  completedAt: "datetime", 
  status: "enum: pending, running, completed, failed",
  stats: "JSON: {processed, created, updated, skipped, errors}",
  logExcerpt: "text"
}
```

## 🚀 Setup Process

### Phase 1: Basic Strapi Installation

1. **Initialize Strapi Project**
```bash
cd apps/cms
npx create-strapi-app@latest . --quickstart --no-run
```

2. **Install Required Dependencies**
```bash
npm install @strapi/plugin-graphql @strapi/plugin-users-permissions
npm install pg  # PostgreSQL driver
npm install redis ioredis  # For caching and queues
```

3. **Configure Database (PostgreSQL)**
```javascript
// config/database.js
module.exports = ({ env }) => ({
  connection: {
    client: 'postgres',
    connection: {
      host: env('DATABASE_HOST', '127.0.0.1'),
      port: env.int('DATABASE_PORT', 5432),
      database: env('DATABASE_NAME', 'strapi'),
      user: env('DATABASE_USERNAME', 'strapi'),
      password: env('DATABASE_PASSWORD', 'password'),
      ssl: env.bool('DATABASE_SSL', false),
    },
  },
});
```

### Phase 2: Content Type Implementation

1. **Create Content Types via Admin Panel**
   - Navigate to Content-Type Builder
   - Create each content type with specified fields and relations
   - Configure field validations and requirements

2. **Set Up Media Library**
```javascript
// config/plugins.js
module.exports = ({ env }) => ({
  upload: {
    config: {
      provider: 'local', // or 'aws-s3' for production
      providerOptions: {
        sizeLimit: 100 * 1024 * 1024, // 100MB
      },
    },
  },
});
```

### Phase 3: API Configuration

1. **Configure CORS for Frontend**
```javascript
// config/middlewares.js
module.exports = [
  'strapi::errors',
  {
    name: 'strapi::cors',
    config: {
      origin: [
        'http://localhost:3000', // Next.js dev
        'https://unityassets4free.com' // Production
      ],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    },
  },
  'strapi::poweredBy',
  'strapi::logger',
  'strapi::query',
  'strapi::body',
  'strapi::session',
  'strapi::favicon',
  'strapi::public',
];
```

2. **Set Up Public Permissions**
   - Navigate to Settings → Users & Permissions → Roles → Public
   - Enable read permissions for: Product, Category, Publisher, SourceUrl, ArchiveSnapshot
   - Keep admin-only: UnityPackage, IngestionRun, MediaFireFile

### Phase 4: Custom Functionality

1. **Create Live Logs Plugin**
```bash
cd src/plugins
npx create-strapi-plugin live-logs
```

2. **Implement Custom Controllers**
   - Archive trigger endpoints
   - Ingestion trigger endpoints  
   - Live log streaming endpoints

3. **Add Custom Admin Views**
   - Live log viewer with WebSocket connection
   - Ingestion run dashboard
   - Archive job management interface

## 🔌 Required Integrations

### 1. Content Server SQL Connection
- Read-only connection to content-server database
- Scheduled sync via ingestion worker
- Mapping Unity metadata to Strapi content types

### 2. ArchiveBox Integration  
- Docker Compose service configuration
- Job queue for URL archiving
- Snapshot result persistence

### 3. Frontend API Contracts

The Strapi instance must support these API endpoints for the frontend:

```bash
# Product Listing (Home/Category Pages)
GET /api/products?populate=images,publisher,categories&sort=createdAt:desc&pagination[page]=1&pagination[pageSize]=24

# Category Listing  
GET /api/categories?populate=deep

# Products by Category
GET /api/products?filters[categories][slug][$eq]=complete-projects&populate=images,publisher,categories

# Product Detail
GET /api/products/[slug]?populate=images,publisher,categories,archiveSnapshots

# Publishers
GET /api/publishers?populate=logo
```

## 🐳 Docker Compose Configuration

```yaml
# docker-compose.yml
version: '3.8'
services:
  strapi:
    build: ./apps/cms
    ports:
      - "1337:1337"
    environment:
      - DATABASE_CLIENT=postgres
      - DATABASE_HOST=postgres
      - DATABASE_PORT=5432
      - DATABASE_NAME=strapi
      - DATABASE_USERNAME=strapi
      - DATABASE_PASSWORD=password
    volumes:
      - ./apps/cms:/srv/app
      - strapi_uploads:/srv/app/public/uploads
    depends_on:
      - postgres
      - redis

  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=strapi
      - POSTGRES_USER=strapi  
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

  archivebox:
    image: archivebox/archivebox:latest
    ports:
      - "8000:8000"
    volumes:
      - ./data/archivebox:/data
    environment:
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=password

volumes:
  postgres_data:
  redis_data:
  strapi_uploads:
```

## 🔧 Environment Configuration

```bash
# .env
NODE_ENV=development
HOST=0.0.0.0
PORT=1337
APP_KEYS=your-app-keys-here
API_TOKEN_SALT=your-api-token-salt
ADMIN_JWT_SECRET=your-admin-jwt-secret  
TRANSFER_TOKEN_SALT=your-transfer-token-salt
JWT_SECRET=your-jwt-secret

# Database
DATABASE_CLIENT=postgres
DATABASE_HOST=postgres
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# ArchiveBox Integration
ARCHIVEBOX_URL=http://archivebox:8000
ARCHIVEBOX_USERNAME=admin
ARCHIVEBOX_PASSWORD=password

# Content Server SQL (for ingestion)
CONTENT_SERVER_HOST=localhost
CONTENT_SERVER_PORT=5432
CONTENT_SERVER_DB=content_server
CONTENT_SERVER_USER=readonly
CONTENT_SERVER_PASSWORD=password
```

## 📋 Migration Checklist

### ✅ Infrastructure Setup
- [ ] PostgreSQL database running
- [ ] Redis instance for caching/queues  
- [ ] Strapi application initialized
- [ ] Docker Compose stack configured

### ✅ Content Model Implementation
- [ ] Product content type with all fields
- [ ] Publisher content type
- [ ] Category content type with hierarchy
- [ ] SourceUrl content type
- [ ] ArchiveSnapshot content type  
- [ ] UnityPackage content type
- [ ] IngestionRun content type
- [ ] MediaFireFile content type (optional)

### ✅ API Configuration
- [ ] CORS configured for frontend origins
- [ ] Public permissions set for read-only content
- [ ] Admin permissions configured
- [ ] GraphQL plugin enabled (optional)

### ✅ Custom Functionality
- [ ] Live logs plugin implemented
- [ ] Archive trigger endpoints
- [ ] Ingestion worker integration
- [ ] Custom admin views

### ✅ Integration Points
- [ ] Content server SQL connection
- [ ] ArchiveBox Docker service
- [ ] Media upload provider configured
- [ ] Frontend API client updated

## 🔄 Frontend Migration Tasks

Based on the frontend README analysis, these specific changes are needed:

### 1. Replace Data Layer
- **File**: `lib/shopify.ts` → `lib/strapi.ts`
- **Changes**: Replace GraphQL queries with Strapi REST/GraphQL calls
- **New Environment**: `NEXT_PUBLIC_STRAPI_URL=http://localhost:1337`

### 2. Update Type Definitions
- Map `ShopifyProduct` → Strapi Product content type
- Map `ShopifyCollection` → Strapi Category content type  
- Remove cart types (Unity assets are free downloads, no cart needed)

### 3. Simplify Cart Logic
- **Remove**: Complex cart state management
- **Replace**: Simple download tracking (optional)
- **Reason**: Unity assets are free, no purchase flow required

### 4. Update Hooks
- **File**: `hooks/use-shopify.ts` → `hooks/use-strapi.ts`
- **Changes**: Replace Shopify API calls with Strapi endpoints

### 5. Configuration Updates
- Replace `NEXT_PUBLIC_SHOPIFY_STORE_DOMAIN` checks
- Update `SetupTooltip` and `SetupWizard` components
- Modify feature detection logic

## 🚀 Quick Start Commands

```bash
# 1. Start infrastructure
docker-compose up -d postgres redis

# 2. Initialize Strapi
cd apps/cms
npm install
npm run develop

# 3. Access admin panel
# http://localhost:1337/admin

# 4. Create admin user and configure content types

# 5. Start ingestion worker  
cd services/ingestion-worker
npm install
npm run start

# 6. Start archive orchestrator
cd services/archive-orchestrator  
npm install
npm run start

# 7. Start frontend with Strapi integration
cd apps/frontend
# Update environment variables
echo "NEXT_PUBLIC_STRAPI_URL=http://localhost:1337" > .env.local
npm run dev
```

## 📊 Key Differences from Shopify Integration

| Aspect | Shopify (Current) | Strapi (Target) |
|--------|------------------|-----------------|
| **Data Source** | Shopify Storefront API | Strapi REST/GraphQL API |
| **Content** | E-commerce products | Unity asset packages |
| **Cart** | Full shopping cart | Simple download links |
| **Pricing** | Complex pricing tiers | Free assets only |
| **Authentication** | Optional | Not required for downloads |
| **Metadata** | Basic product info | Rich Unity package metadata |
| **Categories** | Simple collections | Hierarchical categories |
| **Media** | Product images | Asset screenshots + packages |
| **Content Management** | Shopify Admin | Strapi Admin + custom plugins |

## 🎯 Success Criteria

### Functional Requirements
- [ ] Frontend displays Unity assets instead of Shopify products
- [ ] Categories work with Unity asset taxonomy
- [ ] Product detail pages show Unity package metadata  
- [ ] Download links work for Unity packages
- [ ] Admin can manage content via Strapi admin panel
- [ ] Automated ingestion from content-server works
- [ ] ArchiveBox integration captures source URLs
- [ ] Live logs visible in Strapi admin

### API Requirements  
- [ ] All frontend API calls work with Strapi endpoints
- [ ] Pagination works with 24 items per page
- [ ] Category filtering functions properly
- [ ] Search functionality integrated
- [ ] Image delivery optimized
- [ ] CORS configured for frontend domain

### Performance Requirements
- [ ] Product listing API responds < 300ms (p95)
- [ ] Image delivery optimized with responsive sizes
- [ ] ISR/caching configured for static content
- [ ] Database queries optimized with proper indexes

## 🔒 Security & Permissions

### Public API Access
- **Products**: Read-only access to published content
- **Categories**: Full read access  
- **Publishers**: Read access with logo
- **SourceUrls**: Read access for public URLs only
- **ArchiveSnapshots**: Read access to completed snapshots

### Admin Roles
- **Admin**: Full access, manage settings, triggers, plugins
- **Editor**: Manage content, run archive jobs, view logs  
- **Viewer**: Read-only admin view (optional)

### Authentication
- Admin panel requires authentication
- Public API is read-only without authentication
- Optional: IP allowlist for admin access

## 🛠 Development Workflow

1. **Content Types**: Create and configure all content types in Strapi admin
2. **Sample Data**: Import sample Unity assets for testing
3. **API Testing**: Verify all frontend API endpoints work
4. **Frontend Migration**: Update Next.js app to use Strapi
5. **Integration Testing**: Test ingestion worker and archive orchestrator
6. **Live Logs**: Implement custom admin plugin for log monitoring
7. **Production Deploy**: Configure production environment

## 📝 Next Steps

- [x] **Set up basic Strapi instance** with PostgreSQL 
  - PostgreSQL container is running on port 55432, Strapi scaffolded in apps/cms with proper encryption keys, admin accessible at http://127.0.0.1:1337/admin
- [x] **Implement all content types** and basic API endpoints
  - Created all 8 content types (Product, Publisher, Category, SourceUrl, ArchiveSnapshot, UnityPackage, MediaFireFile, IngestionRun) with proper schema definitions, relations, and API endpoints. Added custom admin roles (Content Manager, Ingestion Operator, Viewer) and configured public API permissions.  
- [ ] **Migrate frontend** from Shopify to Strapi integration
- [ ] **Implement ingestion worker** and archive orchestrator
- [ ] **Add live logs plugin** and admin customizations
- [ ] **Testing, optimization,** and production deployment

This setup will transform the Shopify-based frontend into a Unity asset marketplace powered by Strapi, supporting the complex metadata requirements and automated content management workflows specified in the project architecture.
