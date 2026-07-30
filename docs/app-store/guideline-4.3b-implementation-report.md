# Guideline 4.3(b) Farklılaştırma Uygulama Raporu

Tarih: 24 Temmuz 2026  
Uygulama: AstroGuru  
Bundle ID: `com.astroguru.mmc`

## 1. Kök Neden

Önceki ürün hiyerarşisi Home’un ilk görünümünde gökyüzü, burç ve transit içeriğini öne çıkarıyor; planlama, hatırlatıcı, karar desteği, kullanıcı günlüğü ve pratik takibi gibi etkileşimli farklılaştırıcılar alt seviyede kalıyordu. Bu sunum AstroGuru’nun App Store Guideline 4.3(b) kapsamında yaygın astroloji/fortune-telling uygulamalarıyla aynı kavramsal sınıfta değerlendirilmesini kolaylaştırıyordu.

Çözüm astrolojiyi gizlemek veya kaldırmak değildir. Uygulamanın gerçek, kalıcı ve etkileşimli değerini ilk seviyeye taşımak; astrolojik veriyi bu araçların kişisel bağlam katmanı olarak doğru biçimde sunmaktır.

## 2. Mevcut Mimari Analizi

İncelenen ana bounded context ve veri kaynakları:

- Home: `mysticai-mobile/src/screens/HomeScreen.tsx`; tab dosyası yalnızca bu ekranı pager üzerinden kullanır.
- Günlük plan:
  - `GET /api/v1/daily/transits/actions`
  - `POST /api/v1/daily/transits/actions/{id}/done`
  - `POST /api/v1/feedback`
  - Mobil servis: `mysticai-mobile/src/services/daily.service.ts`
  - React Query anahtarları kullanıcı scope’u içerir.
- Daily Transits: `mysticai-mobile/src/app/(tabs)/daily-transits.tsx`; hero, summary, mini plan, sky data ve teknik transit kartlarını mevcut backend DTO’sundan üretir.
- Cosmic Planner: `mysticai-mobile/src/app/(tabs)/calendar.tsx`; tarih/kategori seçimi, backend push ve local notification fallback’i olan reminder akışı mevcuttur.
- Decision Compass: `mysticai-mobile/src/app/decision-compass.tsx`; günlük cosmic summary ve day-detail verisinden kategori temelli yapılandırılmış bağlam üretir. Serbest karar metni ve karar geçmişi modeli yoktur.
- Dream Journal:
  - Ekran: `mysticai-mobile/src/app/(tabs)/dreams.tsx`
  - Store: `mysticai-mobile/src/store/useDreamStore.ts`
  - Backend kayıtları kullanıcı, tarih, başlık, metin, durum, sembol ve yorum verilerini içerir.
- Spiritual Practices:
  - `mysticai-mobile/src/spiritual/screens/*`
  - Kullanıcı scope’lu persisted Zustand journal; tamamlanan miktar, hedef, süre, tarih ve seri hesapları mevcuttur.
- Discover:
  - CMS-first ekran: `mysticai-mobile/src/app/(tabs)/discover.tsx`
  - Static fallback: `mysticai-mobile/src/features/discover/catalog.ts`
  - CMS seed: `notification-service/.../CmsBootstrapService.java`
- Analytics: mevcut `trackEvent` servisi ve snake_case event sözleşmesi genişletildi; eski event’ler silinmedi.
- Tema/i18n: mevcut ThemeContext ve `en.json`/`tr.json` kullanıldı.
- Navigation: mevcut beş ana tab ve deep link’ler korundu. Yeni Journey route’u görünmez tab screen olarak Home’dan açılır.

## 3. Yapılan Ürün Değişiklikleri

### Home ve Personal Plan

- Greeting altına kullanıcının mevcut burç bağlamını açıklayan kısa, ikincil metin eklendi.
- Home’un ilk ürün kartı gerçek daily-actions API’sinden beslenen `Today’s Personal Plan / Bugünkü Kişisel Planın` oldu.
- Kart; tarih, kişisel tema, ilk üç aksiyon, tamamlanma oranı, doğrudan tamamla/geri al, tam plan ve planner CTA’larını içerir.
- Loading, empty, error, retry ve optimistic rollback davranışları eklendi.
- Transit/sky hero daha aşağı taşındı; astroloji korunurken ilk ekranı domine etmesi engellendi.
- Gerçek aksiyon/pratik/seri verisinden Journey preview eklendi.

### Daily Plan ve Daily Transits

