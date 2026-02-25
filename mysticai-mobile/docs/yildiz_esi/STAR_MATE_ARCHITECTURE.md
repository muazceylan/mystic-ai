# Yildiz Esi (Star Mate) - Module Architecture (MVP + Backend Blueprint)

## What Is Implemented In This PR (Mobile MVP)

- New main bottom tab: `star-mate`
- Discovery deck UI with swipe mechanics (drag + action buttons)
- Cosmic badge (Sun sign + synastry compatibility score)
- Mini Synastry report half-modal (`i` button)
- Discovery settings (distance, age, show me, min compatibility, elemental preference)
- Profile edit + preview (3x3 grid, bio, tags, auto-cosmic tags, details)
- Matches dashboard (Likes You / New Matches / Chat modal + AI icebreaker)
- Haptics on key actions and match celebration
- Local `zustand` state + mock seed data for end-to-end interaction

## Backend Entities (Recommended)

### `star_mate_profiles`

Purpose: Stores dating/discovery persona, media and discovery preferences separate from core user auth profile.

Suggested columns:

- `id` (UUID, PK)
- `user_id` (FK -> users.id, unique)
- `bio` (TEXT)
- `photos_json` (JSONB) // ordered list of photo URLs/keys
- `tags_json` (JSONB) // selected interests
- `details_json` (JSONB) // height, exercise, smoking, drinking, education etc.
- `discovery_preferences_json` (JSONB)
- `discovery_enabled` (BOOLEAN)
- `latitude` / `longitude` (nullable, privacy-gated)
- `location_geohash` (nullable, indexed)
- `created_at`, `updated_at`

Indexes:

- `idx_star_mate_profiles_user_id`
- `idx_star_mate_profiles_discovery_enabled`
- `idx_star_mate_profiles_geohash`

### `star_mate_matches`

Purpose: Records unilateral actions and mutual matches between two users.

Suggested columns:

- `id` (UUID, PK)
- `actor_user_id` (FK -> users.id)
- `target_user_id` (FK -> users.id)
- `actor_action` (`LIKE|NOPE|SUPERLIKE`)
- `target_action` (`LIKE|NOPE|SUPERLIKE|null`)
- `matched` (BOOLEAN)
- `synastry_score_snapshot` (INT)
- `synastry_summary_snapshot` (TEXT)
- `matched_at` (nullable timestamp)
- `created_at`, `updated_at`

Constraints / indexes:

- Unique pair index (normalized user pair) to avoid duplicates
- `idx_star_mate_matches_actor_user`
- `idx_star_mate_matches_target_user`
- `idx_star_mate_matches_matched`

## Synastry Queue Flow (Core Heart of the Module)

### Trigger moments

- App opens `Yildiz Esi`
- Filters change (distance, age, show me, min score, elemental preference)
- Queue depth falls below threshold (e.g., `< 20` candidates)

### Pipeline

1. Candidate pre-filter (geo, age, show-me, discovery-enabled)
2. Fetch cached natal chart metadata for viewer + candidates
3. Compute / refresh synastry score asynchronously
4. Persist lightweight feed cache (viewer-user scoped)
5. Return only `precalculatedOnly=true` candidates to UI feed

### Recommended infra pattern

- Queue message: `StarMateSynastryQueueJob`
- Worker service: can live in `astrology-service` or dedicated matching worker
- Cache: Redis sorted set / list keyed by `viewerUserId`
- TTL strategy: short-lived queue cache (e.g., 5-15 min), invalidated on filter change

## API Contract (Suggested)

### `POST /api/v1/star-mate/feed`

Request:

- `userId`
- `filters`
- `cursor`
- `limit`
- `precalculatedOnly`

Response:

- `items[]` (with `compatibilityScore`, `miniSynastryReport`, profile card payload)
- `nextCursor`
- `queueStatus` (`READY|WARMING|EMPTY`)

### `POST /api/v1/star-mate/actions`

Used for `LIKE`, `NOPE`, `SUPERLIKE`.

Response should include:

- whether a mutual match happened
- `matchId` if matched
- whether super-like push notification was emitted

### `GET/PUT /api/v1/star-mate/profile`

- CRUD for `StarMateProfile`
- Server validates prohibited content and contact info policy (optional moderation hook)

### `PUT /api/v1/star-mate/filters`

- Persists discovery preferences and `discoveryEnabled`
- If `discoveryEnabled=false`, user must immediately be excluded from new feeds

## Privacy / Security

- Do not expose exact user coordinates to clients; store rounded geo buckets or distance only
- `discoveryEnabled=false` should short-circuit feed eligibility server-side
- Rate-limit action endpoints (like/superlike spam)
- Audit log super-like notification delivery

## Performance Notes

- Precompute synastry snapshots (score + short reasons) for feed; full report can be lazy-loaded
- Return optimized image variants / CDN thumbnails
- Paginate feed and prefetch next page in background
- Cache “likes you” thumbnails separately (premium blur/unblur handled by entitlement)

## Integration Notes For Current Repo

- Mobile contracts/types live in `mysticai-mobile/src/services/starMate.service.ts`
- Local state prototype lives in `mysticai-mobile/src/store/useStarMateStore.ts`
- UI entry screen lives in `mysticai-mobile/src/app/(tabs)/star-mate.tsx`

