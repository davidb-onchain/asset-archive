# Asset Archive Project

## Docker Compose Configurations

This project uses multiple Docker Compose configurations for different environments:

### Local Development (Recommended for Development)

```bash
# Start local development environment with live reloading
docker compose up

# Or explicitly specify the files (same result)
docker compose -f docker-compose.yml -f docker-compose.override.yml up
```

**Features:**
- ✅ Builds images from local source code
- ✅ Volume mounts for live reloading (no container rebuild needed)
- ✅ Hot reload for Next.js frontend changes
- ✅ Auto-reload for Strapi CMS changes
- ✅ Fast iteration cycle

### Production Deployment

```bash
# Use pre-built registry images for production
docker compose -f docker-compose.prod.yml up
```

**Features:**
- ✅ Uses pre-built images from GitHub Container Registry
- ✅ Faster startup (no build time)
- ✅ Consistent with CI/CD pipeline
- ✅ Production-optimized

### Development Workflow

1. **Daily Development**: Use `docker compose up` for local development
2. **Testing Changes**: Push to GitHub to trigger image builds
3. **Production Deploy**: Use `docker compose -f docker-compose.prod.yml up`

### File Structure

- `docker-compose.yml` - Base configuration with local builds
- `docker-compose.override.yml` - Development overrides (auto-loaded)
- `docker-compose.prod.yml` - Production configuration with registry images

## Getting Started

1. Copy environment file:
   ```bash
   cp .env.example .env
   ```

2. Start development environment:
   ```bash
   docker compose up
   ```

3. Access the applications:
   - Frontend: http://localhost:3000
   - Strapi CMS: http://localhost:1337 