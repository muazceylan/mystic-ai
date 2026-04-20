# Rewarded Ads API Contract (V2 — Hardened)

> Service: `notification-service` (port 8088)  
> Base path: `/api/v1/monetization/rewarded-ads`  
> Auth: `Authorization: Bearer <userJWT>` — validated by `UserJwtFilter` independently of the API gateway.

---

## Authentication

All endpoints require a valid user JWT in the `Authorization` header.

```
Authorization: Bearer <jwt>
```

**`X-User-Id` is NOT accepted or trusted for authentication.** The user identity is extracted exclusively from the JWT payload (`userId` claim). This closes the trust gap that exists when the service is called directly (bypassing the gateway).

---

## Endpoints

### 1. `POST /intents`

Creates a new reward intent (one per ad session).

**Request headers:**

| Header | Required | Description |
|--------|----------|-------------|
| `Authorization` | ✅ | User JWT Bearer token |
| `X-Forwarded-For` | No | Client IP (gateway-injected) |
| `User-Agent` | No | Browser UA |
| `Origin` | No | Checked against allowlist |

**Query params:**

| Param | Default | Description |
|-------|---------|-------------|
| `page` | `/earn` | Page path context (sanitized, max 256 chars) |

**Response `201 Created`:**

```json
{
  "intentId": "uuid",
  "rewardAmount": 5,
  "rewardType": "GURU_TOKEN",
  "expiresAt": "2026-04-13T10:05:00",
  "adConfig": {
    "adUnitPath": "/12345/mysticai/rewarded_earn",
    "supported": true,
    "placementKey": "web_earn_page"
  }
}
```

**Errors:**

| Code | HTTP | Meaning |
|------|------|---------|
| `TOO_MANY_ACTIVE_INTENTS` | 409 | User already has an active intent |
| `DAILY_CAP_REACHED` | 429 | Daily limit hit |
| `HOURLY_CAP_REACHED` | 429 | Hourly limit hit |
| `COOLDOWN_ACTIVE` | 429 | Too soon after last claim |

---

### 2. `POST /intents/{intentId}/mark-ready`

**TELEMETRY ONLY.** Records when the GPT ad slot became ready. Does not gate the claim flow.

**Request body:**

```json
{
  "adSessionId": "string",
  "clientEventId": "string"
}
```

**Response:** Always `204 No Content`. Never returns 4xx/5xx for business-logic reasons.

> **V2 change:** This endpoint no longer gates claim. Claim succeeds even if mark-ready was never called (no-fill path, ad-blocker recovery, etc.).

---

### 3. `POST /intents/{intentId}/claim`

Claims the reward after GPT fires `rewardedSlotGranted`.

**Request body:**

```json
{
  "adSessionId": "string",
  "clientEventId": "string",
  "pageContext": "/earn",
  "userAgentSnapshot": "Mozilla/5.0 ...",
  "grantedPayloadSummary": "{...}"
}
```

**Claim fingerprint:** `SHA-256(intentId | adSessionId | clientEventId)`

**Idempotency / conflict resolution:**

| Case | Response |
|------|----------|
| First claim | `200 OK`, `idempotentReplay: false` |
| Same fingerprint, already claimed | `200 OK`, `idempotentReplay: true`, **no double-credit** |
| Different fingerprint, already claimed | `409 CONFLICT`, `SESSION_CONFLICT` |

**Response `200 OK`:**

```json
{
  "success": true,
  "walletBalance": 25,
  "grantedAmount": 5,
  "rewardType": "GURU_TOKEN",
  "ledgerEntryId": "uuid",
  "message": "+5 Guru Token hesabına eklendi.",
  "idempotentReplay": false
}
```

**Errors:**

| Code | HTTP | Meaning |
|------|------|---------|
| `SESSION_CONFLICT` | 409 | Different fingerprint — different session already claimed |
| `OWNERSHIP_MISMATCH` | 403 | Intent belongs to another user |
| `INTENT_EXPIRED` | 409 | TTL exceeded |
| `DAILY_CAP_REACHED` | 429 | Daily limit (edge case) |
| `HOURLY_CAP_REACHED` | 429 | Hourly limit (edge case) |
| `COOLDOWN_ACTIVE` | 429 | Cooldown (edge case) |
| `SESSION_REPLAY` | 409 | adSessionId already used for another intent |
| `INTENT_TERMINAL` | 409 | Intent in CANCELLED/FAILED state |

> **Reward amount always comes from the server-persisted intent.** The request body cannot influence the amount.

---

### 4. `GET /wallet-summary`

Returns the user's current Guru Token wallet state.

**Response `200 OK`:**

```json
{
  "currentBalance": 25,
  "lifetimeEarned": 100,
  "dailyEarnedToday": 10,
  "dailyLimit": 50,
  "remainingToday": 40,
  "dailyCapReached": false,
  "rewardAmountPerAd": 5,
  "rewardedAdsEnabled": true
}
```

---

## Guru Token Rules

- Guru Tokens are **non-transferable**, **non-cashable**, platform-internal only.
- Tokens can be earned by watching rewarded ads.
- Tokens can be spent to unlock content (via `useGuruUnlock` in the mobile app).
- No monetary value; no regulatory classification as currency.

---

## DB Migration Reference

| Migration | Contents |
|-----------|----------|
| `V001__reward_intent.sql` | `reward_intent` table, `guru_wallet` extensions, indexes |
| `V002__rewarded_ads_hardening.sql` | `claim_fingerprint` column, `reward_intent_id` FK on `guru_ledger`, idempotent index re-creation |

Schema changes are managed via Flyway (or applied manually in dev).  
`ddl-auto` must be `validate` in production — never `update`.
