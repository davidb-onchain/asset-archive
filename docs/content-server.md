## Technical specification: Minimal DigitalOcean compute for ArchiveBox page archiving

### Objective
Deploy infrastructure as code on DigitalOcean that provisions the smallest viable compute to archive web pages using ArchiveBox, optimized for low cost and easy client operations, with persistent storage and simple scheduling.

### Constraints and assumptions
- **Compute model**: Prefer a single small Droplet (VM) for simplicity and persistent disk. Optionally use DigitalOcean App Platform Worker if you want PaaS ergonomics.
- **Storage**: Local Droplet volume for active archive plus offsite backups to DigitalOcean Spaces (S3-compatible) or Cloudflare R2.
- **Archive mode**: Start with wget-only mode (no headless Chromium) to minimize CPU/RAM; optionally enable headless captures with Chromium if fidelity is required.
- **Scale**: Small continuous trickle (e.g., 5–50 URLs per run) scheduled every 5–30 minutes.
- **Region**: Single region close to Spaces bucket to reduce latency/egress.
- **Client-manageable**: GUI-first operations (DO control panel) with one-click snapshots/backups, simple logs, and minimal cloud concepts.

### Target architecture (minimal viable)
- **Droplet**: 1 vCPU, 1–2 GB RAM, 25–50 GB SSD, Ubuntu LTS. Runs Dockerized ArchiveBox and a small helper script.
- **Scheduler**: systemd timer (preferred) or cron on the Droplet to run batches on an interval.
- **Storage**:
  - Primary: local filesystem on the Droplet for the ArchiveBox repo (SQLite index, snapshots, assets).
  - Secondary: DigitalOcean Spaces for periodic sync/backups (e.g., nightly). Optionally keep logs and run summaries in a `runs/` prefix.
- **Queue**: A simple `urls.txt` file stored on-disk. Optional: store it in Spaces if you need remote submissions without SSH access.
- **Optional UI**: Simple web form served by a tiny container (or App Platform Static Site + Functions) that appends URLs to `urls.txt` via a minimal authenticated endpoint.

### Components
- **IaC**: Terraform for DigitalOcean resources (Droplet, firewall, SSH key, Spaces bucket, Spaces access key).
- **Provisioning**: cloud-init or Ansible to install Docker, ArchiveBox image, and systemd service/timer.
- **Backup**: rclone or awscli to sync archive directory to Spaces on a daily schedule; lifecycle rules on the bucket.
- **Observability**: journald logs for services, optional tail to file and rotation; DO Monitoring/Alerts for CPU, memory, disk, and failed systemd units.

### Sizing guidance ("only just powerful enough")
- **Droplet size**: Start at Basic 1 vCPU / 1 GB RAM / 25 GB SSD. If enabling headless Chromium, use 2 GB RAM.
- **Network**: Typical archive throughput 10–40 URLs/hour depending on page size and fidelity mode.
- **Disk**: Keep 10–20 GB free headroom; enforce retention via ArchiveBox or offload old snapshots to Spaces.

### Data flow
1. A systemd timer triggers the archiver service every N minutes.
2. The service reads a batch from `urls.txt` (first N lines), writes the remainder back atomically.
3. ArchiveBox runs `archivebox add` in wget-only mode by default (headless optional) writing to the local archive directory.
4. Logs are written to journald and optional `runs/YYYY-MM-DD/*.json` summaries.
5. A nightly backup job syncs the archive directory to Spaces (delta), and rotates old backups per lifecycle rules.

### Security
- DO firewall: allow SSH from admin IPs only; allow HTTP(S) if hosting the submission UI on the Droplet.
- Least-privilege Spaces access key scoped to the specific bucket/prefix.
- Secrets stored as systemd environment files with correct permissions; not in git.
- URL validation and private IP blocking for the submission endpoint.

### Costs
- Droplet ~$6–$12/month depending on RAM; add Spaces storage/egress as used.
- Backups/snapshots optional add-ons (snapshots before updates are recommended).

