## ArchiveBox (Dockerized) — Technical Spec, Execution Plan, and Deliverables

### Objective
Stand up a production-ready, dockerized instance of ArchiveBox with persistent storage, web UI, secure access, and repeatable operations (backup/restore, upgrades), following upstream best practices.

### Scope
- Single ArchiveBox deployment via Docker Compose on Linux.
- Local persistent storage at `/srv/archivebox/data`.
- Optional full-text search via Sonic (toggleable).
- Optional HTTPS via reverse proxy (Nginx/Caddy) in front of `127.0.0.1:8000`.

### Success Criteria
- Web UI reachable and authenticated.
- Data persists across restarts and upgrades.
- Backups restorable to a working state.
- Basic health checks pass; logs retained.

## Technical Specification

### Architecture Overview
- **Core service**: `archivebox` container exposing HTTP on port 8000.
- **Persistent volume**: Host path `/srv/archivebox/data` mounted to container path `/data`.
- **Optional search**: `sonic` container with config `sonic.cfg`, integrated via ArchiveBox.
- **Optional reverse proxy**: Nginx/Caddy terminating TLS and proxying to `127.0.0.1:8000`.

### Requirements
- **OS**: Linux with Docker and Docker Compose plugin.
- **Docker**: Version ≥ 20.10; Compose v2 plugin recommended.
- **CPU/Memory**: 2 vCPU, 4–8 GB RAM baseline (more if archiving media-heavy sites).
- **Disk**: Starts at 20–50 GB; plan for growth depending on archived content.
- **Network**: Egress to target sites; ingress from LAN/Internet as needed.

### Configuration
- **Data directory**: `/srv/archivebox/data` (owned by service account, initially permissive for first run, then tightened by ArchiveBox).
- **Core env/config** (persisted in `/srv/archivebox/data/ArchiveBox.conf`):
  - `ADMIN_USERNAME`, `ADMIN_PASSWORD` for web admin.
  - `OUTPUT_PERMISSIONS` (default handled by ArchiveBox on first run).
  - Timeouts: `TIMEOUT`, `MEDIA_TIMEOUT` sized for environment.
  - Toggles: `SAVE_WGET`, `SAVE_PDF`, `SAVE_SCREENSHOT`, `SAVE_DOM`, `SAVE_MEDIA`, etc.
  - Optional: `PUID`/`PGID` to run as a non-root UID/GID.
  - Optional: `CHROME_HEADLESS=True`, `CHECK_SSL_VALIDITY=False` for environments with problematic certs.
- **Ports**: Bind `archivebox` to `127.0.0.1:8000` and publish via reverse proxy for HTTPS.
- **Healthcheck**: HTTP GET `/` expecting 200 from the web UI.
- **Logs**: Stdout/stderr captured by Docker; rotate via Docker or system logrotate.

### Storage & Backups
- **Volume mapping**: `/srv/archivebox/data:/data`.
- **Backup cadence**: Daily snapshot; retain 30 days; weekly/monthly long-term as needed.
- **Backup method**: Create compressed archives of `/srv/archivebox/data` excluding transient caches; encrypt at rest if required.
- **Restore method**: Stop services, replace `/srv/archivebox/data` with snapshot, start services, run `update --index-only` if needed.

### Security
- **Authentication**: Create superuser on init; consider disabling public views for private deployments.
- **Network**: Bind to loopback; expose only via reverse proxy with TLS.
- **Least privilege**: Run container with `PUID`/`PGID` mapped to a dedicated non-root service account.
- **Headers**: If using SSO/proxy auth, configure `REVERSE_PROXY_*` options.

### Scalability & Performance
- Enable Sonic for faster full-text search on larger archives.
- Tune timeouts and Chrome headless resources for stability.
- Consider faster storage (SSD) for heavy workloads.

### Operations
- **Initialization**: Create data dir, fetch Compose file, run `init`, create superuser.
- **Adding URLs**: Via CLI, stdin, or web UI; use `--depth=1` to expand feeds.
- **Upgrades**: Pull latest images and recreate containers without data loss.
- **Monitoring**: Healthcheck endpoint, container restart policies, basic alerts on container restarts/failures.

## Execution Plan

### Phase 1 — Preparation (0.5 day)
- Create service account (non-root) and base directories.
- Install/verify Docker & Compose.

Commands (run as root or with sudo where appropriate):
```bash
mkdir -p /srv/archivebox/data && cd /srv/archivebox
curl -fsSL 'https://docker-compose.archivebox.io' > docker-compose.yml
```

### Phase 2 — Initial Deploy (0.5 day)
- Initialize ArchiveBox collection and admin user.
- Start the stack and validate the web UI.

```bash
# initialize collection
docker compose run archivebox init
# create admin user (or use ADMIN_USERNAME/ADMIN_PASSWORD envs)
docker compose run archivebox manage createsuperuser
# start services
docker compose up -d
```

### Phase 3 — Configuration Hardening (0.5 day)
- Set `ArchiveBox.conf` values (timeouts, save toggles, permissions).
- Bind to loopback; add reverse proxy for HTTPS if Internet-accessible.
- Optionally enable Sonic search:
  - Download `sonic.cfg` to `/srv/archivebox/sonic.cfg`.
  - Uncomment `sonic` service in `docker-compose.yml` and link to ArchiveBox.
  - Backfill index: `docker compose run archivebox update --index-only`.

### Phase 4 — Backups & Restore Runbook (0.5 day)
- Implement daily backup script and retention.
- Test restore from a backup to a staging path.

Example backup (unencrypted; adapt for your tooling):
```bash
tar --exclude='cache' --exclude='tmp' -czf /var/backups/archivebox_$(date +%F).tgz -C /srv/archivebox data
```

### Phase 5 — Handover & Validation (0.5 day)
- Document runbooks: add URLs, import feeds, upgrade, backup/restore.
- Validate success criteria; capture baseline metrics.

## Deliverables
- Running ArchiveBox instance reachable at `https://<your-domain>` or via LAN.
- `docker-compose.yml` pinned to known-good image tags and configured services.
- `/srv/archivebox/data` initialized with persistent `ArchiveBox.conf`.
- Admin credentials securely handed over (or SSO docs if used).
- Optional `sonic.cfg` and enabled Sonic service (if in scope).
- Backup script(s) and retention policy documentation.
- Runbook covering: operations, upgrades, backup/restore, health checks.

## Acceptance Criteria
- Admin can log in and add URLs via UI and CLI.
- Snapshots persist and are accessible on filesystem and via UI.
- Backup completes successfully and a restore yields a working instance.
- Healthcheck returns 200; containers restart automatically on failure.

## Risks & Assumptions
- Heavy sites/media can increase disk, CPU, and timeouts; plan capacity.
- Some sites block archivers; may require adjusted user-agents or toggles.
- Running headless Chrome consumes memory; ensure adequate resources.

## References
- ArchiveBox Docker (Compose & Docker usage, setup, config): [docs.archivebox.io/dev/Docker.html](https://docs.archivebox.io/dev/Docker.html)
- ArchiveBox README / Quickstart: [docs.archivebox.io/dev/README.html](https://docs.archivebox.io/dev/README.html)
- Quickstart guide (stdin imports, general flow): [docs.archivebox.io/dev/Quickstart.html](https://docs.archivebox.io/dev/Quickstart.html)