- Tam plan ekranı kişisel plan diliyle güncellendi.
- Aksiyon tamamlamada mevcut API ve optimistic rollback korundu.
- Aksiyon feedback’i mevcut feedback API’sine gönderilir.
- Daily Transits başlığı `Today’s Plan / Bugünkü Planın` oldu.
- Ekranın başına önerilerin kesin gelecek sonucu veya profesyonel tavsiye olmadığına dair iki dilli açıklama eklendi.
- Mevcut hero, odak, mini plan, sky data ve teknik transit detayları korunmuştur.

### Cosmic Planner ve Decision Compass

- Planner Home ve Discover’ın Daily Life grubunda ilk seviye erişimdedir.
- Tarih, kategori ve başarılı reminder oluşturma adımları yeni ürün analitiğiyle ölçülür.
- Permission/backend push/local fallback akışı değiştirilmedi.
- Decision Compass Home ve Discover’da görünürdür.
- Mevcut gerçek davranış kategori temelli yapılandırılmış değerlendirmedir. Uygulamada olmayan serbest metin ve kayıtlı karar geçmişi onboarding/Review Notes’ta iddia edilmez.
- Eski tutorial’daki desteklenmeyen “karar girişi” ve “sonucu kaydet” ifadeleri gerçek davranışa göre düzeltildi.

### Dream, Spiritual ve Journey

- Dream Journal açılışı ve başarılı kullanıcı kaydı ölçülür; rüya metni analytics’e gönderilmez.
- Spiritual home ve gerçek journal save noktalarında açılış/tamamlama event’leri eklendi; dua veya pratik içeriği analytics’e gönderilmez.
- Yeni `My Journey / Yolculuğum` ekranı:
  - bugünkü tamamlanan daily actions,
  - backend Dream Journal kayıt sayısı,
  - persisted spiritual practice kayıt sayısı,
  - kaynaklardaki gerçek tarihlerin birleşiminden aktif gün,
  - mevcut spiritual streak,
  - gerçek son aktivite tarihi
  gösterir.
- Veri yoksa yönlendirici empty state; dream fetch başarısızsa partial-data uyarısı gösterir. Sahte seri veya hard-coded istatistik yoktur.

### Discover, onboarding ve metadata dili

- Discover grupları `Daily Life`, `Self Discovery`, `Relationships`, `Spiritual Practices`, `Astrological Insights` olarak yeniden kuruldu.
- Static fallback ve Türkçe CMS seed aynı hiyerarşiye taşındı.
- Admin tarafından değiştirilmemiş eski seed kartları yeni gruplara güvenli biçimde taşınır; admin düzenlemeleri üzerine yazılmaz.
- Global onboarding’in ilk üç mesajı günlük plan, karar/journal farkındalığı ve rutin takibi olarak güncellendi.
- Welcome ve doğum bilgisi açıklamaları kişisel bağlamı açıklar; kesin tahmin iddiası içermez.
- Yeni kullanıcı metinleri Türkçe ve İngilizce eklendi.

## 4. Değiştirilen Dosyalar

Ana görev kapsamındaki dosyalar:

- `mysticai-mobile/src/components/Home/PersonalPlanCard.tsx` — yeni
- `mysticai-mobile/src/components/Home/JourneyPreviewCard.tsx` — yeni
- `mysticai-mobile/src/components/Home/GreetingRow.tsx`
- `mysticai-mobile/src/screens/HomeScreen.tsx`
- `mysticai-mobile/src/app/(tabs)/journey.tsx` — yeni
- `mysticai-mobile/src/app/(tabs)/_layout.tsx`
- `mysticai-mobile/src/components/ui/surfaceUtils.ts`
- `mysticai-mobile/src/app/(tabs)/today-actions.tsx`
- `mysticai-mobile/src/app/(tabs)/daily-transits.tsx`
- `mysticai-mobile/src/app/(tabs)/calendar.tsx`
- `mysticai-mobile/src/app/decision-compass.tsx`
- `mysticai-mobile/src/app/(tabs)/dreams.tsx`
- `mysticai-mobile/src/spiritual/screens/SpiritualHomeScreen.tsx`
- `mysticai-mobile/src/spiritual/screens/CounterScreen.tsx`
- `mysticai-mobile/src/app/(tabs)/discover.tsx`
- `mysticai-mobile/src/features/discover/catalog.ts`
- `mysticai-mobile/src/features/discover/discoverVisuals.ts`
- `mysticai-mobile/src/features/tutorial/registry/tutorialRegistry.ts`
- `mysticai-mobile/src/features/tutorial/registry/tutorialRegistry.en.ts`
- `mysticai-mobile/src/app/(auth)/welcome.tsx`
- `mysticai-mobile/src/i18n/en.json`
- `mysticai-mobile/src/i18n/tr.json`
- `mysticai-mobile/scripts/qa/guideline-4.3b-static-qa.mjs` — yeni
- `mysticai-mobile/package.json`
- `notification-service/src/main/java/com/mysticai/notification/admin/service/CmsBootstrapService.java`
- `docs/app-store/guideline-4.3b-resubmission.md` — yeni
- `docs/app-store/guideline-4.3b-implementation-report.md` — yeni