### Risks and mitigations
- **Disk growth**: Apply retention policies, compress logs, move older snapshots to Spaces.
- **Headless overhead**: If enabling Chromium, monitor memory and CPU; increase Droplet size to 2 GB RAM if OOM occurs.
- **Single-instance**: Use snapshots and Spaces backups for quick recovery; optionally add a second standby Droplet definition in Terraform.
- **Client ops load**: Provide simple runbooks and one-command scripts for common tasks.


## Execution plan

### Phase 0 — Repo and providers
- Create repo structure: `infra/` (Terraform), `provision/` (cloud-init/Ansible), `app/` (optional UI), `docs/`.
- Configure Terraform backend (local or remote) and providers: `digitalocean` and `aws` (for Spaces via S3 API) or `rclone` in provisioning.

### Phase 1 — Networking, IAM, and storage
- Provision Spaces bucket and least-privilege access key (read/write to `archive/` and `runs/`).
- Create a DigitalOcean firewall permitting SSH from admin IPs and HTTP/HTTPS if needed.
- Output bucket name, region, endpoint, and credentials for provisioning.

### Phase 2 — Compute
- Provision Droplet (Ubuntu LTS) with SSH key; attach firewall; enable automatic backups.
- Supply cloud-init to:
  - Install Docker and `docker compose`.
  - Create directories: `/srv/archivebox`, `/srv/archivebox/data`, `/srv/archivebox/logs`.
  - Pull ArchiveBox Docker image; write an `.env` and `docker-compose.yml` with pinned versions.
  - Create a systemd service `archivebox.service` to run ad-hoc jobs and a timer `archivebox.timer` for interval runs.
  - Create a nightly backup service/timer `archivebox-backup.service` using rclone or awscli to Spaces.

### Phase 3 — Optional UI and remote submissions
- Deploy a small submission service (Flask/FastAPI/Node) behind simple auth to append to `urls.txt`.
- Alternatively, host a static form on DigitalOcean App Platform that posts to the Droplet endpoint.

### Phase 4 — Hardening and guardrails
- Enable unattended-upgrades and reboot-required notifier.
- Add fail2ban (if exposing SSH) and limit SSH to keys only.
- Add disk space alerts and systemd unit failure alerts in DO Monitoring.

### Phase 5 — Ops
- Document runbooks: restore from Spaces, scale Droplet, rotate keys, change schedules, enable headless mode.
- Provide a canary set of URLs and a smoke test script.


## Deliverables
- **Terraform** (`infra/`):
  - DigitalOcean resources: Droplet, firewall, SSH keys, Spaces bucket, Spaces access key, monitoring alerts.
  - Variables and outputs for bucket credentials, region, and Droplet IP.
- **Provisioning** (`provision/`):
  - cloud-init or Ansible playbook to install Docker, configure ArchiveBox, systemd services/timers, and backup job.
  - `docker-compose.yml` and `.env.example` with pinned images and resource limits.
- **Application (optional)** (`app/`):
  - Minimal submission API/UI to append URLs and show recent run summaries.
- **Configuration & docs** (`docs/`, `README.md`):
  - Setup instructions, secrets management, runbooks, and troubleshooting.
- **Testing**:
  - Smoke test script that archives a few canary URLs and verifies snapshots and Spaces backup.


## Acceptance criteria
- Scheduled runs archive a batch of public URLs into the local ArchiveBox repo successfully and complete within configured resource limits on the chosen Droplet size.
- Nightly backup syncs modified artifacts to Spaces; backup logs show success and retention applies.
- Re-running is idempotent (no duplicates, index remains consistent) and recoverable from Spaces backup and a Droplet snapshot.
- No secrets are committed; Terraform apply and provisioning are reproducible from scratch.


## Notes and references
- DigitalOcean Droplets docs and firewall configuration for baseline hardening.
- DigitalOcean Spaces (S3-compatible) with lifecycle policies for cost control.
- ArchiveBox docs for configuring wget-only vs headless Chromium saves and retention policies.
