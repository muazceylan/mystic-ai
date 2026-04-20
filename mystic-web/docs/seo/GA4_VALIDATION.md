# GA4 Event Validation Guide

## Validation Method

Use **GA4 DebugView** (Admin → DebugView) with the Google Analytics Debugger Chrome extension enabled.

Each section below lists what to verify in DebugView.

---

## `page_view`

**When:** Every page load (fired by gtag `config` call in `GoogleAnalytics.tsx`)

**Check in DebugView:**
- [ ] Event fires on each navigation
- [ ] No duplicate `page_view` on the same URL
- [ ] `page_location` matches actual URL
- [ ] Does NOT fire when `NEXT_PUBLIC_ENABLE_ANALYTICS !== "true"`

---

## `feature_click`

**When:** User clicks a feature card or feature CTA

**Required params:** `feature_name`, `locale`, `page_type`

**Check:**
- [ ] `feature_name` is descriptive (e.g., `natal_chart`, `daily_transits`)
- [ ] `locale` is `tr` or `en`

---

## `blog_card_click`

**When:** User clicks a blog card on listing page or home page preview

**Required params:** `slug`, `locale`

**Check:**
- [ ] `slug` matches article slug
- [ ] No duplicate fire on same click
- [ ] `locale` is correct for the page context

---

## `article_open`

**When:** User views an article detail page

**Required params:** `slug`, `locale`

**Check:**
- [ ] Fires once per article page load
- [ ] `slug` is correct
- [ ] Not fired on listing page

---

## `cta_click`

**When:** User clicks any CTA button (non-store)

**Required params:** `cta_label`, `placement`, `locale`

**Check:**
- [ ] `cta_label` is descriptive
- [ ] `placement` indicates context (e.g., `hero`, `footer`, `feature_section`)

---

## `store_click`

**When:** User clicks App Store or Google Play button

**Required params:** `store` (`app_store` | `play_store`), `placement`

**IMPORTANT:**
- [ ] Does NOT fire when store URL is not configured (`#` or empty)
- [ ] `store` param is exactly `app_store` or `play_store`

---

## `locale_switch`

**When:** User switches between TR and EN

**Required params:** `from_locale`, `to_locale`, `source`

**Check:**
- [ ] `from_locale` and `to_locale` are different
- [ ] Navigation goes to correct counterpart route (no 404)

---

## `rewarded_video_click`

**When:** User taps "Watch to earn" CTA

**Required params:** `reward_source`, `reward_placement`, `token_name`

**Check:**
- [ ] Fires once per tap (not on re-render)
- [ ] `reward_source` is a valid value

---

## `rewarded_video_start`

**When:** Ad SDK confirms video loading started

**Required params:** same as click

**Check:**
- [ ] Only fires when ad actually loads (not on click alone if ad fails to load)

---

## `rewarded_video_complete`

**When:** User finished watching the full video; ad SDK fires reward callback

**Check:**
- [ ] Only fires when ad SDK signals completion (not on skip or close)
- [ ] Does NOT grant tokens by itself — backend validation required

---

## `astro_token_reward_granted` ← KEY EVENT

**When:** Backend confirms reward was granted and wallet credited

**Required params:** `reward_source`, `reward_placement`, `token_name`, `token_amount`, `success: true`

**CRITICAL CHECKS:**
- [ ] Only fires AFTER backend 200 OK response
- [ ] `token_amount` is a positive integer
- [ ] `success` is `true`
- [ ] NO PII in params
- [ ] Marked as Key Event in GA4 panel

---

## `astro_token_reward_failed`

**When:** Any failure in reward pipeline (no fill, timeout, validation failure)

**Required params:** `failure_reason`, `success: false`

**Check:**
- [ ] `failure_reason` is one of: `no_fill` | `timeout` | `validation_failed` | `reward_not_granted`
- [ ] `success` is `false`

---

## Common Issues

| Issue | Fix |
|---|---|
| Duplicate `page_view` | Check for multiple gtag `config` calls; remove from individual pages if using layout-level tracking |
| Missing `locale` param | Add `locale` to common params in each `trackEvent` call |
| `store_click` with no URL | Ensure `StoreCTA.tsx` guards prevent tracking when URL is empty/`#` |
| Events not appearing in DebugView | Verify `NEXT_PUBLIC_ENABLE_ANALYTICS=true` and valid `NEXT_PUBLIC_GA_MEASUREMENT_ID` |
