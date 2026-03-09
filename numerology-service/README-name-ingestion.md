# Name Ingestion Runbook

This module builds a production-grade ingestion pipeline for Turkish name analysis.

## Scope

Sources:
- `bebekismi.com`
- `sfk.istanbul.edu.tr/isimler-ve-anlamlari`
- `alfabetik.net.tr/isimler/isim-anlamlari.html`
- `sertifika.ufuk.edu.tr/isimler-ve-anlamlari`

Pipeline stages:
1. Discovery
2. Raw fetch (`raw_name_source_entries`)
3. Source-aware parse (`parsed_name_candidates`)
4. Normalize + quality + duplicate/mismatch flags
5. Merge queue (`name_merge_queue`) for manual review
6. Audit trail (`name_merge_audit_logs`) for every review action
7. Final write to `names` only after `APPROVED` or `MERGED`
8. Canonical + alias binding (`name_aliases`) for spelling/transliteration variants
9. Run tracking + health (`name_ingestion_runs`, `name_source_controls`) for operations

## Canonical and Alias Model

### Domain Definitions

- Canonical name: The approved product identity in `names` (`id`, `normalized_name`) used as source-of-truth for downstream APIs.
- Alias: A normalized alternative spelling linked to one canonical (`name_aliases.canonical_name_id`).
- Variant: Spelling or formatting differences of the same lexical name (for example `Mehmet/Mehmed`).
- Related form: Linguistically related but less certain variant; never auto-merged unless manually confirmed.
- Compound name: Multi-token names (`Elif Nur`) and compact variants (`Elifnur`) handled with explicit `COMPOUND_VARIANT` aliases.

### Alias Types

- `SPELLING_VARIANT`
- `TRANSLITERATION`
- `SHORT_FORM`
- `COMPOUND_VARIANT`
- `RELATED_FORM`

### Grouping Rules

- Auto-group: `EXACT`, `STRONG_ALIAS`
- Manual-review only: `WEAK_ALIAS`, `NO_MATCH`
- Weak matches (example `Nur` vs `Nuur`) are never auto-grouped.
- Compound and compact forms are matched only when a strong alias exists.

## Configuration

Main config is under `name-ingestion` in:
- `src/main/resources/application.yml`

Important keys:
- `name-ingestion.enabled`
- `name-ingestion.schedule-cron`
- `name-ingestion.respect-robots-txt`
- `name-ingestion.lock-stale-seconds`
- `name-ingestion.lock-heartbeat-interval-seconds`
- `name-ingestion.http.*`
- `name-ingestion.sources.<source>.enabled`
- `name-ingestion.sources.<source>.rate-limit-ms`

## Admin Endpoints

- `GET /admin/name-sources/raw`
- `GET /admin/name-sources/parsed`
- `GET /admin/name-sources/merge-queue`
- `GET /admin/name-sources/merge-queue/grouped`
- `GET /admin/name-sources/health`
- `GET /admin/name-sources/health/{sourceName}`
- `GET /admin/name-sources/runs`
- `GET /admin/name-sources/runs/{id}`
- `GET /admin/names`
- `GET /admin/names/{id}`
- `GET /admin/names/search`
- `PUT /admin/names/{id}`
- `GET /admin/names/{id}/tags`
- `POST /admin/names/{id}/tags`
- `DELETE /admin/names/{id}/tags/{tagId}`
- `GET /admin/names/{id}/aliases`
- `POST /admin/names/{id}/aliases`
- `DELETE /admin/names/{id}/aliases/{aliasId}`
- `GET /admin/name-enrichment/runs`
- `POST /admin/name-enrichment/run`
- `POST /admin/name-enrichment/recompute/{nameId}`
- `GET /admin/name-enrichment/tags/{nameId}`
- `GET /admin/name-enrichment/taxonomy`
- `POST /admin/name-sources/{sourceName}/enable`
- `POST /admin/name-sources/{sourceName}/disable`
- `POST /admin/name-sources/merge-queue/{id}/approve`
- `POST /admin/name-sources/merge-queue/{id}/reject`
- `POST /admin/name-sources/merge-queue/{id}/merge`
- `POST /admin/name-sources/merge-queue/{id}/skip`
- `POST /admin/name-sources/merge-queue/{id}/note`
- `POST /admin/name-sources/merge-queue/bulk/approve`
- `POST /admin/name-sources/merge-queue/bulk/reject`
- `POST /admin/name-sources/merge-queue/auto-merge`
- `GET /admin/name-sources/canonical/{canonicalId}`
- `GET /admin/name-sources/canonical/{canonicalId}/aliases`
- `POST /admin/name-sources/canonical/{canonicalId}/aliases`
- `DELETE /admin/name-sources/aliases/{aliasId}`
- `GET /admin/name-sources/canonical/resolve?name=...`
- `POST /admin/name-sources/canonical/backfill`
- `POST /admin/name-sources/run?source=...`
- `POST /admin/name-sources/run` (manual trigger with safe reject payload when locked/disabled)
- `POST /admin/name-sources/reparse/{rawId}`

