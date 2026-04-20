# Content Ops Dashboard Spec

Recommended metrics and reports for weekly content operations monitoring.

---

## Weekly Metrics (Google Search Console + GA4)

### Search Console

| Metric | Source | Note |
|---|---|---|
| Total indexed URL count | Coverage → Valid | Should grow over time |
| Not-indexed URL count | Coverage → Excluded | Investigate any increase |
| TR impressions (7 days) | Performance → filter country=Turkey | Week-over-week trend |
| EN impressions (7 days) | Performance → filter lang=en | Week-over-week trend |
| Article indexing delay | URL Inspection on latest article | Target: < 72 hours |
| hreflang errors | International Targeting | Target: 0 errors |

### GA4

| Metric | Source | Note |
|---|---|---|
| Sessions by locale | Event `page_view` → dimension `locale` | TR vs EN split |
| Top 5 TR pages by sessions | Pages report → filter lang=tr | |
| Top 5 EN pages by sessions | Pages report → filter lang=en | |
| Blog engagement rate | `/blog/*` pages | Goal: > 40% |
| CTR by locale | Search Console Performance | Target: > 3% |

---

## Monthly Metrics

| Metric | Source | Target |
|---|---|---|
| New articles published (TR) | CMS / git log | ≥ 4/month |
| New articles published (EN) | CMS / git log | ≥ 2/month |
| Articles indexed within 3 days | URL Inspection history | > 90% |
| EN/TR parity coverage | Manual check | > 80% of TR articles have EN pair |
| Average article ranking (top queries) | Search Console Queries | Track over 3 months |
| Organic traffic growth MoM | GA4 Acquisition | Target: +10% MoM |

---

## Reward Funnel Metrics (Future — when reward feature is live)

| Metric | GA4 Event | Note |
|---|---|---|
| Reward funnel entry rate | `rewarded_video_click` / sessions | |
| Video completion rate | `rewarded_video_complete` / `rewarded_video_start` | |
| Reward grant rate | `astro_token_reward_granted` / `rewarded_video_complete` | Should be near 100% if backend is healthy |
| Reward failure rate | `astro_token_reward_failed` / (`granted` + `failed`) | Alert if > 5% |
| Top reward entry pages | `rewarded_video_click` → dimension `page_type` | |
| Token amounts granted | `astro_token_reward_granted` → metric `token_amount` | |

---

## Blog Performance Report

Run monthly:
1. GA4: Pages and Screens → filter `/blog/` → sort by sessions DESC
2. Search Console: Performance → Pages → filter `/blog/` → sort by impressions DESC
3. Cross-reference: are high-impression articles getting clicks?
4. Identify articles with high impressions but low CTR → improve title/description

---

## Locale Parity Health Report

Run monthly:
1. Count published TR articles
2. Count published EN articles
3. Check for TR articles without EN pair
4. Check for EN articles without hreflang pointing to TR

---

## Dashboard Tools Recommendation

| Tool | Use |
|---|---|
| Google Search Console | Index status, impressions, CTR, hreflang errors |
| GA4 | Sessions, engagement, events, funnel |
| Looker Studio | Automated dashboard combining both sources |
| Ahrefs / Semrush (optional) | Keyword ranking tracking, competitor analysis |
