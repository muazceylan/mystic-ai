# AstroGuru — Guideline 4.3(b) Implementation Report

## A. Before

The earlier first-use hierarchy could read as a conventional astrology app because daily horoscope, zodiac, transit, tarot/oracle-style, and other discovery surfaces competed with the personal action experience. A reviewer could understand the app as “what does my sign say today?” before seeing any persistent, chart-specific planning loop.

## B. Core differentiation

`Personal Daily Plan` is now the first substantive personalized Home module and opens expanded. It presents a personalization badge, a chart/transit-derived main theme, one key action, an expandable plain-language reason, completion state, relevant life areas, a caution, and an evening reflection.

The backend composes the plan deterministically from available natal/profile signals and the active transit set. The plan is stored by user local date and locale, so reopening the app does not reshuffle it. Horoscope detail remains available as general zodiac context, but now follows that layer with the cached `Your chart today` personal plan context.

## C. Changed files

Backend core:

- `astrology-service/src/main/java/com/mysticai/astrology/config/PersonalPlanProperties.java`
- `astrology-service/src/main/java/com/mysticai/astrology/dto/daily/DailyActionsDTO.java`
- `astrology-service/src/main/java/com/mysticai/astrology/service/DailyTransitsService.java`
- `astrology-service/src/main/java/com/mysticai/astrology/service/personalplan/PersonalPlanCatalog.java`
- `astrology-service/src/main/java/com/mysticai/astrology/service/personalplan/PersonalPlanComposer.java`
- `astrology-service/src/main/java/com/mysticai/astrology/service/personalplan/PersonalPlanService.java`
- `astrology-service/src/main/java/com/mysticai/astrology/service/personalplan/PersonalPlanSignals.java`
- `astrology-service/src/main/java/com/mysticai/astrology/service/personalplan/PlanQualityGuard.java`
- `astrology-service/src/main/java/com/mysticai/astrology/service/personalplan/SignalUsageRecorder.java`
- `astrology-service/src/main/resources/application.yml`

Backend tests:

- `astrology-service/src/test/java/com/mysticai/astrology/service/DailyTransitsServiceTest.java`
- `astrology-service/src/test/java/com/mysticai/astrology/service/personalplan/PersonalPlanCatalogCoverageTest.java`
- `astrology-service/src/test/java/com/mysticai/astrology/service/personalplan/PersonalPlanComposerTest.java`
- `astrology-service/src/test/java/com/mysticai/astrology/service/personalplan/PersonalPlanServiceTest.java`
- `astrology-service/src/test/java/com/mysticai/astrology/service/personalplan/PlanQualityGuardTest.java`

Mobile:

- `mysticai-mobile/src/screens/HomeScreen.tsx`
- `mysticai-mobile/src/components/Home/PersonalPlanCard.tsx`
- `mysticai-mobile/src/components/daily/PersonalPlanSections.tsx`
- `mysticai-mobile/src/app/(tabs)/today-actions.tsx`
- `mysticai-mobile/src/features/horoscope/screens/HoroscopeDetailScreen.tsx`
- `mysticai-mobile/src/services/daily.service.ts`
- `mysticai-mobile/src/types/daily.types.ts`
- `mysticai-mobile/src/i18n/en.json`
- `mysticai-mobile/src/i18n/tr.json`

## D. Home hierarchy

Before: greeting and several astrology/discovery modules could compete for the first viewport; the personal plan could read as another utility card.

After:

1. Personalized greeting
2. Expanded `Today’s Personal Plan / Bugünkü Kişisel Planın`
3. Personal theme and key action
4. `Why your chart points here / Haritandaki neden`
5. Completion and full-plan CTA
6. Relevant quick actions and journey context
7. Generic horoscope and broader discovery lower in the surface

## E. Personalization signals

The composer can use only signals actually available in the system: Sun, Moon and rising sign; natal house availability; active transit planet and importance; transit-to-natal target/aspect metadata; affected natal house; structured retrogrades; current Moon timing when a real intraday peak is calculated; birth-date-derived age band; relationship status; seven-day plan history; and recent plan feedback.

`profileSignalsUsed` is decision-audited: a field is reported only when it changed ranking, filtering, wording, or variant selection. Profession, employer, office, manager, client, meeting, project, spouse/partner, house, and clock-time claims are not invented when their supporting data is absent.

## F. Duplicate prevention

Each deterministic variant has a canonical `semanticKey`. The response also records `lifeArea + actionIntent` fingerprints. Selection rejects:

- a semantic key already used in the same response;
- the same action intent in the response;
- semantic keys and area/intent pairs found in the configured seven-day history;
- wording above the normalized similarity threshold;
- generic motivational phrases and tested paraphrases.

