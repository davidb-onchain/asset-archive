## MediaFire Batch Uploader — Technical Specification

### Objective
Build a command-line script that batch-uploads local files to MediaFire. Each uploaded file must be accessible via its own individual MediaFire download page (public share URL). The script outputs a manifest mapping local file paths to their resulting MediaFire URLs and metadata.

### References (cited)
- MediaFire SDK examples (authentication, upload, get_links): `mediafire-csharp-open-sdk` [https://github.com/viciousviper/mediafire-csharp-open-sdk]
- MediaFire Java SDK (API surface reference): `mediafire-java-sdk` [https://github.com/onenonlycasper/mediafire-java-sdk]
- MediaFire PHP library (notes on App ID/API key and Developers portal): `mediafire-api-php-library` [https://github.com/nviet/mediafire-api-php-library]
- MediaFire service capabilities and share/download pages: MediaFire site [https://sandbox.mediafire.com/]


## Technical Spec

### Scope
- Batch upload arbitrary files and/or recursively a directory tree to a specified MediaFire folder (target folder optional). 
- Ensure each file results in a standard MediaFire file page URL (the branded page). Direct links (non-page, hotlink) are best-effort and may require Pro; script should always return the page URL.
- Produce a machine-readable manifest (JSON and CSV) of uploads containing: local_path, file_size, mime_type, mediafire_quickkey, mediafire_page_url, created_at, target_folder_key, checksum (if available), status.
- Support resumable retries and idempotency to avoid re-uploading already uploaded files (via local cache/manifest and server-side checks where feasible).

### Non-Goals
- Downloading from MediaFire.
- Folder synchronization beyond one-off or repeatable batch uploads.
- GUI; this is a CLI tool.

### Assumptions
- A MediaFire account is available. For API usage an App ID and API Key can be created in My Account → Developers (per PHP library readme) [https://github.com/nviet/mediafire-api-php-library].
- Individual file page links are always obtainable via the API (e.g., file/get_links or equivalent), as shown by SDKs [https://github.com/viciousviper/mediafire-csharp-open-sdk] [https://github.com/onenonlycasper/mediafire-java-sdk].
- Direct download links may be restricted to Pro; script will prefer page URLs and optionally attempt direct links when allowed.

### Implementation Approach
- Primary: use MediaFire’s REST API via HTTP calls, modeled from official SDK behavior (authenticate, upload simple/chunked, poll completion, get_links). The SDKs provide method names and parameters we mirror (e.g., `Upload.Simple`, `Upload.PollUpload`, `File.GetLinks`) [https://github.com/viciousviper/mediafire-csharp-open-sdk] [https://github.com/onenonlycasper/mediafire-java-sdk].
- Fallback: headless browser automation (e.g., Playwright) for web uploads if API credentials aren’t available. This will be off by default and documented as a last resort; API path is recommended.

### CLI Design
- Command: `mediafire-uploader`
- Arguments:
  - `--path <file_or_directory>`: repeatable; accepts files or directories. 
  - `--include "<glob>"` / `--exclude "<glob>"`: filtering when directories are provided.
  - `--dest-folder-key <folderKey>`: target MediaFire folder (optional); if omitted, uploads to root, or create folder via `--dest-folder-name` under root.
  - `--dest-folder-name <name>`: ensure folder exists (create if absent) and use its key.
  - `--concurrency <n>`: parallel uploads (default 4–6; bounded to avoid throttling).
  - `--retries <n>` and `--backoff <spec>`: retry policy.
  - `--manifest <path>`: output path for JSON manifest; CSV emitted to adjacent `*.csv`.
  - `--resume`: read prior manifest to skip already completed uploads.
  - `--attempt-direct-link`: attempt to retrieve direct link as well as page URL; best-effort.
  - `--dry-run`: enumerate candidate files, resolve folder, no uploads.
  - Auth options:
    - `--app-id`, `--api-key`, `--email`, `--password` (or read from env: `MEDIAFIRE_APP_ID`, `MEDIAFIRE_API_KEY`, `MEDIAFIRE_EMAIL`, `MEDIAFIRE_PASSWORD`).

### Authentication & Session
- Use MediaFire’s login flow as per SDKs: authenticate with email/password, appId and apiKey to obtain a session token; refresh/renew token periodically (SDKs mention auto-renew) [https://github.com/viciousviper/mediafire-csharp-open-sdk].
- Secrets are read from environment or a config file (not checked into VCS). 
- Do not log secrets.

### Upload Flow (per file)
1. Compute file metadata (size, mime, mtime, optional checksum).
2. Initiate upload:
   - For small files: simple upload; for large files: chunked/resumable, mirroring SDK behavior (`Upload.Simple` then `Upload.PollUpload`) [https://github.com/viciousviper/mediafire-csharp-open-sdk].
   - Provide target `folderKey` when set.
3. Poll completion until `IsComplete` and `IsSuccess` per SDK guidance, backoff between polls [https://github.com/viciousviper/mediafire-csharp-open-sdk].
4. On completion, retrieve `quickKey` and call file links API (e.g., `file/get_links` analog) to fetch:
   - Standard file page URL (share/download page) — always expected.
   - Direct download URL — optional.
5. Record entry in manifest.

### Folder Handling
- If `--dest-folder-name` is specified, resolve or create folder and capture `folderKey` for uploads.
- If `--dest-folder-key` provided, validate existence.

### Idempotency & Resume
- Maintain local manifest cache (JSON) with stable content hash/size+mtime for each local path.
- On `--resume`, skip files that have completed with matching metadata.
- Optionally (when enabled), verify via `file/search` or `file/get_info`-like call using filename in target folder if no manifest exists, to deduplicate server-side.

### Concurrency & Rate Limiting
- Parallelize up to `--concurrency` uploads; throttle polling requests.
- Implement exponential backoff with jitter for 5xx and throttling.
- Respect maximum chunk sizes per API (guided by SDK defaults; adjust buffer and chunk size pragmatically) [https://github.com/viciousviper/mediafire-csharp-open-sdk].

### Output/Manifest
- JSON manifest array of objects:
  - `local_path`, `size`, `mime`, `checksum` (if computed), `upload_started_at`, `upload_completed_at`, `mediafire_quickkey`, `mediafire_page_url`, `mediafire_direct_url` (nullable), `folder_key`, `status`, `error` (if any).
- CSV with a subset: `local_path,mediafire_page_url,mediafire_quickkey,status`.

### Logging & Observability
- Structured logs to stdout; `--verbose` and `--quiet` modes.
- Progress bars per file (when TTY) and summary metrics at end.

### Security Considerations
- Store credentials only in environment or an optional encrypted config; never in manifest or logs.
- Mask tokens in error messages.

### Compatibility Notes
- Individual page URLs are the contract; direct links may require Pro (MediaFire notes direct download link feature on higher tiers) [https://sandbox.mediafire.com/].
- API specifics are modeled after official SDKs; minor endpoint changes are expected to be abstracted behind a thin client layer [https://github.com/viciousviper/mediafire-csharp-open-sdk] [https://github.com/onenonlycasper/mediafire-java-sdk].


## Execution Plan

### Phase 0 — Setup (0.5 day)
- Obtain MediaFire App ID and API Key (My Account → Developers) [https://github.com/nviet/mediafire-api-php-library].
- Create a dedicated test folder and a test account scope.

### Phase 1 — Client & Auth (0.5–1 day)
- Implement small client module: auth, token handling, base request wrapper.
- Wire env/config parsing; secrets loading.

### Phase 2 — Upload Core (1–2 days)
- Implement simple upload and completion polling.
- Implement chunked upload path for large files (configurable chunk size/buffer); poll until complete.
- Add folder resolution/creation.

### Phase 3 — Links & Manifest (0.5–1 day)
- Implement link retrieval by quickkey (standard page URL required, direct URL optional) as per `file/get_links` usage in SDKs [https://github.com/viciousviper/mediafire-csharp-open-sdk].
- Emit JSON and CSV manifests; idempotent resume.

### Phase 4 — CLI UX, Concurrency, Backoff (0.5–1 day)
- Add argument parsing, directory walking, include/exclude.
- Concurrency control, progress, structured logging.
- Retry/backoff with jitter for transient errors.

### Phase 5 — Validation & Docs (0.5 day)
- Test matrix: small/large files, nested folders, network blips, permission errors.
- Document usage, env vars, examples.

Total: ~3–5 days depending on API nuances and chunked upload behavior.


## Deliverables
- CLI script and modules implementing the uploader (language: Python or Node.js; default to Python for easier distribution).
- Sample `.env.example` with required variables.
- `README.md` usage docs with examples and troubleshooting.
- JSON and CSV manifest outputs for test runs.
- Minimal test suite (unit tests for client and link parsing; integration test using a stub or limited real account).


## Acceptance Criteria
- Given a directory with ≥100 mixed-size files, running the tool produces per-file MediaFire page URLs and a complete manifest with ≥99% success (transient failures retried; remaining surfaced clearly).
- Re-running with `--resume` skips already uploaded files.
- Providing `--dest-folder-name` results in uploads under that folder and correct folder key recorded.
- No secrets written to disk or logs.


## Risks & Mitigations
- API surface drift/not publicly documented: mitigate by following official SDK behaviors and testing against current responses [https://github.com/viciousviper/mediafire-csharp-open-sdk] [https://github.com/onenonlycasper/mediafire-java-sdk].
- Direct links unavailable on free plans: contract centers on page URLs; expose a flag to attempt direct link where permitted [https://sandbox.mediafire.com/].
- Large file stability: implement chunking, polling, and retries with backoff.
