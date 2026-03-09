# Numerology Amplitude Dashboard Template

Bu dokuman, Numerology 2.0 post-implementation hardening ve measurement fazi icin dogrudan uygulanabilir dashboard sablonudur.

## 1) Dashboard Seti

### Dashboard A - Numerology Executive (D+1 / D+7)
Global filter onerisi:
- Platform: Mobile
- Date range: Last 7 days (rolling)
- Locale: All

| Chart ID | Chart Type | Query | Breakdown / Filter | KPI |
|---|---|---|---|---|
| A1 | Event Segmentation | `numerology_screen_viewed` (Unique Users) | Breakdown: `entry_point` | Reach |
| A2 | Event Segmentation | `numerology_loaded` (Unique Users) | Breakdown: `entry_point` | Load success user reach |
| A3 | Formula | `A2 / A1` | Eligible segment: `has_name=true`, `has_birth_date=true` | Load Success Rate |
| A4 | Event Segmentation | `numerology_widget_viewed`, `numerology_widget_clicked` | Breakdown: `widget_state` | Widget CTR |
| A5 | Formula | `widget_clicked / widget_viewed` | Filter: `source_surface=home_widget` | Widget CTR |
| A6 | Funnel | `numerology_widget_viewed -> numerology_widget_clicked -> numerology_screen_viewed` | Filter: `entry_point=home_widget` | Widget-to-Screen conversion |
| A7 | Event Segmentation | `numerology_share_clicked` (Total Events) | Breakdown: `share_format`, `share_channel` | Share usage |
| A8 | Funnel | `numerology_share_clicked -> share_service_result(success=true)` | Breakdown: `share_channel` | Share completion proxy |
| A9 | Event Segmentation | `numerology_save_snapshot_clicked` (Total Events) | Breakdown: `snapshot_year` | Snapshot save intent |
| A10 | Event Segmentation | `numerology_name_analysis_clicked` (Unique Users) | Breakdown: `entry_point` | Cross-module CTR |

### Dashboard B - Reliability & Degrade
Global filter onerisi:
- Platform: Mobile
- Date range: Last 7 days

| Chart ID | Chart Type | Query | Breakdown / Filter | KPI |
|---|---|---|---|---|
| B1 | Event Segmentation | `numerology_retry_clicked` (Total Events) | Breakdown: `error_type` | Error pressure |
| B2 | Event Segmentation | `numerology_partial_response_seen` (Total Events) | Breakdown: `missing_sections` | Partial response rate |
| B3 | Event Segmentation | `numerology_stale_cache_seen` (Total Events) | Breakdown: `cache_status` | Stale fallback pressure |
| B4 | Formula | `retry_clicked / numerology_screen_viewed` | Filter: none | Retry rate |
| B5 | Event Segmentation | `numerology_empty_state_viewed` (Total Events) | Breakdown: `empty_variant` | Onboarding gap map |
| B6 | Event Segmentation | `numerology_loaded` (Total Events) | Aggregation: Avg/Median/95th of `load_time_ms` | Performance |

### Dashboard C - Event Quality
Global filter onerisi:
- Date range: Last 3 days (quality monitoring icin kisa pencere)

| Chart ID | Chart Type | Query | Breakdown / Filter | Gecis Kriteri |
|---|---|---|---|---|
| C1 | Data Table | `numerology_screen_viewed` | Show property null-rate: `entry_point`, `locale`, `response_version` | Her property null < %1 |
| C2 | Data Table | `numerology_loaded` | Property type check: `load_time_ms` numeric | Type mismatch = 0 |
| C3 | Data Table | `numerology_retry_clicked` | `error_type` value distribution | Enum disi deger = 0 |
| C4 | Data Table | `numerology_share_clicked` | `share_format`, `share_channel` distribution | Enum disi deger = 0 |
| C5 | Formula | `numerology_widget_clicked / numerology_widget_viewed` | Breakdown: `entry_point` | clicked <= viewed |
| C6 | Event Segmentation | `numerology_screen_viewed` (Total Events) | Breakdown: `amplitude_id` (Top offenders) | Spam impression user kontrolu |

## 2) Funnel Tanimlari (Kaydedilecek Hazir Funnel'lar)

