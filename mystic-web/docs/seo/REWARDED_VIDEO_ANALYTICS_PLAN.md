# Rewarded Video → Astro Token Analytics Plan

## Funnel Overview

```
User sees reward CTA
       ↓
rewarded_video_click     (frontend — user taps "Watch to earn")
       ↓
rewarded_video_start     (frontend — ad SDK confirms video loaded & started)
       ↓
rewarded_video_complete  (frontend — ad SDK fires reward callback)
       ↓
[backend validates reward]
       ↓
astro_token_reward_granted   ← KEY EVENT (backend-confirmed)
OR
astro_token_reward_failed    ← (backend rejected or provider failed)
```

## Event Definitions

### `rewarded_video_click`
- **Origin:** Frontend
- **When:** User taps the "Watch to earn tokens" CTA
- **Required params:** `reward_source`, `reward_placement`, `token_name`, `locale`, `page_type`

### `rewarded_video_start`
- **Origin:** Frontend (ad SDK callback)
- **When:** Ad SDK confirms video loaded and playback started
- **Required params:** same as click

### `rewarded_video_complete`
- **Origin:** Frontend (ad SDK reward callback)
- **When:** User watched the full video; ad SDK fires reward callback
- **Note:** This is a *necessary* but *not sufficient* condition for reward. Backend must still validate.

### `astro_token_reward_granted` ← **GA4 Key Event**
- **Origin:** Backend-confirmed (frontend fires after backend 200 OK)
- **When:** Backend confirms reward, wallet credited
- **Required params:** `reward_source`, `reward_placement`, `token_name`, `token_amount`, `success: true`
- **GA4 action:** Mark as key event in GA4 panel

### `astro_token_reward_failed`
- **Origin:** Frontend or backend
- **When:** Any failure in the funnel
- **Required params:** `reward_source`, `reward_placement`, `token_name`, `failure_reason`, `success: false`
- **failure_reason values:** `no_fill` | `timeout` | `validation_failed` | `reward_not_granted`

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `reward_source` | `admob` \| `house_ads` \| `partner` | Ad provider |
| `reward_placement` | `earn_page` \| `feature_gate` \| `popup` | Where in UI |
| `token_name` | string | e.g. `astro_token` |
| `token_amount` | number | Tokens granted |
| `locale` | string | `tr` \| `en` |
| `page_type` | string | Route context |
| `success` | boolean | Outcome |
| `failure_reason` | string | Failure code |
| `content_group` | string | Feature group |

## Security Rules

- **Never fire `astro_token_reward_granted` on `rewarded_video_complete` alone.** Always wait for backend confirmation.
- **Never send PII** (email, user ID in plain form, birth data).
- **Never send raw user content** in analytics params.
- The `api_secret` for Measurement Protocol must **never** be exposed to the frontend.

## GA4 Key Event Setup

In GA4 panel → Admin → Events → mark `astro_token_reward_granted` as a Key Event (conversion).

## Custom Dimensions / Metrics

Recommend defining in GA4 panel → Admin → Custom Definitions:

| Name | Scope | Type |
|---|---|---|
| `reward_source` | Event | Dimension |
| `reward_placement` | Event | Dimension |
| `token_name` | Event | Dimension |
| `failure_reason` | Event | Dimension |
| `locale` | Event | Dimension |
| `page_type` | Event | Dimension |
| `token_amount` | Event | **Metric** |

## Frontend Implementation

All typed helpers are in `src/lib/analytics.ts`:

```ts
import {
  trackRewardedVideoClick,
  trackRewardedVideoStart,
  trackRewardedVideoComplete,
  trackAstroTokenRewardGranted,
  trackAstroTokenRewardFailed,
} from '@/lib/analytics';
```

## Backend Integration Pattern

```
1. Frontend: rewarded_video_complete fires (ad SDK callback)
2. Frontend: POST /api/v1/rewards/grant { source, placement, token_name }
3. Backend: validates (user eligibility, dedup, provider receipt if available)
4. Backend: credits wallet → returns { granted: true, amount: 5 }
5. Frontend: trackAstroTokenRewardGranted({ ..., token_amount: 5 })
   OR
   Backend: returns 400/409 → Frontend: trackAstroTokenRewardFailed({ failure_reason: 'validation_failed' })
```