`source` accepts: `bebekismi`, `sfk_istanbul_edu`, `alfabetik`, `ufuk`.

### Grouped Queue Filters

`GET /admin/name-sources/merge-queue/grouped` supports:
- `sourceName`
- `reviewStatus` (single or comma-separated)
- `mismatchFlag`
- `duplicateContentFlag`
- `contentQuality`
- `canonicalName`
- `conflict`
- `includeResolved`
- `page`, `size`

Default behavior (when `reviewStatus` is omitted): only active queue states (`PENDING`, `IN_REVIEW`).

### Canonical Names List Filters

`GET /admin/names` and `GET /admin/names/search` support:
- `q`
- `status` (`ACTIVE`, `PENDING_REVIEW`, `HIDDEN`, `REJECTED`)
- `gender` (`MALE`, `FEMALE`, `UNISEX`, `UNKNOWN`)
- `origin`
- `hasTags`
- `hasAliases`
- `page`, `size`

Default behavior: when `status` is omitted, only `ACTIVE` canonical rows are returned.

### Name Management Rules

- `normalized_name` is regenerated on each `PUT /admin/names/{id}` call.
- Invalid status transitions are rejected:
  - `PENDING_REVIEW -> PENDING_REVIEW|ACTIVE|HIDDEN|REJECTED`
  - `ACTIVE -> ACTIVE|HIDDEN|REJECTED`
  - `HIDDEN -> HIDDEN|ACTIVE`
  - `REJECTED -> REJECTED|HIDDEN`
- Manual tag duplicates (`name_id + normalized_tag`) are blocked.
- Alias add/delete uses canonical-aware validation and refreshes affected review queues.
- Every update/status/tag/alias mutation writes `name_admin_audit_logs`.

### Deterministic Tag Taxonomy & Enrichment

Supported taxonomy groups:
- `STYLE`: `modern`, `classic`, `timeless`, `minimalist`
- `VIBE`: `strong`, `soft`, `elegant`, `charismatic`, `spiritual`
- `THEME`: `light`, `moon`, `water`, `power`, `love`, `wisdom`, `nature`
- `CULTURE`: `turkish`, `arabic`, `persian`, `mixed_usage`
- `RELIGION`: `islamic`, `quranic`, `neutral`
- `USAGE`: `popular`, `balanced`, `niche`

Rule engine notes:
- `origin` drives `CULTURE`
- `quran_flag` drives `RELIGION`
- meaning/traits/letter texts drive `THEME`, `VIBE`, `STYLE`
- alias/candidate count drives `USAGE`

Safety and determinism:
- enrichment only runs for `ACTIVE` and `HIDDEN` names
- manual tags are preserved; only existing `RULE` tags are replaced on recompute
- low-confidence rule outputs are skipped
- each generated tag stores `source`, `confidence`, `evidence`, `enrichment_version`
- taxonomy-invalid values are rejected both in service layer and DB constraint layer

Run tracking:
- every enrichment execution writes to `name_enrichment_runs`
- statuses: `RUNNING`, `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`
- counters: processed/updated/skipped/low-confidence/error

### Review State Transitions

States:
- `PENDING`
- `IN_REVIEW`
- `SKIPPED`
- `APPROVED`
- `REJECTED`
- `MERGED`

Rules:
- `APPROVED`, `REJECTED`, `MERGED` are terminal.
- Terminal records are not returned in active queue default listing.
- `APPROVED` writes/updates a single canonical row in `names`.
- `MERGED` writes/updates a single canonical row in `names` using field-level selections.
- `AUTO_MERGE` action finalizes queue as `MERGED` only when recommendation is `AUTO_MERGE_ELIGIBLE`.
- Every action writes an immutable record to `name_merge_audit_logs`.
- Queue artık tek source candidate'ları da `PENDING` olarak içerir (conflict olmasa bile), böylece manuel approve ile `names` tablosu doldurulabilir.

