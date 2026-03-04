# Daily/Home Prod Readiness

## Scope
- Home dashboard + Daily Transits + Today Actions
- Mobile integration against stage/prod backend
- No runtime dependency on hardcoded daily/mock content

## Environment Setup

Single source: `src/config/env.ts`

Required variables:

```bash
EXPO_PUBLIC_APP_ENV=dev|stage|prod
EXPO_PUBLIC_API_BASE_URL_DEV=https://dev-api.example.com
EXPO_PUBLIC_API_BASE_URL_STAGE=https://stage-api.example.com
EXPO_PUBLIC_API_BASE_URL_PROD=https://api.example.com
```

Optional variables:

```bash
# Backward-compatible fallback if env-specific URLs are omitted
EXPO_PUBLIC_API_BASE_URL=

# Dev-only mock switch (ignored in release/prod)
EXPO_PUBLIC_USE_MOCK=false
```

## Mock Policy
- Default behavior: mock is OFF.
- Mock is only allowed when all conditions are true:
  - `__DEV__ === true`
  - `EXPO_PUBLIC_APP_ENV !== "prod"`
  - `EXPO_PUBLIC_USE_MOCK === "true"`
- In release/prod builds, mock cannot be enabled even if a flag is set.

## API Contract Requirements
- Base URL must be configured for the active environment.
- Required request header: `X-User-Id`.
  - Populated from auth user (`user.id`), fallback `username`, fallback `guest`.
- If API config is missing:
  - App does not crash.
  - Request is blocked with `Service not configured` log entry.
  - UI receives empty-state payloads for daily/home surfaces.

## Data Source Rules
- Home and Daily screens must render backend-driven daily content.
- Removed hardcoded daily fallback narratives (theme/advice/transit text).
- Weekly range:
  - Uses backend `weekStart/weekEnd` when available.
  - Falls back to client-computed current week range (not static literal).
- Oracle status:
  - Shown only when an actual signal is available.
  - Hidden when signal is missing.

## Offline Cache Behavior
- Cache keys:
  - `dailyTransits:{YYYY-MM-DD}`
  - `dailyActions:{YYYY-MM-DD}`
- Strategy:
  - Cache only last successful fetch payload.
  - Envelope includes `savedAt` and `expiresAt`.
  - TTL: 24 hours.
  - Expired cache is removed automatically.
- Offline behavior:
  - Cached payload exists -> render cached data.
  - No cache -> render empty state (no crash).

## Observability
- Non-PII API error logging via `src/services/observability.ts`:
  - status, method, path, timeout/network flags
  - no request body logging
- Analytics events include success/fail and surface/destination context:
  - `daily_transits_viewed`
  - `daily_transits_load` (fail)
  - `daily_transits_retry_tapped`
  - `transit_detail_opened`
  - `daily_actions_load` (fail)
  - `daily_actions_retry_tapped`
  - `action_done_toggled` (success/fail)
  - `feedback_sent` (success/fail)

## Acceptance Mapping
- Prod build cannot enable mock: enforced by `env.ts`.
- Stage backend end-to-end:
  - `GET /api/v1/daily/transits`
  - `GET /api/v1/daily/transits/actions`
  - `POST /api/v1/daily/transits/actions/{actionId}/done`
  - `POST /api/v1/feedback`
- Offline mode:
  - Cached -> shown
  - Missing cache -> empty state
- Hardcoded daily content:
  - Removed from home + daily data pipelines.