Catalog exhaustion is explicit in plan metadata; it does not silently restore generic legacy copy.

## G. Feedback loop

- `TOO_GENERIC`: promotes more concrete eligible copy and permits bounded same-day regeneration.
- `REPETITIVE`: regenerates while the current plan fingerprints and recent history block the same semantic family.
- `NOT_RELEVANT`: applies a configurable negative score to that life area for the feedback influence window.
- `HELPFUL`: applies a deliberately small life-area boost and favors the eligible action-intent family.
- `NOT_USEFUL`: is retained as negative history without inventing a new user preference.

History rules still apply after positive feedback, so the user cannot become locked into one content family. The mobile client consumes the inline replacement plan returned by regeneration, avoiding a stale-cache race.

## H. Same-sign differentiation test

The explicit regression fixture uses two Scorpio-Sun users:

- User A: Capricorn rising, Taurus Moon, Mars affecting natal house 7. The primary life area is `relationship`.
- User B: Gemini rising, Pisces Moon, Saturn affecting natal house 10. The primary life area is `work`.

The test requires different main-theme titles, primary categories/descriptions, caution descriptions, and life-area sequences. A second test holds the Sun and sky constant and proves that a relevant rising-sign ruler can change the leading area from relationship to communication.

## I. Screenshot readiness

Home opens the plan expanded. Without scrolling through discovery modules, the first capture can show:

`Today’s Personal Plan` → personalization badge → main theme → key action → `Why your chart points here`.

The full plan screen supplies a second capture with the rationale expanded and a third with feedback/regeneration. Demo data must remain fictional and the production review account must have a complete birth profile.

## J. Tests

Final verification on 2026-08-10:

- Astrology service: 145 tests passed, 0 failed, 0 skipped.
- Personal-plan focused suite includes 33 composer tests, 27 quality-guard tests, 11 service lifecycle tests, 9 catalog coverage tests, and 6 Daily Transits integration/unit tests.
- Dedicated mobile Guideline 4.3(b) static QA passed.
- TypeScript type-check passed.

## K. Build verification

- `mvn -pl astrology-service test` — passed (145 tests).
- `npx tsc --noEmit` — passed.
- `npm run qa:guideline-4.3b` — passed.
- `npm run build:web` — passed; Expo exported the web bundle.
- `git diff --check` — passed after whitespace cleanup.
- Mobile lint — not run because this package currently has no lint script, ESLint dependency, or ESLint configuration.
- Native iOS/Android release builds — not run; repository release scripts bump store build/version numbers as a side effect.

## L. Remaining risks

The implementation materially addresses product differentiation, but Apple approval remains a reviewer decision. Final review quality still depends on a reachable production backend, a non-expiring fully entitled account with fictional complete birth data, accurate screenshots/metadata, and a physical-device walkthrough. The native release archive should be verified before submission. Generic horoscope remains in the product as a secondary surface; its placement and screenshots must stay subordinate to Personal Daily Plan.

## Metadata recommendations

### Subtitle alternatives (30-character limit)

English:

1. `Personal Daily Plan` (19)
2. `Your Chart, Your Daily Plan` (27)
3. `Chart-Based Daily Planner` (25)

Turkish:

1. `Kişisel Günlük Planın` (21)
2. `Haritandan Günlük Plan` (22)
3. `Sana Özel Günlük Plan` (21)

### Promotional text alternatives (170-character limit)

1. `Build a practical daily plan from your birth chart, current transits, personal context, and past feedback—then complete actions and shape tomorrow’s plan.` (154)
2. `See what stands out for you today, why it matters, and the one action to take. Your chart and feedback make each daily plan meaningfully personal.` (146)
3. `Go beyond generic horoscopes with a stable daily plan, clear chart-based reasons, relevant life areas, cautions, reflection, and feedback-driven variety.` (153)

### First five screenshots

1. Headline: `Your personal plan for today`; subtitle: `A daily theme and one key action from your chart.`

   Screen: Home with the expanded Personal Daily Plan card.
2. Headline: `See why this action fits`; subtitle: `Understand the chart context in clear, practical language.`

   Screen: Full plan with the primary action and expanded rationale.
3. Headline: `A plan that learns from you`; subtitle: `Feedback reduces generic, repetitive, or irrelevant suggestions.`

   Screen: Feedback choices and regenerated plan state.
4. Headline: `Your chart, not only your sign`; subtitle: `General zodiac context meets your personal chart today.`

   Screen: Horoscope detail with `Your chart today` card.
5. Headline: `Reflect and build continuity`; subtitle: `Close the day with a focused question and return to a stable plan.`

   Screen: Evening reflection and completed-action state.
