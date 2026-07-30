# AstroGuru — Guideline 4.3(b) Yeniden Gönderim Paketi

Bu belge App Store Connect alanlarına kopyalanacak metinleri ve inceleme akışını tanımlar. Uygulamanın onaylanacağını garanti etmez. Gönderimden önce metinler, ekran görüntüleri, demo hesap ve production backend aynı build üzerinde son kez doğrulanmalıdır.

Apple kaynakları:

- [App Review Guidelines — 4.3 Spam](https://developer.apple.com/app-store/review/guidelines/#spam): 4.3(b), yaygın olarak bulunan uygulamalardan ayırt edilemeyen yeni gönderimleri ve “fortune telling” gibi doygun türleri, anlamlı biçimde farklı veya gelişmiş bir deneyim sunmadıkça kabul etmeyebileceğini belirtir.
- [App Review Guidelines — Before You Submit ve Accurate Metadata](https://developer.apple.com/app-store/review/guidelines/): eksiksiz demo erişimi, çalışan backend ve gerçeği yansıtan metadata ister.
- [App information reference](https://developer.apple.com/help/app-store-connect/reference/app-information/app-information): subtitle en fazla 30 karakterdir.
- [Platform version information](https://developer.apple.com/help/app-store-connect/reference/app-information/platform-version-information): promotional text en fazla 170, description en fazla 4000 karakterdir; Review Notes alanı 4000 byte sınırındadır ve demo hesabı süresi dolmamalıdır.
- [App Review ve appeals](https://developer.apple.com/app-store/review/): önce App Store Connect üzerinden açıklama ve yeniden gönderim; yanlış anlaşılma sürerse tek, somut ve kanıta dayalı App Review Board itirazı önerilir.

## 1. Red nedeni

Apple, önceki binary/metadata/ilk ekran deneyimini esas olarak astroloji, günlük burç ve burç raporu kategorisinde değerlendirmiş; bu deneyimin App Store’da yaygın bulunan benzer uygulamalardan anlamlı biçimde ayrışmadığı sonucuna varmıştır.

Kök sorun astroloji işlevlerinin varlığı değil, ilk değer önerisinin ve ilk görünür ürün hiyerarşisinin bunları uygulamanın tamamı gibi göstermesidir. Yeniden gönderim astrolojiyi gizlemez. Astrolojiyi günlük planlama ve kişisel farkındalık araçlarına bağlam sağlayan katman olarak doğru biçimde konumlandırır.

## 2. Yeni ürün konumlandırması

AstroGuru; kişiselleştirilmiş günlük planlama, uygulanabilir aksiyonlar, hatırlatıcılar, yapılandırılmış karar desteği, rüya günlüğü, manevi pratik takibi ve zaman içindeki kişisel aktivite özetini tek yerde sunan bir kişisel gelişim uygulamasıdır.

Astrolojik harita, transit, burç, numeroloji ve uyum modülleri korunur. Bunlar kesin sonuç veya gelecek vaadi olarak değil; kullanıcının planlama ve düşünme deneyimine kişisel bağlam sağlayan ikincil içgörüler olarak sunulur.

## 3. Yapılan farklılaştırma değişiklikleri

- Home’un ilk görünümüne gerçek `daily actions` verisinden beslenen “Today’s Personal Plan / Bugünkü Kişisel Planın” kartı eklendi.
- Günlük aksiyonlar Home’dan ve tam plan ekranından tamamlanabilir; optimistic update, rollback, hata ve yeniden deneme durumları korunur.
- Tam plan ekranında her aksiyon için faydalı/geliştir geri bildirimi mevcut feedback API’sine gönderilir.
- Cosmic Planner tarih, kategori, günlük öneri ve izin kontrollü reminder akışlarıyla ilk seviye planlama aracı olarak öne çıkarıldı.
- Decision Compass Home ve Discover’da görünürleştirildi. Mevcut sürüm, kullanıcının bir yaşam kategorisini seçip yapılandırılmış günlük bağlamı farklı açılardan incelemesini sağlar. Serbest karar metni girişi veya kayıtlı karar geçmişi bu build’de yoktur ve metadata’da iddia edilmez.
- Dream Journal, kullanıcı tarafından oluşturulan başlık/tarih/rüya metni ve geçmiş kayıtların yeniden incelenmesi etrafında konumlandırıldı; AI değerlendirmesi kayıt deneyiminin ikincil katmanıdır.
- Dua, Esma/sayaç, rutin ve journal verileri manevi pratik takibi olarak görünürleştirildi.
- “My Journey / Yolculuğum” ekranı yalnızca gerçekten hesaplanabilen verileri gösterir: bugünkü tamamlanan aksiyonlar, rüya kayıtları, pratik kayıtları, aktif günler, seri ve son aktivite.
- Discover; Daily Life, Self Discovery, Relationships, Spiritual Practices ve Astrological Insights olarak yeniden gruplandı.
- İlk onboarding mesajları plan, karar/journal farkındalığı ve rutin takibiyle başlar. Doğum bilgilerinin kişisel astrolojik bağlam için kullanıldığı açıklanır.
- Daily Transits, “Today’s Plan / Bugünkü Planın” olarak sunulur ve önerilerin kesin sonuç veya profesyonel tavsiye olmadığı açıkça belirtilir.
- Ana route’lar ve deep link’ler korunmuştur; My Journey, Home’dan erişilen gizli tab route’udur.

## 4. Reviewer için test adımları

Production backend ve aşağıdaki test hesabı aktifken fiziksel iPhone’da:

1. Uygulamayı açın ve demo hesabıyla giriş yapın.
2. Home’un üstünde `Today’s Personal Plan` kartını görün.
3. `View Plan` ile tam planı açın; bir aksiyonu tamamlayın.
4. Aynı aksiyon için `Helpful` veya `Improve` geri bildirimi gönderin.
5. Home’daki Planner kısayolundan veya `Discover > Daily Life > Cosmic Planner` üzerinden planlayıcıyı açın.
6. Bir tarih ve kategori seçin; gelecekteki bir saat için reminder oluşturun. Bildirim izni istenirse izin verin.
7. `Discover > Daily Life > Decision Compass` ekranını açın; bir kategori kartını seçerek yapılandırılmış değerlendirmeyi ve detay ekranını inceleyin.
8. `Discover > Self Discovery > Dream Journal` ekranını açın; önceden oluşturulmuş kayıtları görün ve yeni bir kayıt oluşturun.
9. `Discover > Spiritual Practices` altında bir pratik/sayaç açın, ilerleme kaydedin ve journal geçmişini görün.
10. Home’daki `My Journey` kartını açın; gerçek aksiyon, rüya ve pratik özetini görün.
11. İkincil astrolojik bağlam için Home’un daha altındaki transit/harita alanını veya `Discover > Astrological Insights` bölümünü açın.
12. İlişki karşılaştırması için `Discover > Relationships > Compatibility` alanına girin; demo hesaptaki kayıtlı ikinci profili seçip mevcut ilişki türleri üzerinden değerlendirmeyi açın.

## 5. App Review Notes

App Store Connect’e aşağıdaki İngilizce metin yapıştırılabilir. Köşeli parantezler gönderimden önce doldurulmalıdır.

```text
IMPORTANT — GUIDELINE 4.3(b) DIFFERENTIATION

AstroGuru is a personalized daily planning, journaling, structured decision-support, and spiritual-practice application. Astrology is one personalization context and is not the complete app experience.

Please review these interactive flows:

1. Home > Today’s Personal Plan
- View personalized daily actions.
- Tap View Plan, mark an action completed, and submit Helpful/Improve feedback.

2. Home > Planner, or Discover > Daily Life > Cosmic Planner
- Select a date and category.
- Review recommendations and create a reminder.

3. Discover > Daily Life > Decision Compass
- Select a real-life category such as work or relationships.
- Review its structured context and detail view. This build does not claim free-text decision entry or saved decision history.

4. Discover > Self Discovery > Dream Journal
- Review previous personal entries and create a new dated entry.
- AI interpretation is secondary to the user’s journal record.

5. Discover > Spiritual Practices
- Use prayer/Esma counters or routines and save progress to the personal journal.

6. Home > My Journey
- Review real completed actions, dream entries, practice records, active days, and streak data available for the demo account.

7. Discover > Relationships > Compatibility
- Use the seeded second profile to review the available relationship comparison dimensions.

Astrology reports remain available under Astrological Insights and lower on Home as contextual information. They are not presented as guaranteed predictions.

Demo account: [REVIEW_ACCOUNT_EMAIL]
Password: [REVIEW_ACCOUNT_PASSWORD]
Premium/test entitlement: [ENABLED — INCLUDE ENTITLEMENT NAME AND EXPIRY]
Seeded second profile: [PROFILE DISPLAY NAME]
Notification test note: [PHYSICAL DEVICE / PERMISSION STATE]

A [DURATION]-second physical-device recording demonstrating these flows is attached in App Review Information. The production backend will remain available throughout review.
```

## 6. App Store subtitle önerileri

Apple’ın 30 karakter sınırı doğrulanmıştır.

Önerilen:

- English: `Daily Plan & Personal Growth` — 28 karakter
- Türkçe: `Günlük Plan ve Kişisel Gelişim` — 30 karakter

Alternatif:

- English: `Plan, Reflect, Grow` — 19 karakter
- Türkçe: `Planla, Düşün, Geliş` — 20 karakter

`Personal Growth & Daily Planner` 31 karakter olduğu için kullanılmamalıdır.

## 7. Promotional text

Her iki öneri de 170 karakter sınırının altındadır.

English — 153 karakter:

```text
Plan your day with personalized actions, compare decisions, set reminders, keep a dream journal, and track spiritual practices—with astrology as context.
```

Türkçe — 148 karakter:

```text
Gününü kişisel aksiyonlarla planla; kararlarını değerlendir, hatırlatıcı kur, rüyalarını kaydet ve manevi pratiklerini astrolojik bağlamla takip et.
```

## 8. Description’ın ilk paragrafı

English:

```text
AstroGuru transforms personalized insights into practical daily actions. Plan your day, review important choices through structured perspectives, record dreams, track personal practices, and build an evolving journey in one place. Astrology remains available as personal context rather than a guaranteed prediction.
```

Türkçe:

```text
AstroGuru, kişiselleştirilmiş içgörüleri uygulanabilir günlük adımlara dönüştürür. Gününü planla, önemli seçimlerini yapılandırılmış bakış açılarıyla değerlendir, rüyalarını kaydet, kişisel pratiklerini takip et ve gelişen yolculuğunu tek yerde sürdür. Astroloji, kesin tahmin değil kişisel bağlam olarak sunulur.
```

Açıklamanın devamında gerçek modüller dürüstçe listelenmelidir: Personal Plan, Cosmic Planner/reminders, Decision Compass’ın mevcut kategori temelli değerlendirmesi, Dream Journal, Spiritual Practices, My Journey, Compatibility, natal chart, horoscope, transits ve numerology. Premium veya Guru gerektiren içerikler ayrıca belirtilmelidir.

## 9. Screenshot sırası ve başlıkları

Ekranlarda gerçek demo verisi kullanılmalı; gerçek kişiye ait ad, rüya veya doğum verisi gösterilmemelidir. İlk üç görsel yalnızca burç ya da doğum haritası olmamalıdır.

1. Home — Today’s Personal Plan  
   EN: `Turn daily insights into action`  
   EN alt: `Start each day with a personalized and practical plan.`  
   TR: `Günlük içgörüleri aksiyona dönüştür`  
   TR alt: `Her güne kişisel ve uygulanabilir bir planla başla.`

2. Cosmic Planner — tarih, kategori ve reminder  
   EN: `Plan meaningful moments`  
   TR: `Önemli anlarını planla`

3. Decision Compass — kategori kartları ve yapılandırılmış değerlendirme  
   EN: `Reflect before you decide`  
   TR: `Karar vermeden önce değerlendir`

4. My Journey — aksiyon, rüya, pratik ve seri özeti  
   EN: `Build your personal journey`  
   TR: `Kişisel yolculuğunu oluştur`

5. Dream Journal — kullanıcı kaydı ve geçmiş  
   EN: `Capture dreams and reflections`  
   TR: `Rüyalarını ve düşüncelerini kaydet`

6. Spiritual Practices — rutin/sayaç/journal  
   EN: `Create routines that support you`  
   TR: `Seni destekleyen rutinler oluştur`

7. Daily Transits veya Natal Chart — ikincil kişisel bağlam  
   EN: `Explore your astrological context`  
   TR: `Astrolojik bağlamını keşfet`

## 10. App Review’a gönderilecek cevap

```text
Hello App Review Team,

Thank you for the Guideline 4.3(b) feedback. We reviewed both the product experience and metadata and submitted a materially revised build.

AstroGuru’s primary experience is now clearly presented as personalized daily planning, actionable recommendations, reminders, structured decision reflection, journaling, spiritual-practice tracking, and a real personal activity summary. Astrology has not been hidden or removed; it is accurately presented as contextual personalization rather than the entire product or a guaranteed prediction.

The first Home experience now starts with an interactive Today’s Personal Plan. Reviewers can complete an action, send feedback, plan a date and reminder in Cosmic Planner, inspect a category in Decision Compass, create and revisit Dream Journal entries, save spiritual-practice progress, and review actual activity in My Journey.

We included exact navigation steps, a non-expiring fully entitled demo account, seeded test data, and a physical-device recording in App Review Information. The production backend will remain available during review.

We respectfully ask that you review the new binary and the interactive flows described in the Review Notes. We are available to provide any additional clarification.

Thank you.
```

## 11. App Review Board itiraz metni

Bu metin, yeni build ve ayrıntılı Review Notes incelendikten sonra 4.3(b) değerlendirmesi değişmezse kullanılmalıdır. Apple aynı başarısız gönderim için tek appeal önerdiğinden önce App Store Connect görüşmesi tamamlanmalıdır.

```text
Subject: Appeal of Guideline 4.3(b) Decision — AstroGuru [APP ID / SUBMISSION ID]

Dear App Review Board,

We respectfully appeal the Guideline 4.3(b) decision because the revised submission may have been understood as a conventional horoscope or fortune-telling app, while its primary, demonstrable product experience is materially different.

The submitted binary opens with an interactive personal daily plan backed by user-specific actions. A reviewer can complete actions with rollback-safe persistence, send recommendation feedback, select dates and categories in Cosmic Planner, schedule reminders through the native notification flow, review structured decision perspectives, create and revisit personal dream records, save spiritual-practice progress, and see actual accumulated activity in My Journey.

Astrology features remain transparently available as contextual personalization. The app does not hide them, and it does not claim guaranteed outcomes. The revised onboarding, Home hierarchy, Discover grouping, in-app disclosures, screenshots, subtitle, promotional text, and description all consistently present planning, reflection, journaling, and practice tracking as the core experience.

The non-expiring demo account [EMAIL] has [PREMIUM ENTITLEMENT] and seeded data for every documented flow. A physical-device recording [ATTACHMENT NAME] shows the complete path in [DURATION] seconds. The production backend is active.

We believe these interactive, persistent, user-created and action-oriented workflows constitute a meaningfully different and improved experience under Guideline 4.3(b). We request review of the revised binary and evidence, and would welcome specific guidance if any documented flow could not be accessed.

Sincerely,
[LEGAL ENTITY / DEVELOPER NAME]
[CONTACT EMAIL]
[PHONE]
```

## 12. Demo hesap ve test verisi placeholder’ları

- App name: `AstroGuru`
- Bundle ID: `com.astroguru.mmc`
- App ID: `[APP_STORE_APP_ID]`
- Version/build: `[VERSION] ([BUILD])`
- Submission ID: `[SUBMISSION_ID]`
- Reviewer email: `[REVIEW_ACCOUNT_EMAIL]`
- Reviewer password: `[REVIEW_ACCOUNT_PASSWORD]`
- Account expiry: `Never / [DATE]`
- Email verification state: `Verified`
- Premium entitlement: `[ENTITLEMENT_NAME]`
- Premium expiry: `[DATE AFTER EXPECTED REVIEW WINDOW]`
- Guru/token balance, gerekiyorsa: `[BALANCE]`
- Seeded birth profile: `[FICTIONAL NAME / DATE / TIME / CITY]`
- Seeded second compatibility profile: `[FICTIONAL NAME]`
- Seeded Dream Journal entries: `[COUNT]`
- Seeded spiritual journal entries: `[COUNT]`
- Notification permission başlangıcı: `[NOT DETERMINED / GRANTED]`
- Backend environment: `[PRODUCTION URL / HEALTHCHECK OWNER]`
- Support contact: `[NAME / EMAIL / PHONE]`
- Privacy Policy URL: `[URL]`
- Support URL: `[URL WITH CONTACT INFORMATION]`
- Screen recording: `[FILE NAME, DEVICE, iOS VERSION, DURATION]`
- Screenshot demo data confirmation: `[ALL DATA FICTIONAL — YES/NO]`
- Reviewer test tarihi/timezone: `[DATE / Europe-Istanbul OR ACCOUNT TIMEZONE]`

### 60–120 saniyelik fiziksel cihaz ekran kaydı

Hedef süre: 90 saniye.

1. 0–6 sn: Uygulamayı aç; Home üstündeki Today’s Personal Plan ve ilerlemeyi göster.
2. 6–17 sn: View Plan’a gir; bir aksiyonun detay metnini göster, aksiyonu tamamla.
3. 17–23 sn: Helpful/Improve feedback gönder.
4. 23–36 sn: Cosmic Planner’ı aç; farklı tarih ve kategori seç.
5. 36–45 sn: Gelecekteki bir saatle reminder oluştur; başarı mesajını göster.
6. 45–55 sn: Decision Compass’ı aç; kategori ve yapılandırılmış detay görünümünü göster. Serbest metin/kayıt iddiası kullanma.
7. 55–66 sn: Dream Journal geçmişini göster ve yeni kayıt composer’ını aç.
8. 66–76 sn: Spiritual Practices altında sayaç/rutin ilerlemesini ve journal kaydını göster.
9. 76–84 sn: Home > My Journey özetini göster.
10. 84–90 sn: Home’un altına veya Astrological Insights’a kaydır; astrolojik detayların korunmuş fakat ikincil bağlam olduğunu göster.

Kayıt sırasında paywall ana akışı kesmemelidir. Demo hesap premium erişim gerektiren Dream Journal/Compare alanlarına erişebilmeli; entitlement adı Review Notes’ta açıkça yazılmalıdır.

### Gönderim öncesi kısa kontrol

- Yeni binary ile metadata aynı ürün vaadini anlatıyor.
- Review Notes’taki her adım fiziksel cihazda çalışıyor.
- Demo hesabın e-postası doğrulanmış, şifresi ve entitlement’ı süresi dolmamış.
- Backend, notification ve IAP sandbox/production gereksinimleri inceleme boyunca açık.
- Ekran kaydı ve ekran görüntüleri bu build’e ait.
- Screenshot verilerinin tamamı kurgusal.
- Privacy labels, privacy policy, support URL, age rating ve IAP açıklamaları gerçek davranışla uyumlu.