| Funnel ID | Steps | Conversion Window | Ana Kullanim |
|---|---|---|---|
| F1 Core Engagement | `numerology_screen_viewed -> numerology_loaded -> numerology_share_clicked` | 24h | Core value + share niyeti |
| F2 Save Funnel | `numerology_screen_viewed -> numerology_loaded -> numerology_save_snapshot_clicked` | 24h | Save behavior |
| F3 Widget Acquisition | `numerology_widget_viewed -> numerology_widget_clicked -> numerology_screen_viewed(entry_point=home_widget)` | 24h | Home traffic kalitesi |
| F4 Name Bridge | `numerology_screen_viewed -> numerology_name_analysis_clicked` | 24h | Cross-navigation |
| F5 Share Completion Proxy | `numerology_share_clicked -> share_service_result(success=true)` | 30m | Click vs completion ayrimi |

## 3) KPI Kartlari (Ilk 7 Gun)

| KPI | Formula | Green | Yellow | Red |
|---|---|---|---|---|
| Load Success Rate | `numerology_loaded / numerology_screen_viewed(eligible)` | >= 90% | 80-89% | < 80% |
| Widget CTR | `widget_clicked / widget_viewed` | >= 5% | 3-4.9% | < 3% |
| Widget-to-Screen | `screen_viewed(home_widget) / widget_clicked` | >= 70% | 55-69% | < 55% |
| Share CTR | `numerology_share_clicked / numerology_loaded` | >= 5% | 3-4.9% | < 3% |
| Snapshot Save Rate | `save_snapshot_clicked / numerology_loaded` | >= 4% | 2-3.9% | < 2% |
| Retry Rate | `retry_clicked / screen_viewed` | < 5% | 5-8% | > 8% |
| p95 Load Time | `p95(load_time_ms)` | < 2500ms | 2500-3500ms | > 3500ms |

## 4) Event Quality Kontrol Rutini (Gunluk 10 Dakika)

| Kontrol | Sorgu | Kabul Kriteri |
|---|---|---|
| Naming standard | Last 24h event listesi (numerology prefix) | snake_case disi yok |
| Required property doluluk | C1 + C2 data table | Null-rate esik alti |
| Enum hijyeni | C3 + C4 | Enum disi deger yok |
| Duplicate/spam | C6 top amplitude_id | Tekil kullanici basina anormal patlama yok |
| Funnel continuity | F1-F5 trend | Keskin kirilim yok |
| Locale dagilimi | A1/A2 breakdown `locale` | Beklenmeyen locale spike yok |

## 5) Share Completion Karari

Mevcut:
- `numerology_share_clicked` niyet eventi.
- `share_service_result(success=true)` completion proxy.

Oneri:
- Ayrica numerology seviyesinde iki event eklenmeli:
  - `numerology_share_completed`
  - `numerology_share_failed`
- Boynuz etkisini azaltmak icin `share_service_result` teknik event olarak kalabilir, product funnel'da completed/failed tercih edilmelidir.

## 6) Snapshot Edge-Case Monitoring Query Seti

| Query ID | Query | Amac |
|---|---|---|
| S1 | `numerology_save_snapshot_clicked` by `snapshot_year` | Yillik dagilim |
| S2 | `numerology_save_snapshot_clicked` by `response_version` | Version drift |
| S3 | `numerology_save_snapshot_clicked` where `cache_status=stale` | Stale save baskisi |
| S4 | `numerology_save_snapshot_clicked` 1 min icinde tekrar sayisi (user bazli) | Double-tap duplicate risk |
| S5 | `numerology_loaded` vs `snapshot_exists=true` | Save adoption etkisi |

Not:
- S4 icin Amplitude UI sinirliysa warehouse export ile time-window SQL calistirin.

## 7) Release Readiness (Measurement Gate)

Canliya cikis icin analytics gate:
- A1-A10, B1-B6, C1-C6 chartlari olusturulmus olmali.
- F1-F5 funnellari kayitli olmali.
- 4 monitor aktif olmali:
  - `load_success_rate < 80%` (critical)
  - `p95_load_time > 3500ms` (high)
  - `retry_rate > 8%` (high)
  - `widget_ctr < 3%` (medium)
- Ilk 7 gun review cadence:
  - D+1: Veri butunlugu + event quality
  - D+3: Funnel sagligi + error dagilimi
  - D+7: KPI trend + sprint backlog karar listesi

## 8) Uygulama Notu

Numerology event schema referansi:
- `docs/analytics/numerology-events.md`

Bu dashboard sablonu, mevcut implementasyondaki event/property isimleriyle uyumludur.
