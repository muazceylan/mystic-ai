# Mystic Admin Panel

Mystic AI platformunun yönetim paneli. Next.js 16 + React 19 + Tailwind CSS 4 ile geliştirilmiştir. Backend olarak `notification-service` (port 8088) ve isim yönetimi için `numerology-service` (port 8085) kullanır.

---

## Kurulum & Geliştirme

```bash
# Bağımlılıkları yükle
pnpm install

# Geliştirme sunucusunu başlat
pnpm dev
```

Uygulama varsayılan olarak `http://localhost:3000` adresinde çalışır.

### Ortam Değişkenleri

`.env.local` dosyası oluştur:

```env
NEXT_PUBLIC_API_URL=http://localhost:8088
NEXT_PUBLIC_AUTH_URL=http://localhost:8081
NUMEROLOGY_SERVICE_URL=http://localhost:8085
```

Prod ortamı için değerleri uygun şekilde güncelle.

---

## Mimari Genel Bakış

```
mystic-admin (Next.js)
    └── /api/admin/v1/**  →  notification-service:8088  (admin JWT ile korumalı)
    └── /api/v1/content/** →  notification-service:8088  (public, gateway üzerinden)
    └── /api/auth/admin/** →  auth-service:8081           (kullanıcı arama)
    └── /api/numerology/** →  numerology-service:8085      (name ingestion/review/admin)
```

### Rol Sistemi

| Rol | Yetkiler |
|-----|----------|
| `SUPER_ADMIN` | Her şey |
| `PRODUCT_ADMIN` | Modüller, Navigasyon, Route Registry, CMS (Burç & Dua), Audit Log |
| `NOTIFICATION_MANAGER` | Bildirimler, Dashboard |

---

## Sayfalar & Özellikler

### Dashboard (`/dashboard`)

Platform genelinde özet metrikler. 30 saniyede bir otomatik yenilenir.

- **Bildirimler:** Bugün oluşturulan / Planlanmış / Gönderilmiş / Başarısız
- **İçerik CMS:** Yayındaki günlük & haftalık burç sayısı, bu hafta eksik burç sayısı, yayındaki & öne çıkan dua sayısı
- **Modüller & Navigasyon:** Aktif/pasif/bakım modül, görünür tab sayısı
- **Routes & Yönetim:** Aktif/deprecated/stale route, admin kullanıcı sayısı
- Son 5 bildirim ve son 10 audit log

---

### Bildirimler (`/notifications`)

Admin tarafından oluşturulan toplu push/in-app bildirimlerin yönetimi.

**Liste sayfası:**
- Status, kategori, kanal, hedef kitle ve tarih aralığına göre filtreleme
- Sayfalama

**Detay sayfası (`/notifications/[id]`):**
- Durum: `DRAFT` → `SCHEDULED` → `SENT` / `FAILED` / `CANCELLED`
- **Planla:** Belirli bir tarih/saate gönderim zamanla
- **Test Gönder:** Belirli kullanıcı ID'lerine test bildirimi gönder
- **İptal Et:** Planlanmış bildirimi iptal et
- Gönderim hatası varsa kırmızı hata banner'ı gösterilir

**Yeni bildirim (`/notifications/new`):**
- Başlık, içerik, kategori, öncelik, kanal (PUSH / IN_APP / BOTH)
- Hedef kitle: `ALL_USERS` / `TEST_USERS` / `PREMIUM_USERS`
- Route key: derin bağlantı hedefi (dropdown ile seçilir)

**Otomatik Dispatch:**
Notification-service, her 60 saniyede bir planlanmış bildirimleri kontrol eder ve zamanı gelenleri otomatik gönderir. Aralık `ADMIN_NOTIF_DISPATCH_INTERVAL_MS` env değişkeni ile ayarlanabilir.

---

### Günlük Burç İçerikleri (`/daily-horoscopes`)

Harici API'den gelen günlük burç verilerinin DB'ye kaydedilmesi ve admin override yönetimi.

**Liste sayfası:**
- Burç, durum, dil ve tarih aralığına göre filtreleme
- Kaynak türü (EXTERNAL_API / ADMIN_CREATED / ADMIN_OVERRIDDEN) göstergesi
- Override aktif olanlar amber renkle belirtilir

**İngest Et:**
Astroloji servisini çağırarak seçilen burç + tarih + dil için veriyi DB'ye çeker. Admin override aktif olan kayıtlar güncellenmez.

**Detay sayfası (`/daily-horoscopes/[id]`):**
- Tüm alanları (genel yorum, aşk, kariyer, para, sağlık, şanslı renk/sayı) düzenle
- **Admin Override aktif et:** Bu içeriği API yanıtı yerine kullan
- Durum: DRAFT → Yayınla → Arşivle

---

### Haftalık Burç İçerikleri (`/weekly-horoscopes`)

Günlük burçla aynı mantık; ek olarak haftaya özel alanlar içerir.

**Ek alanlar:** Sosyal yorum, Şanslı Gün, Dikkat Günü

**Yeni İçerik (`/weekly-horoscopes/new`):**
Manuel olarak haftalık burç içeriği oluştur (kaynak: ADMIN_CREATED, durum: DRAFT).

---

### Dua İçerikleri (`/prayers`)

---

### Canonical Names (`/names`)

Approve edilmiş canonical isimler için admin liste ekranı:
- Server-side pagination (`page`, `size`)
- Arama (`q`)
- Filtreler: `status`, `gender`, `origin`, `hasTags`, `hasAliases`
- Durumlar: loading / empty / error / filled

Uygulama içindeki dua içeriklerinin tam CRUD yönetimi.

