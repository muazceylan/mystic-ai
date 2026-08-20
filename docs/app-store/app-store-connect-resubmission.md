# AstroGuru App Store Resubmission

## App Information

### Name

- EN: `AstroGuru: Daily Plan`
- TR: `AstroGuru`

### Subtitle

- EN: `Personal Growth & Daily Plan`
- TR: `Kişisel Gelişim & Günlük Plan`

## Promotional Text

- EN: `Turn personalized insights into practical daily actions. Plan your day, reflect on decisions, journal your dreams, and build meaningful personal routines.`
- TR: `Kişisel içgörüleri günlük adımlara dönüştür. Gününü planla, kararlarını değerlendir, rüyalarını kaydet ve sana uygun kişisel rutinler oluştur.`

## Description

The complete validated EN/TR descriptions are maintained in:

- [`metadata/en-US.json`](metadata/en-US.json)
- [`metadata/tr.json`](metadata/tr.json)
- [`app-store-connect-metadata.md`](app-store-connect-metadata.md)

Both descriptions lead with planning, practical actions, decision reflection, journaling, and practices; they retain honest astrology coverage and include the standard EULA and Privacy Policy links.

## Keywords

- EN: `journal,meditation,dreams,decision,habits,wellness,natal,zodiac,compatibility,reflection`
- Byte count: 88/100
- TR: `günlük,meditasyon,rüya,karar,alışkanlık,uyum,ilişki,farkındalık,rutin`
- Byte count: 78/100

## URLs

- Support: `https://info.astroguru.app/`
- Marketing: `https://astroguru.app/`
- Privacy: `https://astroguru.app/privacy`
- EULA: `https://www.apple.com/legal/internet-services/itunes/dev/stdeula/`

All returned HTTP 200 during final validation.

## What's New

Not applicable to first App Store version 1.0. Prepared but disabled copy is retained in the EN/TR JSON files for a future update.

## App Review Notes

```text
IMPORTANT — GUIDELINE 4.3(b) DIFFERENTIATION

Thank you for reviewing AstroGuru. Build 16 presents the complete product as personalized daily planning, actionable recommendations, structured decision reflection, journaling, personal-practice tracking, and astrological context. It is not solely a static horoscope or fortune-report app and does not claim guaranteed future outcomes.

PLEASE REVIEW THESE FLOWS

1. Home → Today’s Personal Plan: view the personalized daily focus and actions; open the full plan, complete a supported action, and send Helpful/Improve feedback.
2. Discover → Daily Life → Cosmic Planner: choose a date and category, review recommendations, and create a local reminder.
3. Discover → Daily Life → Decision Compass: choose a real-life category and review its structured context and detail view. This build does not claim free-text decision entry or saved decision history.
4. Discover → Self Discovery → Dream Journal: review previous entries and create a dated dream entry.
5. Discover → Spiritual Practices: open meditation, breathing, prayer/Esma/Surah content, use a counter, and save progress to the practice journal.
6. Home → My Journey: review actual completed actions, dream entries, practice records, active days, and streak data for the demo account.
7. Discover → Relationships → Compatibility: select the seeded second profile and review the supported relationship contexts and multiple compatibility dimensions.
8. Discover → Astrological Insights: natal charts, horoscopes, transits, and numerology remain clearly available as a personalization layer.

SIGN IN WITH APPLE
The official Sign in with Apple control is used. Apple full-name/email scopes are requested when available, and users are not required to re-enter name or email after Apple authentication.

SUBSCRIPTIONS AND TRIAL CLAIMS
The monthly and yearly subscriptions are included in this submission. The paywall reads the live StoreKit offer through RevenueCat. A free-trial message appears only when StoreKit provides a free introductory offer and confirms eligibility; otherwise no trial is advertised. Restore Purchases, Terms, Privacy, duration, and localized recurring price are available on the paywall.

APP TRACKING TRANSPARENCY
On a fresh install with Settings → Privacy & Security → Tracking → Allow Apps to Request to Track enabled, launch Build 16 and keep the app active. The native ATT prompt appears on first launch before analytics or advertising collection is enabled. The app continues normally if permission is declined.

Use the non-expiring demo credentials in Sign-In Information. The production backend will remain available throughout review.
```

