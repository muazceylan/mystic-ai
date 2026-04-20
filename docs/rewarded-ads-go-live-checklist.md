# Rewarded Ads Go-Live Checklist (V2 — Hardened)

## Pre-launch (Infrastructure)

- [ ] DB migrations applied in order: `V001__reward_intent.sql` → `V002__rewarded_ads_hardening.sql`
- [ ] `JPA_DDL_AUTO=validate` confirmed in production environment (never `update`)
- [ ] `guru_wallet` and `guru_ledger` tables exist (created by existing monetization migrations)
- [ ] `INTERNAL_GATEWAY_KEY` set to a strong random value in production
- [ ] RabbitMQ connection healthy (`/actuator/health` shows `rabbitmq: UP`)
- [ ] Redis available (wallet/session caching)

## Pre-launch (Auth & Security)

- [ ] `JWT_SECRET` env var set to the same BASE64 secret used by `auth-service` and `api-gateway`
- [ ] `ADMIN_JWT_SECRET` set to a strong random value (min 32 chars)
- [ ] `UserJwtFilter` active for `/api/v1/monetization/rewarded-ads/**`
- [ ] `AdminSecurityConfig` filter chain verified: AdminJwtFilter → UserJwtFilter → UsernamePasswordAuthenticationFilter
- [ ] `X-User-Id` header is NOT trusted for rewarded-ads auth — verify in staging with a tampered request

## Pre-launch (Rewarded Ads Config)

- [ ] `REWARDED_ADS_ENABLED=true`
- [ ] `REWARDED_ADS_DEFAULT_AMOUNT` set (default: 5 Guru Tokens)
- [ ] `REWARDED_ADS_AD_UNIT_PATH` set to production GAM ad unit path
- [ ] `REWARDED_ADS_DAILY_LIMIT` confirmed with product team (default: 10)
- [ ] `REWARDED_ADS_HOURLY_LIMIT` confirmed (default: 3)
- [ ] `REWARDED_ADS_COOLDOWN_SECONDS` confirmed (default: 60)
- [ ] `REWARDED_ADS_INTENT_TTL_SECONDS` confirmed (default: 300)
- [ ] `REWARDED_ADS_ALLOWED_ORIGINS` set to production domain(s) (e.g., `https://mysticai.com,https://www.mysticai.com`)
- [ ] `REWARDED_ADS_ENFORCE_ORIGIN=true` in production

## Pre-launch (Frontend — mystic-admin)

- [ ] `NEXT_PUBLIC_GAM_NETWORK_CODE` set
- [ ] `NEXT_PUBLIC_GAM_REWARDED_AD_UNIT_PATH` set
- [ ] `NEXT_PUBLIC_GAM_REWARDED_PLACEMENT_KEY` set
- [ ] `NEXT_PUBLIC_REWARDED_ADS_ENABLED=true`
- [ ] GPT script loads from `https://securepubads.g.doubleclick.net/tag/js/gpt.js` (no ad-blocker interference in prod)
- [ ] Earn page (`/earn`) accessible and not indexed (`robots: noindex` confirmed)

## Pre-launch (GAM Configuration)

- [ ] GAM account linked and ad unit created with out-of-page rewarded format
- [ ] Test ad serving confirmed in GAM UI
- [ ] Rewarded ad line items / creatives active

## Smoke Tests (Staging)

- [ ] Create intent → `201 Created` with correct `rewardAmount` from server config
- [ ] Claim → `200 OK`, `idempotentReplay: false`, wallet balance +N
- [ ] Same claim repeated → `200 OK`, `idempotentReplay: true`, balance unchanged
- [ ] Different fingerprint on claimed intent → `409 SESSION_CONFLICT`
- [ ] Tampered `X-User-Id` header → request uses JWT userId, not header
- [ ] No mark-ready → claim still succeeds
- [ ] Expired intent → `409 INTENT_EXPIRED`
- [ ] Daily cap → `429 DAILY_CAP_REACHED`
- [ ] DB: `claim_fingerprint` stored after first claim
- [ ] DB: `guru_ledger.reward_intent_id` FK populated

## Post-launch Monitoring

- [ ] Monitor `[REWARD] Claim successful` log volume
- [ ] Alert on `[REWARD] SESSION_CONFLICT` rate > threshold
- [ ] Alert on `[REWARD] Expired` > threshold (intent TTL too short?)
- [ ] Monitor Guru Token wallet balance growth (anomaly detection)
- [ ] Monitor `[REWARD] auditOnClaim` warnings (high claim attempts)
- [ ] Monitor cleanup scheduler: `[REWARD] Expired N stale reward intents` in logs
- [ ] Track `rewarded_ad_claim_success` analytics events in GA4 / Amplitude

## Rollback Plan

1. Set `REWARDED_ADS_ENABLED=false` → immediate kill switch (no restart needed)
2. `GET /wallet-summary` returns `rewardedAdsEnabled: false`; frontend CTA disabled
3. Frontend earn page degrades gracefully (shows "coming soon" or hides CTA)
4. No data migration needed on rollback — all tables are additive

## Notes

- Guru Tokens have **no monetary value** and are **not regulatory currency**.
- Reward amount is set server-side only; frontend cannot influence it.
- `X-User-Id` is NOT a public authentication mechanism for this service.
- SQL migrations V001+V002 are standalone scripts — apply them manually or via Flyway before deploying.