**Liste sayfası:**
- Durum, kategori, dil, öne çıkan/premium filtreleri
- Yıldız ikonuna tıklayarak öne çıkarma/kaldırma (satır içi)

**Detay sayfası (`/prayers/[id]`):**
- Başlık, Arapça metin, transkripsiyon, anlam
- Kategori: MORNING / EVENING / GRATITUDE / PROTECTION / HEALING / FORGIVENESS / GUIDANCE / ABUNDANCE / GENERAL
- Önerilen tekrar sayısı, etiketler (virgülle ayrılmış), ses URL
- Premium & Aktif toggle'ları
- Öne çıkar / kaldır (üst sağ yıldız butonu)

**Yeni Dua (`/prayers/new`):**
Tüm alanlarla yeni dua oluştur; DRAFT olarak kaydedilir.

---

### Modüller (`/modules`)

Mobil uygulama modüllerinin açma/kapama ve bakım modu yönetimi.

- `isActive` / `maintenanceMode` / `hiddenButDeepLinkable` toggle'ları
- `hiddenButDeepLinkable=true`: Tab bar'da görünmez ama derin bağlantı ile açılabilir
- `sortOrder` ile sıralama

---

### Navigasyon (`/navigation`)

Alt tab bar (footer) öğelerinin yönetimi.

- `isVisible` toggle ile göster/gizle
- Platform: IOS / ANDROID / BOTH
- `minAppVersion` ile minimum uygulama versiyonu zorunluluğu
- `isPremium` ile premium kullanıcılara özel

---

### Route Registry (`/routes`)

Uygulama route'larının merkezi kaydı ve mobil uygulamayla senkronizasyon.

**Route Sync (CI/CD):**

```bash
# Route manifestini oluştur (mysticai-mobile/src/app/ tarar)
pnpm generate:route-manifest

# Dry-run: ne değişecek gösterir, DB'ye yazmaz
ADMIN_API_URL=http://localhost:8088 ADMIN_API_TOKEN=xxx pnpm sync:routes:dry-run

# Gerçek senkronizasyon
ADMIN_API_URL=http://localhost:8088 ADMIN_API_TOKEN=xxx pnpm sync:routes:apply
```

- **DISCOVERED_UNREGISTERED:** Manifest'te var ama DB'de yok → kayıt oluştur
- **STALE:** DB'de var ama manifest'te yok → stale olarak işaretle
- Deprecated route'lar hiçbir zaman yeniden aktive edilmez

---

### Admin Kullanıcılar (`/admin-users`) — Yalnızca SUPER_ADMIN

Admin hesaplarının oluşturulması ve yönetimi.

- **Rol değişikliği** audit log'a yazılır
- **Şifre sıfırlama:** Yeni geçici şifre oluşturulur; `ADMIN_EMAIL_ENABLED=true` ise e-posta ile gönderilir
- **Son SUPER_ADMIN koruması:** Sistemdeki tek aktif SUPER_ADMIN deaktive edilemez
- Şifreler hiçbir zaman loglara yazılmaz

---

### Audit Logs (`/audit-logs`)

Tüm admin işlemlerinin değişmez kaydı.

- Aktör, aksiyon tipi, entity tipi ve tarih aralığına göre filtreleme
- Eski/yeni değer JSON'ları diff görünümünde

---

## İçerik Akışı (CMS)

```
Astroloji Servisi (live API)
    ↓  HoroscopeIngestService (notification-service)
    ↓  [isOverrideActive=false ise DB'ye upsert]
DB (weekly_horoscope_cms / daily_horoscope_cms)
    ↓
GET /api/v1/content/horoscope/daily?sign=ARIES&date=2026-03-08&locale=tr
    ↓
Mobil Uygulama (CMS → fallback: astrology-service live)
```

**Override modeli:**
- `isOverrideActive=false` → API verisi her ingest'te güncellenir
- `isOverrideActive=true` → Admin içeriği korunur, ingest skip edilir

**Dua akışı:**
```
Admin Panel → POST /api/admin/v1/prayers → DRAFT
           → POST /api/admin/v1/prayers/{id}/publish → PUBLISHED
           → GET /api/v1/content/prayers?locale=tr → Mobil
```

---

## Route Sync Script Kurulumu

`scripts/tsconfig.json` ayrı bir TypeScript konfigürasyonu kullanır:

```bash
cd mystic-admin
pnpm add -D ts-node @types/node  # ilk kurulumda gerekebilir
```

Script'ler için gerekli env değişkenleri:

```env
ADMIN_API_URL=http://localhost:8088
ADMIN_API_TOKEN=<admin-jwt-token>
```

---

## Geliştirme Notları

### Yeni CMS Alanı Eklemek

1. `notification-service/entity/cms/` altındaki entity'e alan ekle
2. İlgili service'e (update metodu) alanı ekle
3. `mystic-admin/src/types/index.ts` interface'ini güncelle
4. Admin panel form'una input ekle

### Yeni Audit ActionType Eklemek

1. `AuditLog.java` → `ActionType` enum'a ekle
2. `AuditLog.java` → Gerekirse `EntityType` enum'a da ekle
3. İlgili service'de `auditLogService.log(...)` çağrısı yap

### Yeni Admin Route Eklemek

`AdminSecurityConfig.java`'ya uygun rol kısıtlamasıyla ekle:

```java
.requestMatchers("/api/admin/v1/yeni-seksiyon/**")
    .hasAnyRole("SUPER_ADMIN", "PRODUCT_ADMIN")
```

---

## Build & Deploy

```bash
pnpm build
pnpm start
```

Production'da notification-service doğrudan değil, API Gateway (port 8080) üzerinden kullanılması önerilir.