## Review Account

Configured securely in App Store Connect Sign-In Information. Credentials are intentionally excluded from source control.

## Screenshots

Required order is documented in [`screenshots-required.md`](screenshots-required.md). The existing store order must be changed so Personal Daily Plan appears before birth-night sky, horoscope, weekly analysis, and other static astrology surfaces.

## Guideline 4.3(b) Differentiation

- Previous positioning: Turkish subtitle, promotional text, first screenshots, and description opening emphasized daily horoscope, birth chart, weekly astrology, and transit reporting.
- New positioning: personalized daily planning, practical actions, structured reflection, dream and practice journals, local reminders, and multiple relationship contexts lead the metadata.
- Astrology is not hidden: natal charts, horoscopes, transits, compatibility, and numerology remain accurately described as a personalization and insight layer.
- No reviewer-only UI, fake feature, hidden mode, or guaranteed prediction claim is used.

## Verified Product Claims

- Personal Daily Plan with persisted completion and feedback: verified.
- Cosmic Planner date/category browsing and local reminder creation: verified.
- Decision Compass category/detail flow: verified; no free-text decision-entry claim is made.
- Dream entry creation and history: verified.
- Meditation, breathing, prayer/Esma/Surah, counters, and practice journal: verified.
- Compatibility with supported relationship contexts and multiple dimensions: verified.
- Natal chart, daily/weekly horoscope, transits, and numerology: verified.

## App Store Connect Manual Actions

- [x] Resolve Build 16 export compliance as “None of the algorithms mentioned above.”
- [x] Replace rejected Build 14 with Build 16.
- [x] Add en-US localization alongside the Turkish store localization.
- [x] Apply the validated EN/TR subtitle, promotional text, descriptions, and keywords.
- [x] Preserve Lifestyle primary category, current contact/copyright values, support/marketing/privacy URLs, and Apple Standard EULA.
- [x] Add `https://astroguru.app/privacy` to the English (U.S.) App Privacy localization.
- [x] Paste the review notes above.
- [x] Reorder screenshots so Personal Daily Plan is first.
- [x] Confirm the four IAPs, two subscriptions, and subscription group remain in the draft submission.
- [x] Physical-device fresh-install ATT recording attached in App Store Connect as `att-build16-physical-device.mp4`. The edited source is stored at [`attachments/att-build16-physical-device.mp4`](attachments/att-build16-physical-device.mp4); unrelated apps and the iPhone home screen were removed.
- [x] Resubmitted the complete eight-item package to App Review on August 14, 2026 at 5:53 PM (Europe/Istanbul): Build 16, four IAPs, two subscriptions, and the `Astro Guru` subscription group. Submission ID: `3ad6c040-29cb-4875-9e02-4b375326f6d8`. Every item is `Waiting for Review`.

## Validation Results

- Name EN/TR: PASS (9/30 characters)
- Subtitle EN: PASS (28/30 characters)
- Subtitle TR: PASS (29/30 characters)
- Promotional Text EN: PASS (154/170 characters)
- Promotional Text TR: PASS (142/170 characters)
- Description EN: PASS (2,112/4,000 characters)
- Description TR: PASS (2,195/4,000 characters)
- Keywords EN: PASS (88/100 UTF-8 bytes)
- Keywords TR: PASS (78/100 UTF-8 bytes)
- Review Notes: PASS (2,706/4,000 UTF-8 bytes)
- Support URL: PASS (HTTP 200)
- Marketing URL: PASS (HTTP 200)
- Privacy URL: PASS (HTTP 200)
- EULA URL: PASS (HTTP 200)
- en-US localization source: PASS; manual App Store Connect creation required
- tr localization source: PASS

Run locally with:

```bash
npm run validate:app-store-metadata
npm run validate:app-store-metadata -- --check-urls
```
