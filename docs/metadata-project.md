## Unity Asset Metadata Extraction Project

### Goal
Build a Unity (Editor-only) project that extracts metadata from `.unitypackage` files to identify the corresponding Asset Store URL and publisher, supports batch processing of multiple packages, and writes structured logs (JSONL and CSV) with confidence scoring and audit details.

### Scope
- Input: One or more `.unitypackage` files (local filesystem).
- Output:
  - Structured log files: `metadata.jsonl` (line-delimited JSON) and `metadata.csv`.
  - Per-run `run.log` with diagnostics and errors.
- Platform: Unity 2021.3 LTS+ on Linux/macOS/Windows (Editor mode; no runtime requirement).
- Modes: Interactive (Editor menu) and headless (BatchMode CLI).

### Key Requirements
- Extract core metadata without fully unpacking to disk (stream tar.gz entries):
  - Package filename, size, cryptographic hashes (SHA-256, SHA-1).
  - List of contained asset paths, file extensions, counts, approximate total content size.
  - Collected GUIDs from `*.meta` files.
  - Heuristics for name/version (derived from filename and root folder names).
  - Detection of embedded links or text mentioning Asset Store pages.
- Resolve Asset Store identity:
  - Attempt exact mapping via Unity Asset Store cache (if available on host).
  - Heuristic search using package name tokens and publisher tokens (optional online mode).
  - Fuzzy fingerprinting using GUID sets and file lists against a local registry (if provided).
  - Produce a confidence score and method trail (how the match was determined).
- Batch execution:
  - Process directories and file lists; limit concurrency to keep memory stable.
  - Resume-safe: skip already-processed items when `--resume` specified.
  - Deterministic logging: stable field order and consistent formatting.
- Logging and observability:
  - Per-asset result line including success/failure and error message.
  - Summary stats at end (processed, matched, unmatched, errors, duration).

### Non-Goals / Out of Scope
- Downloading assets from the Asset Store.
- Modifying or importing assets into the current Unity project.
- Guaranteeing a match for every `.unitypackage` (not all packages contain sufficient metadata).


## Technical Design

### File Format Notes
- `.unitypackage` is a gzipped tar archive with entries grouped per exported item including `asset`, `asset.meta`, and `pathname`.
- Asset Store metadata is typically not embedded in the `.unitypackage` itself; identity is inferred via heuristics and external metadata when available.

### Components
- Editor UI: Menu `Tools/Asset Metadata/...` with commands:
  - `Process Folder...` (choose directory of `.unitypackage`)
  - `Process Files...` (choose multiple files)
  - `Open Logs Folder`
- Batch Runner (headless): Static entry method invoked via Unity `-batchmode -executeMethod`.
- Package Reader:
  - Stream tar.gz, enumerate entries, parse `pathname`, read `*.meta` for GUIDs, collect statistics.
  - Avoid extracting to disk unless `--extract` is explicitly requested for debugging.
- Resolver Pipeline (multi-strategy):
  1) Cache Match: Look for known Unity Asset Store cache metadata on the host and match by hash/filename.
  2) Embedded Hints: Search text files for `assetstore.unity.com` links or `Publisher:` lines.
  3) Name Heuristics: Tokenize filename and top-level folder names for candidate package/publisher strings.
  4) GUID Fingerprint: Use GUID set to query a local mapping registry (if provided).
  5) Online Search (optional, opt-in): Query Asset Store web pages for package title/publisher matches.
- Logging Subsystem:
  - JSONL writer (one JSON object per package) and CSV writer with a stable column set.
  - Run log with timestamps and severity levels.

### Data Model (per package)
- `inputPath`: absolute path to the `.unitypackage`.
- `fileName`, `fileSizeBytes`, `sha256`, `sha1`.
- `assetCount`, `assetExtensions`, `rootFolders`.
- `guidSample` (subset) and `guidCount`.
- `suspectedName`, `suspectedVersion`.
- `publisherName`, `assetStoreUrl`, `assetId` (if known).
- `confidence` (0.0–1.0), `detectionMethods` (ordered list).
- `error` (nullable), `processedAt`, `durationMs`.

### Matching Strategy and Confidence
- Cache Match: 0.95–1.00
- Embedded Link Exact: 0.85–0.95
- GUID Fingerprint Exact: 0.80–0.95 (depends on uniqueness of GUID set)
- Name Heuristic + Publisher: 0.60–0.80
- Name Only: 0.40–0.60
- If multiple candidates tie, choose highest confidence and record `alternates`.

### Dependencies
- Archive handling: `ICSharpCode.SharpZipLib` (tar.gz) or .NET `System.Formats.Tar` when available in target Unity version.
- JSON: `com.unity.nuget.newtonsoft-json` for robust JSONL/CSV serialization.
- Optional HTTP client for online search (disabled by default; comply with robots and rate limits).