### Field Resolution Policy

Field selection is deterministic and explainable:
- `quran_flag`: UFUK precedence. If UFUK provides non-null value, other sources cannot override.
- text fields (`meaning_short`, `meaning_long`, `origin`, `character_traits_text`, `letter_analysis_text`):
  - preferred by adjusted `source_confidence`
  - source-specific boosts are applied (for example `SFK_ISTANBUL_EDU`/`UFUK` for long text fields)
  - blank/low-utility values are skipped
- selection reason and score are written to merge audit payload (`selected_field_sources` JSON).

### UFUK-Specific Data Cleanup

UFUK parser/normalizer applies a dedicated cleanup for noisy long-meaning prefixes:
- removes patterns like `X İsminin Anlamı Nedir?`
- removes duplicated leading name token (`X, ...`)
- keeps the remaining semantic sentence intact

Example:
- raw: `Fuat İsminin Anlamı Nedir?,Fuat, Arapça kökenli, anlamı "kalp" olan erkek ismidir.`
- normalized: `Arapça kökenli, anlamı "kalp" olan erkek ismidir.`

### Merge Recommendation Model

Each grouped queue row stores recommendation metadata:
- `mergeRecommendationStatus`:
  - `AUTO_MERGE_ELIGIBLE`
  - `MERGE_SUGGESTED`
  - `MANUAL_REVIEW_REQUIRED`
- `recommendedCanonicalNameId`, `recommendedCanonicalName`
- `recommendedFieldSources`
- `autoMergeEligible`
- `autoMergeReasonSummary`
- `mergeConfidence`

Safety rules:
- `WEAK_ALIAS` is never auto-merge eligible.
- high-risk unresolved conflicts (`gender`, `origin`, `quran_flag`) block auto-merge.
- UFUK `quran_flag` precedence is enforced before eligibility decision.

### Existing Data Backfill

Eski parsed kayıtlar için queue yeniden üretmek gerektiğinde:

```bash
curl -X POST http://localhost:8085/admin/name-sources/canonical/backfill
```

Bu çağrı alias/canonical çözümlemesini yeniden uygular ve ilgili canonical key'ler için merge queue satırlarını refresh eder.

## Scheduling

Scheduler class:
- `com.mysticai.numerology.ingestion.service.NameIngestionScheduler`

Runs cron from `name-ingestion.schedule-cron`.

Scheduler behaviour:
- Global switch: `name-ingestion.enabled`
- Source-level switch: `name_source_controls.enabled` override
- Disabled sources are skipped in scheduled ingestion runs
- Manual single-source run on disabled source is tracked as failed with `error_summary=source disabled`

## Observability

### Run Tracking

Each run is persisted in `name_ingestion_runs` with:
- trigger type (`SCHEDULED`, `MANUAL`)
- status (`RUNNING`, `SUCCESS`, `PARTIAL_SUCCESS`, `FAILED`)
- discovery/fetch/parse metrics
- quality counters (mismatch, duplicate, low-quality)
- backlog snapshot
- canonical resolution count
- optional error summary

### Distributed Locking and Concurrency

Source-level distributed locking is persisted in `name_ingestion_job_locks`.

Lock guarantees:
- Same source cannot run concurrently (`SCHEDULED` vs `MANUAL` collision prevented)
- Multi-instance duplicate runs are blocked via DB row-level lock (`SELECT ... FOR UPDATE` path)
- Lock lifecycle is explicit: `RUNNING`, `RELEASED`, `FAILED`, `STALE`
- Every lock has `owner_instance_id`, `trigger_type`, `job_run_id`, heartbeat timestamps

Execution safety:
- Scheduler skips locked sources and continues other sources
- Manual trigger returns safe rejection payload (`already running`, `stale lock`, `source disabled`)
- Lock release is executed in `finally` path to reduce orphan risk
- Heartbeat is periodically refreshed during fetch/parse loop

### Source Health

`GET /admin/name-sources/health` returns per-source operational summary:
- last run / success / failure times
- last run counters
- recent-window aggregate rates and counts
- current backlog snapshot
- anomaly flags (`hasAnomaly`, `anomalyTypes`, `anomalyReasonSummary`)