Repository’de bu görevden önce var olan auth, Apple Sign-In, monetization, environment ve native proje değişikliklerine dokunulmamış veya geri alınmamıştır.

## 5. Backend Değişiklikleri

- Yeni Journey endpoint’i eklenmedi. Güvenilir biçimde erişilebilen mevcut remote/local kaynaklar yeterli olduğu için paralel bir API ve veri modeli oluşturulmadı.
- Daily Actions, done ve feedback API sözleşmeleri değişmedi.
- `CmsBootstrapService` yeni beş Discover kategorisini ve gerçek route’lara bağlı kartları seed eder.
- Seed güncellemesi idempotenttir.
- `updatedByAdminId == null` olan varsayılan kartlar yeni ürün gruplarına taşınır ve seed metinleri güncellenir.
- Admin tarafından düzenlenen kartların içerik/kategori seçimi korunur.
- Eski category kayıtları veri kaybını önlemek için silinmez; kartı olmayan kategori mobilde gösterilmez.

## 6. Analytics Değişiklikleri

Eklenen ana event’ler:

- `home_personal_plan_impression`
- `home_personal_plan_opened`
- `personal_plan_viewed`
- `personal_plan_action_opened`
- `personal_plan_action_completed`
- `personal_plan_feedback_opened`
- `personal_plan_feedback_sent`
- `personal_plan_retry_clicked`
- `cosmic_planner_opened`
- `planner_date_selected`
- `planner_category_selected`
- `planner_reminder_created`
- `cosmic_planner_reminder_created`
- `decision_compass_opened`
- `decision_compass_started`
- `dream_journal_opened`
- `dream_entry_created`
- `spiritual_practice_opened`
- `spiritual_practice_completed`
- `journey_summary_opened`
- `journey_module_opened`
- `astrology_context_opened`

Koruma kuralları:

- Var olan event’ler silinmedi.
- Karar metni, rüya içeriği, dua/pratik içeriği, ad, e-posta veya doğum bilgisi gönderilmez.
- Parametreler source/surface/module/category/locale/result ve anonim teknik action identifier’larıyla sınırlandırıldı.

## 7. App Store Dokümanları

`docs/app-store/guideline-4.3b-resubmission.md` içinde:

- red nedeni ve yeni konumlandırma,
- gerçek ürün değişiklikleri,
- reviewer test adımları,
- App Review Notes,
- Apple limitlerine uygun EN/TR subtitle,
- 170 karakter altı promotional text,
- EN/TR description başlangıcı,
- yedi ekranlık EN/TR screenshot planı,
- App Review cevabı,
- koşullu App Review Board appeal metni,
- demo hesap/test verisi placeholder’ları,
- 90 saniyelik fiziksel cihaz kayıt senaryosu
hazırlanmıştır.

Doküman Apple’ın güncel resmi Guideline 4.3(b), metadata limitleri, Review Notes ve appeal kaynaklarına bağlantı verir.

## 8. Test Sonuçları

| Kontrol | Sonuç | Not |
|---|---|---|
| TypeScript strict typecheck | Başarılı | `npx tsc --noEmit` |
| Lokalizasyon JSON | Başarılı | `jq empty src/i18n/en.json src/i18n/tr.json` |
| Guideline 4.3(b) static QA | Başarılı | Dil anahtarları, loading/error/empty durumları, route’lar, event’ler, hassas payload dışlama, subtitle limitleri ve doküman bölümleri |
| Web export | Başarılı | `npm run build:web`, 3980 modül |
| Notification service compile | Başarılı | Java 21, 251 source |
| Notification service tests | Başarılı | 174 test, 0 failure/error/skipped |
| Android debug compile | Başarılı | `:app:assembleDebug`, 693 task |
| iOS simulator compile | Ortam nedeniyle tamamlanamadı | Uygulama source compile hatası raporlanmadan `expo-dev-launcher/Assets.xcassets` için `AssetCatalogSimulatorAgent` CoreSimulator FIFO handshake hatası oluştu. Generic simulator, booted iPhone 16 Pro, sandbox dışı ve device SDK denemelerinde aynı yerel Xcode/CoreSimulator hatası tekrarlandı. |
| ESLint | Çalıştırılamadı | Projede ESLint dependency/config/script yok. |
| React Native component unit test | Static QA ile karşılandı | Projede Jest/Vitest/Testing Library test runner’ı tanımlı değil; bağımlılık ekleyip lockfile kapsamını büyütmek yerine tekrar çalıştırılabilir sözleşme QA’sı eklendi. |