### Configuration
- Config file: `ProjectSettings/AssetMetadataExtractor.json` (created on first run) with:
  - `logsFolder`, `onlineLookupEnabled`, `maxParallelism`, `resume`, `cachePaths` overrides.
- CLI flags override config:
  - `-in=/path/to/folder_or_glob` (repeatable)
  - `-outJson=/path/metadata.jsonl`
  - `-outCsv=/path/metadata.csv`
  - `-online=true|false`
  - `-resume=true|false`
  - `-maxParallelism=N`

### BatchMode Usage (example)
`Unity -batchmode -quit -projectPath /abs/UnityProject -executeMethod AssetMetadata.Batch.Process -in=/abs/assets -outJson=/abs/out/metadata.jsonl -outCsv=/abs/out/metadata.csv -online=false -resume=true -maxParallelism=2`

### Asset Store Cache Discovery (host-dependent)
- Linux: `~/.local/share/unity3d/Asset Store-5.x/`
- macOS: `~/Library/Unity/Asset Store-5.x/`
- Windows: `%APPDATA%\Unity\Asset Store-5.x\`
- If found, read adjacent metadata (e.g., JSON descriptors) to map filename/hash to `publisher`, `id`, and URL.

### Error Handling
- Per-file try/catch with structured error record.
- Timeouts for online requests; exponential backoff; total cap per run.
- Partial results written as soon as each file completes to avoid loss on crash.


## Execution Plan

### Phase 1 — Project Setup (0.5–1 day)
- Create Unity 2021.3 LTS project (Editor-only assembly definition for tools).
- Add `SharpZipLib` and `Newtonsoft.Json` dependencies.
- Scaffolding: folders `Assets/Editor/MetadataExtractor`, `Assets/Plugins`, `Assets/Editor/Batch`.

### Phase 2 — Package Reader (1–2 days)
- Implement streamed reading of `.unitypackage` tar.gz.
- Extract `pathname`, gather `*.meta` GUIDs, stats, and hashes.
- Unit tests on synthetic and real samples.

### Phase 3 — Resolver Pipeline (2–3 days)
- Implement cache-based resolver (host cache autodiscovery + configurable paths).
- Implement embedded-hints and name heuristics.
- Implement optional GUID fingerprint resolver (pluggable registry interface).
- Confidence scoring and alternate candidates list.

### Phase 4 — Logging & Formats (0.5–1 day)
- JSONL and CSV writers with stable schemas.
- Run summary and diagnostics log.

### Phase 5 — Editor UI & Batch CLI (0.5–1 day)
- Editor menu, pickers, progress UI, cancel support.
- BatchMode entrypoint and argument parsing.

### Phase 6 — Hardening & QA (1–2 days)
- Large batch tests, parallelism tuning.
- Error cases (corrupt archives, missing metas, I/O errors).
- Finalize docs and sample outputs.


## Deliverables
- Unity project repository containing:
  - `Assets/Editor/MetadataExtractor` with:
    - `UnityPackageReader` (streamed tar.gz reader)
    - `GuidCollector`, `NameHeuristics`, `EmbeddedHintScanner`
    - `ResolverPipeline` with strategies (Cache, Embedded, Name, GUID, Online)
    - `ConfidenceScorer`
    - `CsvWriter`, `JsonlWriter`, `RunLogger`
  - `Assets/Editor/Batch/AssetMetadata.Batch.cs` (BatchMode entrypoint)
  - `Assets/Editor/UI/AssetMetadataMenu.cs` (Editor menus)
  - `Assets/Plugins/ICSharpCode.SharpZipLib.dll` (or UPM alternative) and license
  - `ProjectSettings/AssetMetadataExtractor.json` (generated on first run)
- Documentation:
  - `README.md` with setup, usage, and examples
  - Schema docs for JSONL/CSV outputs
- Example outputs: `samples/metadata.jsonl`, `samples/metadata.csv`, `samples/run.log`
- Test suite:
  - Unit tests for reader and resolver components
  - Integration test for batch run on fixture assets


## Acceptance Criteria
- Given a directory of `.unitypackage` files, a single batch run produces `metadata.jsonl`, `metadata.csv`, and `run.log` with ≥95% of “Asset Store cached” samples matched at confidence ≥0.95.
- For packages without cache metadata, heuristics produce a best-effort match with confidence and method trail recorded; unmatched assets are clearly marked.
- Headless and Editor flows both function on Linux and Windows runners.
- Logs are append-only and resume-safe when `-resume=true`.


## Risks & Mitigations
- Asset Store URL not embedded: mitigate via cache lookup, heuristics, and optional online search.
- Format variation across Unity versions: use robust stream parsing and unit tests.
- Rate limits or site changes (online mode): keep offline by default, configurable, and degrade gracefully.
- Very large archives: stream IO, bound memory, limit parallelism.


## Maintenance & Extensibility
- Strategy pattern for resolvers; additional resolvers can be added without changing core flow.
- External GUID registry interface allows plugging in private datasets later.
- Config-driven behavior with CLI overrides for CI pipelines.