`GET /admin/name-sources/health/{source}` returns summary + recent run trend list.

### Job Lock Endpoints

- `GET /admin/name-sources/jobs/running`
- `GET /admin/name-sources/jobs/locks`
- `GET /admin/name-sources/jobs/locks/{sourceName}`
- `POST /admin/name-sources/jobs/recover-stale/{sourceName}`

Recovery safety:
- Active `RUNNING` locks are not recoverable
- Recovery succeeds only if heartbeat exceeds stale threshold
- Recovery marks lock as `STALE` without forcing active process termination

### Metrics (Micrometer / Prometheus)

Exposed via actuator:
- `/actuator/metrics`
- `/actuator/prometheus`

Published metrics:
- `ingestion_discovered_total`
- `ingestion_fetched_total`
- `ingestion_parse_success_total`
- `ingestion_parse_failure_total`
- `ingestion_conflict_total`
- `ingestion_mismatch_total`
- `ingestion_duplicate_total`
- `ingestion_low_quality_total`
- `ingestion_review_backlog_total` (gauge snapshot)
- `ingestion_run_duration_ms`
- `ingestion_source_enabled` (gauge)

All carry `source` tag; duration also carries `status` tag.

### Anomaly Heuristics

Current anomaly signals:
- parse failure spike
- parse success-rate drop
- mismatch ratio spike
- duplicate ratio spike
- low-quality ratio spike
- discovery/fetch sudden drop
- origin/meaning fill-rate drop

These are derived from latest run vs previous runs per source and are meant for operator triage.

## Operational Notes

- Raw writes are idempotent via unique key: `(source_name, source_url, checksum)`.
- Pipeline is partial-success by design: per-URL failures do not stop full source run.
- Robots awareness is enforced by `RobotsTxtPolicyService`.
- User-Agent, timeout, retry and rate-limit are centrally configured.
- Queue refresh does not reopen terminal records unless candidate/conflict payload changes.
- `name_merge_queue.has_conflict` is materialized for fast conflict filtering.
- Candidate filter performance is optimized with normalized-name composite indexes.
- Queue grouping key is `parsed_name_candidates.canonical_normalized_name` (not raw normalized name).
- Manual alias add/remove triggers candidate remap and queue refresh for affected canonical keys.
- `canonical_name_id` on candidates is set only for deterministic strong/exact matches.

## Existing Data Backfill

After deploying `V3__Canonical_Alias_Model.sql`, run:

```bash
curl -X POST http://localhost:8086/admin/name-sources/canonical/backfill
```

Backfill actions:
- Scans active canonical names from `names`
- Generates deterministic alias drafts (transliteration, compound, known spelling variants)
- Re-resolves existing parsed candidates to canonical/alias levels
- Refreshes affected merge queue groups

## Selector Maintenance Notes

Potential break points by source:

1. `bebekismi.com`
- Discovery relies on embedded JSON-like payload in list pages (`"name":"..."`).
- Detail parse relies on title/h1 and section headings (`İsim Anlamı`, `Karakter Özeti`, `Harf Analizi`).

2. `sfk.istanbul.edu.tr`
- Discovery relies on slug pattern `-isminin-anlami-nedir-kokeni-ve-ozellikleri`.
- Parse relies on article heading hierarchy (`h1`, `h2`) and paragraph flow.

3. `alfabetik.net.tr`
- Source is list-based; no stable per-name detail pages.
- Synthetic detail URLs are generated from list item entries.
- Parse depends on list item format: `Name (Gender): Meaning`.

4. `sertifika.ufuk.edu.tr`
- Discovery relies on slug pattern `-isminin-anlami-nedir-blog`.
- Parse relies on `.prose` content and inline labels (`Kökeni:`, `Cinsiyet:`).

Alias/canonical maintenance notes:
- `TRANSLITERATION` and `SPELLING_VARIANT` heuristics live in `NameAliasService`.
- If false positives are observed, downgrade the heuristic to weak-match only (no auto-group).
- Prefer manual alias creation for ambiguous forms instead of broad automatic rules.

## Local Verification

Run only numerology module tests:

```bash
mvn -pl numerology-service test
```

Run service:

```bash
mvn -pl numerology-service spring-boot:run
```
