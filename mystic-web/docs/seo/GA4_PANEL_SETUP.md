# GA4 Panel Setup Guide

## 1. Create GA4 Property

1. Go to analytics.google.com → Admin → Create Property
2. Select "Web" as platform
3. Enter site URL: `https://astroguru.app`
4. Enable "Enhanced Measurement" (page views, scrolls, outbound clicks, file downloads)

## 2. Get Measurement ID

1. Admin → Data Streams → Web stream → copy `G-XXXXXXXXXX`
2. Add to environment: `NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX`
3. Enable analytics: `NEXT_PUBLIC_ENABLE_ANALYTICS=true`

## 3. Enable DebugView

1. Install **Google Analytics Debugger** Chrome extension
2. Navigate to site with extension enabled
3. GA4 panel → Reports → DebugView — events appear in real time

## 4. Mark Key Events (Conversions)

Go to Admin → Events → toggle "Mark as key event":

| Event | Reason |
|---|---|
| `astro_token_reward_granted` | Core monetization signal |
| `store_click` | Download intent |
| `cta_click` | Engagement intent |

**Do not mark `rewarded_video_complete` as a key event** — use `astro_token_reward_granted` instead (backend-confirmed).

## 5. Custom Dimensions and Metrics

Go to Admin → Custom Definitions → Create custom dimensions/metrics:

### Custom Dimensions (Event scope)

| Display Name | Parameter | Description |
|---|---|---|
| Reward Source | `reward_source` | admob / house_ads / partner |
| Reward Placement | `reward_placement` | earn_page / feature_gate / popup |
| Token Name | `token_name` | astro_token |
| Failure Reason | `failure_reason` | no_fill / timeout / etc |
| Locale | `locale` | tr / en |
| Page Type | `page_type` | home / blog / feature / etc |
| Content Group | `content_group` | astrology / numerology / etc |
| Translation Group | `translation_group` | Shared content across locales |

### Custom Metrics (Event scope)

| Display Name | Parameter | Unit |
|---|---|---|
| Token Amount | `token_amount` | Standard (integer) |

## 6. Rewarded Video Funnel Report

Create a custom funnel exploration in GA4:
1. Explore → Funnel Exploration
2. Steps:
   - Step 1: `rewarded_video_click`
   - Step 2: `rewarded_video_start`
   - Step 3: `rewarded_video_complete`
   - Step 4: `astro_token_reward_granted`
3. Apply dimension: `reward_placement`

## 7. Measurement Protocol `api_secret`

If you need server-to-server event sending (e.g., backend fires `astro_token_reward_granted` directly):
1. Admin → Data Streams → Measurement Protocol API Secrets → Create
2. **CRITICAL: Never expose this secret to the frontend or commit it to git.**
3. Store as `GA_MEASUREMENT_PROTOCOL_SECRET` server-side only.

## 8. Audiences to Create

| Audience | Definition |
|---|---|
| Token Earners | `astro_token_reward_granted` occurred |
| Store Intent | `store_click` occurred |
| TR Readers | `locale` = `tr` |
| EN Readers | `locale` = `en` |
| Reward Failures | `astro_token_reward_failed` occurred |