iOS hata özeti:

```text
Failed to launch AssetCatalogSimulatorAgent via CoreSimulator spawn
Failed to open FIFOs for handshaking with platform tool
Recovery Suggestion: Try restarting your computer
```

Bu sonuç release öncesi temiz bir macOS/Xcode oturumunda iOS archive veya simulator build gereksinimini ortadan kaldırmaz.

## 9. Bilinen Eksikler veya Riskler

- Guideline 4.3(b) yoruma dayalıdır; ürün ve metadata değişiklikleri onay garantisi vermez.
- App Store Connect metadata’sı bu çalışma kapsamında uzaktan değiştirilmedi.
- Demo hesap, premium entitlement, seeded fictional data ve fiziksel cihaz videosu insan tarafından hazırlanmalıdır.
- Decision Compass bu build’de serbest metin seçenek/öncelik girişi veya kayıtlı karar geçmişi sunmaz. Review Notes bu sınırı açıkça belirtir.
- Journey uzun dönem daily-action toplamı yerine mevcut API’nin güvenilir biçimde sağladığı bugünkü tamamlanma sayısını gösterir. Dream ve spiritual geçmişi mevcut store kaynaklarından hesaplanır.
- CMS’te admin tarafından özellikle eski kategoride bırakılmış kartlar korunur; release öncesi production CMS admin görünümü kontrol edilmelidir.
- iOS compile yerel CoreSimulator/AssetCatalog servis sorunu nedeniyle doğrulanamadı. Mac yeniden başlatma/CoreSimulator servis yenileme sonrası tekrar denenmelidir.
- Fiziksel iPhone ve iPad’de light/dark theme, Dynamic Type, küçük ekran, permission-denied reminder, offline ve expired-auth manuel regresyonu hâlâ gereklidir.
- Android build’de mevcut üçüncü taraf Google Play Services/Amazon SDK D8 stack-map ve Gradle deprecation uyarıları vardır; build’i başarısız etmemiştir.

## 10. App Review İçin Son Kontrol Listesi

- [ ] Temiz macOS/Xcode oturumunda iOS Release archive veya en az simulator build başarılı.
- [ ] Fiziksel iPhone ve iPad smoke testi tamamlandı.
- [ ] Light/dark, TR/EN, Dynamic Type ve küçük ekran kontrol edildi.
- [ ] Production backend ve health kontrolleri review penceresi boyunca açık.
- [ ] CMS’te yalnızca hedeflenen beş ürün grubu ve doğru route’lar görünür.
- [ ] Demo hesap doğrulanmış ve süresiz/inceleme süresini aşan erişime sahip.
- [ ] Demo hesapta premium entitlement/Guru erişimi, ikinci uyum profili, dream ve spiritual test verileri hazır.
- [ ] Bildirim izni ve gelecekteki saatle reminder akışı fiziksel cihazda çalışıyor.
- [ ] App Store subtitle, promotional text, description, keywords ve screenshots yeni ürün hiyerarşisiyle uyumlu.
- [ ] Premium/IAP gerektiren screenshot ve açıklamalar ek satın alma gereksinimini doğru gösteriyor.
- [ ] Review Notes placeholder’ları dolduruldu ve 4000 byte sınırı yeniden kontrol edildi.
- [ ] 60–120 saniyelik fiziksel cihaz videosu App Review Information’a eklendi.
- [ ] Screenshot verilerinin tamamı kurgusal ve 4+ metadata sunumuna uygun.
- [ ] Privacy labels, Privacy Policy URL, Support URL ve contact bilgileri güncel.
- [ ] App Review’a önce somut yeniden gönderim cevabı verildi.
- [ ] Yanlış anlaşılma devam ederse aynı başarısız submission için yalnızca bir App Review Board appeal gönderilecek.
