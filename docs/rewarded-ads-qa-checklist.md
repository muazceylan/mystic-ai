# Rewarded Ads QA Test Checklist (V2 — Hardened)

> For each scenario: verify HTTP status, response body, DB state, and wallet balance.

---

## Pre-conditions

- `rewarded-ads.enabled: true`
- Valid user JWT with `userId` claim
- GPT test network code configured (or integration test mocks)
- DB migrations V001 + V002 applied

---

## 1. Authentication

| # | Test | Expected |
|---|------|----------|
| 1.1 | Request without Authorization header | `401 Unauthorized` |
| 1.2 | Request with expired JWT | `401 Unauthorized` |
| 1.3 | Request with invalid signature JWT | `401 Unauthorized` |
| 1.4 | Request with valid JWT → userId extracted from token | `201 Created` intent |
| 1.5 | Request with valid JWT but tampered `X-User-Id` header | Header ignored; userId from JWT used |

---

## 2. Create Intent

| # | Test | Expected |
|---|------|----------|
| 2.1 | First intent of the day | `201`, new intent with `status=PENDING` |
| 2.2 | Second intent while first is still active | `409`, `TOO_MANY_ACTIVE_INTENTS` |
| 2.3 | At daily limit (10 claims today) | `409`, `DAILY_CAP_REACHED` |
| 2.4 | At hourly limit (3 claims in last hour) | `429`, `HOURLY_CAP_REACHED` |
| 2.5 | Within cooldown window (< 60s since last claim) | `429`, `COOLDOWN_ACTIVE` |
| 2.6 | Rewarded ads disabled (`enabled: false`) | `503 Service Unavailable` |
| 2.7 | Origin not in allowlist, enforcement on | `400 Bad Request` |
| 2.8 | Origin not in allowlist, enforcement off | `201` + warn log |

---

## 3. Mark Ready (Telemetry)

| # | Test | Expected |
|---|------|----------|
| 3.1 | Valid PENDING intent | `204`, intent transitions to `AD_READY` |
| 3.2 | Non-existent intentId | `204` (silently ignored) |
| 3.3 | Different userId than intent owner | `204` (silently ignored, warn log) |
| 3.4 | Terminal intent | `204` (silently ignored) |
| 3.5 | No mark-ready call before claim | Claim should **still succeed** |

---

## 4. Claim — Happy Path

| # | Test | Expected |
|---|------|----------|
| 4.1 | Claim on GRANTED intent | `200`, `idempotentReplay: false`, wallet +5 |
| 4.2 | Claim on PENDING intent (mark-ready was never called) | `200`, `idempotentReplay: false`, wallet +5 |
| 4.3 | Claim on AD_READY intent | `200`, `idempotentReplay: false`, wallet +5 |
| 4.4 | Verify reward amount is from server (not request) | DB `reward_intent.reward_amount` used, not any client value |
| 4.5 | Verify `claim_fingerprint` stored after first claim | `reward_intent.claim_fingerprint` is non-null |
| 4.6 | Verify `guru_ledger` entry created with `reward_intent_id` FK | FK points to claiming intent |

---

## 5. Claim — Idempotency & Conflict

| # | Test | Expected |
|---|------|----------|
| 5.1 | Same request repeated (same intentId + adSessionId + clientEventId) | `200`, `idempotentReplay: true`, no second wallet credit |
| 5.2 | Confirm wallet balance unchanged after idempotent replay | Balance same as after first claim |
| 5.3 | Different adSessionId on already-claimed intent | `409`, `SESSION_CONFLICT` |
| 5.4 | Different clientEventId on already-claimed intent | `409`, `SESSION_CONFLICT` |
| 5.5 | Concurrent claims (two simultaneous requests for same intent) | One succeeds, one gets `SESSION_CONFLICT` or idempotent replay |

---

## 6. Claim — Rate Limits & Fraud

| # | Test | Expected |
|---|------|----------|
| 6.1 | Claim with ownership mismatch (userId ≠ intent.userId) | `403`, `OWNERSHIP_MISMATCH` |
| 6.2 | Claim on expired intent (TTL elapsed) | `409`, `INTENT_EXPIRED` |
| 6.3 | Claim with adSessionId already used for another claimed intent | `409`, `SESSION_REPLAY` |
| 6.4 | Claim on CANCELLED intent | `409`, `INTENT_TERMINAL` |
| 6.5 | Claim on FAILED intent | `409`, `INTENT_TERMINAL` |

---

## 7. Wallet Summary

| # | Test | Expected |
|---|------|----------|
| 7.1 | Fresh user, no claims | `currentBalance: 0`, `dailyCapReached: false` |
| 7.2 | After successful claim | `currentBalance` incremented by `rewardAmountPerAd` |
| 7.3 | At daily limit | `dailyCapReached: true`, `remainingToday: 0` |

---

## 8. Frontend Behavior

| # | Test | Expected |
|---|------|----------|
| 8.1 | Fresh claim response (`idempotentReplay: false`) | UI shows "+5 Guru Token" celebration dialog |
| 8.2 | Replay response (`idempotentReplay: true`) | UI shows "already credited" note, no celebration |
| 8.3 | SESSION_CONFLICT error | UI shows non-alarming conflict message, no retry button |
| 8.4 | mark-ready network error | Ad flow continues, consent dialog shown |
| 8.5 | No-fill from GPT | UI shows "no ad available" message |
| 8.6 | Unsupported browser/ad-blocker | UI shows unsupported state |
| 8.7 | GPT slot destroyed on route change | No GPT callbacks fire after unmount |
| 8.8 | Daily cap reached | CTA button disabled, cap reached state shown |

---

## 9. DB Integrity

| # | Test | Expected |
|---|------|----------|
| 9.1 | `idx_ri_claim_fingerprint` unique constraint | Two different intents with same fingerprint rejected at DB level |
| 9.2 | `guru_ledger.idempotency_key` unique constraint | Duplicate ledger entry rejected |
| 9.3 | `guru_ledger.reward_intent_id` FK | Points to correct intent UUID |
| 9.4 | `reward_intent.reward_intent_id` on SET NULL cascade | When intent deleted, ledger FK set to NULL |

---

## 10. Cleanup & Expiry

| # | Test | Expected |
|---|------|----------|
| 10.1 | Stale PENDING intents (TTL elapsed) | Expired by `RewardIntentCleanupScheduler` every 2 min |
| 10.2 | Claim on expired intent after cleanup | `404 Not Found` or `409 INTENT_EXPIRED` |

---

## V2 vs V1 Behavior Summary

| Area | V1 (old) | V2 (current) |
|------|----------|--------------|
| Auth | `X-User-Id` header | JWT Bearer → `UserJwtFilter` |
| mark-ready | Required before claim | Telemetry-only; claim works without it |
| Claim idempotency | `ALREADY_CLAIMED 409` for any re-claim | Same fingerprint → `200 idempotentReplay=true` |
| Cross-session replay | Not distinguished | Different fingerprint → `SESSION_CONFLICT 409` |
| Reward amount | Could come from client | Always from server-persisted intent |
| DB | `ddl-auto: update` | Flyway V001+V002 migrations |
| Analytics | Inside transaction | Emitted after transaction commit |
