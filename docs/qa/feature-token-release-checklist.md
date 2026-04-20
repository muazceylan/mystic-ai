# Feature Token Release Checklist

## Scope

This checklist covers the release-hardening flow for:

- 6 feature-level Guru Token access gates
- rewarded video fallback when balance is insufficient
- signup bonus sync + retry
- admin-managed feature rules and signup bonus settings
- wallet / ledger idempotency and consistency

## Stable Verification Commands

Run these before release:

```bash
cd notification-service && mvn test
cd auth-service && mvn test
cd mystic-admin && pnpm exec next build --webpack
cd mysticai-mobile && ./node_modules/.bin/tsc --noEmit
```

## Admin Setup Matrix

Prepare one published monetization config and validate each feature key:

- `SHAREABLE_CARD_CREATE`
- `NATAL_CHART_DETAIL_VIEW`
- `COMPATIBILITY_VIEW`
- `PERSON_ADD`
- `BIRTH_NIGHT_POSTER_VIEW`
- `HOROSCOPE_VIEW`

For each feature, verify these admin combinations:

1. `enabled=true`, `tokenCost=1`, `rewardFallbackEnabled=true`
2. `enabled=true`, `tokenCost=1`, `rewardFallbackEnabled=false`
3. `enabled=true`, `tokenCost=0`
4. `enabled=false`

Also validate signup bonus settings:

1. `signupBonusEnabled=true`, `signupBonusTokenAmount=10`, `oneTimeOnly=true`
2. `signupBonusEnabled=false`
3. `registrationSource` filtered to a non-matching source

## Manual QA Scenarios

### Feature gating

For each of the 6 feature keys:

1. Tap the gated action with enough Guru balance.
Expected:
- access evaluation returns allowed
- exactly 1 Guru Token is consumed when `tokenCost=1`
- ledger gets one `GURU_SPENT` row
- wallet balance drops by exactly 1

2. Tap the gated action when `tokenCost=0`.
Expected:
- access is granted without wallet mutation
- no new `GURU_SPENT` ledger row is created

3. Tap the gated action when the feature is disabled.
Expected:
- UI shows disabled state
- no token is consumed
- no reward CTA is shown

### Insufficient balance + rewarded fallback

1. Set wallet balance below `tokenCost`.
2. Keep `rewardFallbackEnabled=true`.
3. Trigger the gated action.
Expected:
- insufficient balance state is shown
- rewarded video CTA is visible
- no token is consumed before reward completion

4. Complete the rewarded video once.
Expected:
- exactly one `REWARD_EARNED` ledger row is created
- wallet increases by configured reward amount
- user can retry the feature and unlock it successfully

5. Repeat with `rewardFallbackEnabled=false`.
Expected:
- insufficient balance state is shown without rewarded CTA
- no reward ledger row is created

### Idempotency and concurrency

1. Double tap the same feature unlock CTA rapidly.
Expected:
- only one `GURU_SPENT` ledger row for the same idempotency key
- wallet balance decreases once

2. Replay the rewarded callback payload with the same idempotency key.
Expected:
- only one `REWARD_EARNED` ledger row exists
- duplicate callback is logged as idempotent replay / duplicate hit

3. Replay signup bonus sync for the same user.
Expected:
- only one `WELCOME_BONUS` ledger row exists
- auth-side sync state remains `GRANTED` or `SKIPPED`

### Signup bonus durability

1. Register a new user while notification-service is reachable.
Expected:
- signup bonus is granted once
- auth `users.signup_bonus_sync_status = GRANTED`

2. Register a new user while notification signup endpoint is temporarily unavailable.
Expected:
- registration still succeeds
- auth user row remains persisted
- sync status becomes `PENDING`
- `signup_bonus_last_error` and `signup_bonus_next_retry_at` are populated

3. Restore connectivity and wait for scheduler.
Expected:
- pending user is retried automatically
- signup bonus is granted once
- sync status moves to `GRANTED`

### Admin refresh

1. Change a feature rule in admin and publish.
2. Re-open the relevant mobile screen.
Expected:
- latest config is reflected after refresh / refetch
- CTA text, helper text, token cost and fallback availability match admin

## Wallet / Ledger Consistency Checks

For each tested user:

1. Compare wallet balance with the latest ledger `balanceAfter`.
Expected:
- values match

2. Sum all ledger amounts against initial balance if needed.
Expected:
- no drift between wallet and ledger totals

## Observability Checks

Verify logs and metrics for:

- feature access denied
- insufficient balance
- feature token consumed
- rewarded token granted
- signup bonus granted
- signup bonus failed
- signup bonus retry scheduled
- duplicate idempotency hit
