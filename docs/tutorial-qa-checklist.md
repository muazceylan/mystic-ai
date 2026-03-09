# Tutorial QA Checklist (Sprint 4)

## Scope
- Global onboarding + core modules
- Secondary modules (`Dreams`, `Numerology`, `Name Analysis`, `Spiritual Practice`, `Profile`)
- Tutorial Management Center (`Rehber Merkezi`)
- Reset / reopen / dismiss preference behavior
- Remote config + cache + local fallback
- Contract/validation governance (backend + admin)

## Preconditions
- Test user kayıt/onboarding akışını tamamlamış olmalı.
- Admin panelde en az 1 yayınlanmış tutorial config bulunmalı.
- Secondary module ekranları erişilebilir olmalı.
- Analytics/debug gözlemi açık olmalı.

## Functional checks
1. First app open onboarding
- Yeni kullanıcıda global onboarding otomatik açılır.
- `Skip` ve `Finish` düzgün çalışır.
- Aynı versiyonda tekrar otomatik açılmaz.
- Versiyon artırıldığında tekrar eligibility oluşur.

2. First-visit tutorials (core + secondary)
- İlk girişte aşağıdaki ekranlarda tutorial tetiklenir:
  - `Home`, `Daily Transits`, `Cosmic Planner`, `Decision Compass`, `Compatibility`
  - `Dreams`, `Numerology`, `Name Analysis`, `Spiritual Practice`, `Profile`
- Aynı versiyonda ekrana tekrar girildiğinde otomatik tetik tekrar etmez.

3. Manual reopen
- Her entegre ekranda manual reopen entry çalışır.
- Reopen sonrası step akışı baştan başlar.

## Tutorial Management Center checks
1. Visibility
- `Profile` içinden `Rehber Merkezi` açılır.
- Açılışta tutorial listesi gruplu görünür:
  - `Genel`
  - `Ana Modüller`
  - `Diğer Modüller`

2. Item details
- Her item’da şu alanlar görünür:
  - ad
  - screen
  - durum (`completed`, `skipped`, `not_started`, `dismissed`)
  - version
  - son görülme zamanı

3. Item actions
- `Tekrar Aç` doğru tutorialı açar.
- `İlerlemesini Sıfırla` confirm sonrası progress’i temizler.
- `Bir daha gösterme` toggle aç/kapat çalışır.

4. Global actions
- `Global Onboarding’i Gör` onboarding’i manual reopen eder.
- `Tümünü Sıfırla` confirm sonrası tüm tutorial progress’i temizler.

## Reset / dismiss behavior checks
1. Single reset
- Tek tutorial reset sonrası durum `not_started` olur.
- İlgili first-visit eligibility yeniden çalışır.

2. Bulk reset
- Tüm tutorial reset sonrası tüm statüler sıfırlanır.

3. Dismiss enabled
- `Bir daha gösterme` açıkken otomatik tetikleme engellenir.
- Manual reopen yine çalışır.

4. Dismiss disabled
- Toggle kapatılınca tutorial tekrar eligible olur.

## Config source / resilience checks
1. Remote success
- Remote config başarılıysa source `remote`/`cache` olarak gözlenir.

2. Cache fallback
- Remote hata senaryosunda son valid cache devreye girer.

3. Local fallback
- Remote + cache yoksa local static config çalışır.

4. Invalid target
- targetKey ekranda bulunamazsa uygulama çökmez.
- Fallback card policy ile akış güvenli devam eder.

## Contract / governance checks
1. Backend validation
- Desteklenmeyen `screenKey` veya `targetKey` ile create/update/publish bloklanır.

2. Admin contract source
- Form `screenKey` ve `targetKey` seçeneklerini contract endpoint ile alır (fallback destekli).

3. Publish guardrail
- Publish modalında validation summary ve impact bilgisi görünür.
- Bloklayıcı hata varken publish pasif kalır.

4. Diff awareness
- Edit modunda draft vs saved farkları görünür:
  - değişen alanlar
  - değişen step’ler
  - eklenen/silinen step’ler

## Analytics checks
Aşağıdaki eventler en az bir akışta gözlenmeli:
- `tutorial_started`
- `tutorial_step_viewed`
- `tutorial_next_clicked`
- `tutorial_skipped`
- `tutorial_completed`
- `tutorial_reopened`
- `tutorial_management_center_opened`
- `tutorial_reset_clicked`
- `tutorial_reset_confirmed`
- `tutorial_dismiss_toggled`
- `tutorial_reopen_clicked`
- `global_onboarding_reopened`
- `tutorial_config_fetch_started`
- `tutorial_config_fetch_succeeded`
- `tutorial_config_fetch_failed`

Parametre kontrolü:
- `tutorial_id`
- `tutorial_version`
- `screen_key`
- `source_screen`
- `entry_point`
- `config_source`
- `completion_state`
