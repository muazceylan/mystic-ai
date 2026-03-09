# 🔮 Mystic AI — Proje Mimari Mavi Kopyası (v5.0)

> **Son Güncelleme:** Mart 2026 · Sprint 5B
> Önceki sürüm: v3.0 (Ocak 2026)

---

## 🏗️ Teknik Yığın (Tech Stack)

### Backend (Core)

- **Dil:** Java 21
- **Framework:** Spring Boot 3.4.x
- **Mimari:** Event-Driven Microservices
- **AI Entegrasyonu:** Groq API (Whisper ASR + LLM) — ai-orchestrator üzerinden
- **Veritabanı:** PostgreSQL (servis başına ayrı DB), Redis (Cache)
- **Mesajlaşma:** RabbitMQ (Asenkron AI işlemleri & Event Bus)

### Admin Panel *(Sprint 2, 2026)*

- **Framework:** Next.js 14+ (App Router)
- **Dil:** TypeScript
- **State:** TanStack Query v5
- **Stil:** Tailwind CSS (dark theme)
- **HTTP:** Axios — `X-Admin-Id`, `X-Admin-Email`, `X-Admin-Role` interceptor

### Frontend (Mobile — React Native)

- **Framework:** React Native (Expo SDK 50+)
- **Routing:** Expo Router (Dosya tabanlı navigasyon)
- **State Management:** Zustand
- **Styling:** NativeWind (Tailwind CSS)
- **Network:** Axios (REST) + TanStack Query
- **Push:** Expo Push API (projectId: `ae6fd7e4-2d11-45f8-828c-d916782b852f`)
- **Haptics:** `src/utils/haptics.ts` wrapper (web'de crash önler)

### DevOps & Infrastructure

- **Containerization:** Docker & Docker Compose
- **Service Discovery:** Netflix Eureka (Port: 8761)
- **API Gateway:** Spring Cloud Gateway (Port: 8080)
- **Observability:** Zipkin (Tracing), Micrometer, Actuator
- **Resilience:** Resilience4j (Retry & Circuit Breaker)
- **Package Manager:** pnpm (admin panel), npm (mobile)

---

## 🔌 Servis Haritası

```
Mobile App (Expo/React Native)
Admin Panel (Next.js :3001)
        |
        v
  API Gateway :8080
  (JWT filter, routing, rate limiting)
        |
  +-----+--------------------------------------------+
  |                                                   |
Auth :8081              Astrology :8083               |
(kayit, giris,          (natal chart, synastry,       |
 e-posta dogrulama,     gunluk transit, cosmic        |
 profil, JWT)           planner, ruya gunlugu,        |
                        haftalik burc, reminders)     |
                                                      |
AI Orchestrator :8084 <-------------------------------+
(LLM gateway · Groq)          |
                              | RabbitMQ
                              v (servis basina yani kuyruk)
                    ai.responses.astrology.queue
                    ai.responses.dream.queue
                    ai.responses.notification.queue
                    ai.responses.vision.queue

Numerology   :8085  -- Isim/dogum tarihi analizleri
Oracle       :8087  -- Servisler arasi gunluk sentez
Notification :8088  -- Push + in-app + WebSocket + CMS + Admin API
Vision       :8089  -- Gorsel analiz (kahve/el fali)
Spiritual    :8091  -- Dua, Esma, nefes, gunluk log

Service Registry (Eureka) :8761
```

---

## 🔌 Servis Listesi ve Portlar

| Servis Adı | Port | Açıklama |
| :--- | :--- | :--- |
| **API Gateway** | `8080` | Tek giriş noktası, JWT Filtreleme, rate limiting |
| **Auth Service** | `8081` | Kayıt/Giriş, e-posta doğrulama, Profil ve Rol Yönetimi |
| **Astrology Service** | `8083` | Natal Chart, Synastry, Günlük Transit, Cosmic Planner, Rüya Günlüğü, Haftalık Burç |
| **AI Orchestrator** | `8084` | LLM Gateway. Prompt zenginleştirme ve AI Model seçimi (Groq) |
| **Numerology Service** | `8085` | İsim ve doğum tarihi tabanlı kader sayısı analizleri |
| **Oracle Service** | `8087` | Aggregator. Tüm servis verilerini "Daily Secret" olarak sentezler |
| **Notification Service** | `8088` | Push + in-app + WebSocket + **Admin API** + **CMS** |
| **Vision Service** | `8089` | Multimodal analiz (Kahve ve El falı görselleri için AI) |
| **Spiritual Service** | `8091` | Dua, Esmaül Hüsna, Nefes/Farkındalık, Günlük Log ve İstatistik API'leri |
| **Service Registry** | `8761` | Eureka service discovery |
| **Admin Panel** | `3001` | Next.js CMS & yönetim arayüzü (frontend) |

---

## 🗄️ Veritabanı Şeması

| Veritabanı | Servis |
| :--- | :--- |
| `mystic_auth` | auth-service |
| `mystic_astrology` | astrology-service |
| `mystic_numerology` | numerology-service |
| `mystic_oracle` | oracle-service |
| `mystic_notification` | notification-service |
| `mystic_vision` | vision-service |
| `mystic_spiritual` | spiritual-service |

---

## 🛠️ Kodlama ve Geliştirme Standartları

### Backend Kuralları

- **Data Transfer:** DTO'lar için Java 21 `record` yapısı kullanımı zorunludur.
- **Hata Yönetimi:** Merkezi `GlobalExceptionHandler` ile `ProblemDetails` formatında yanıtlar.
- **Test:** Testcontainers ile gerçek veritabanı ve RabbitMQ üzerinde entegrasyon testleri.
- **Güvenlik:** Stateless JWT tabanlı yetkilendirme.
- **Boolean Alanlar:** Lomboklu entitelerde `boolean isFoo` için `@JsonProperty("isFoo")` zorunlu.
  - Lombok `isActive()` getter'ından Jackson `is` önekini soyar → JSON'da `active` olur (hata).
  - `@JsonProperty("isActive")` ile doğru ad korunur.
- **@Builder.Default:** Boolean builder alanlarında `@Builder.Default` + `@JsonProperty` birlikte kullanılır.

### Frontend Kuralları (React Native & Expo)

- **Dizin Yapısı:** `src/app` (Routes), `src/components` (UI), `src/store` (State), `src/services` (API).
- **TypeScript:** Tüm bileşenler ve API modelleri için `Interface` tanımlanması zorunludur.
- **Responsive Design:** NativeWind ile farklı cihaz boyutlarına tam uyumluluk.
- **Tab Bar Kuralı:** Her yeni sayfa `app/(tabs)/` içinde olmalı; alt sayfa için folder-based route + `_layout.tsx`.
- **SafeScreen:** Tüm sayfalarda `SafeScreen` wrapper zorunlu (safe area + web 920px max-width).

### Admin Panel Kuralları

- **API Interceptor:** `X-Admin-Id`, `X-Admin-Email`, `X-Admin-Role` her admin isteğinde gönderilir.
- **Query Invalidation:** Her mutasyon sonrası `qc.invalidateQueries()`.
- **Tip Tanımları:** `src/types/index.ts` tek kaynak.

---

## 🛡️ Güvenlik Katmanı

### Kullanıcı JWT (api-gateway)

- Kullanıcı endpointleri `Authorization: Bearer <token>` ile korunur.
- PUBLIC_PATHS: `/api/auth/register`, `/api/auth/login`, `/api/v1/content/**`, `/api/v1/app-config`
- Gateway JWT filter: `startsWith` ile PUBLIC_PATHS kontrolü.

### Admin JWT (notification-service)

- `/api/admin/v1/**` → `AdminJwtFilter` (min 32 char secret)
- Geçersiz token → anında 401 JSON yanıt
- Header üçlüsü: `X-Admin-Id`, `X-Admin-Email`, `X-Admin-Role`
- Roller: `SUPER_ADMIN`, `PRODUCT_ADMIN`, `NOTIFICATION_MANAGER`
- Seed guard: sadece `dev/local/default` profilde çalışır

---

## 🧩 Onboarding ve Kayıt Akışı

React Native tarafında uygulanan adım adım veri toplama stratejisi:

1. **Giriş Metodu:** Sosyal Login (Google/Apple) veya Manuel E-posta/Şifre formu.
2. **Temel Bilgiler:** İsim, Soyisim ve E-posta verilerinin doğrulanması.
3. **Zaman:** Doğum günü (Burç hesaplama için) ve Doğum saati (Biliniyorsa).
4. **Lokasyon:** Ülke ve Şehir seçimi (Arama desteği ve manuel giriş opsiyonu).
5. **Kişisel:** Cinsiyet ve Medeni Durum seçimi.
6. **Odak:** Kullanıcının niyetini belirlediği 2x3 Grid (Aşk, Para, Kariyer, Sağlık vb.).
7. **Kayıt:** Tüm `zustand` store verilerinin tek seferde `POST /api/v1/auth/register` ucuna gönderilmesi.

---

## 📱 Mobil Uygulama Modülleri

### Tab Bar (Footer) Ekranlar

- **Home** — Dashboard (CMS sections + static widgets)
- **Discover** — CMS-first keşif ekranı (ExploreCard + statik catalog fallback)
- **Notifications** — Bildirim merkezi, SectionList date gruplaması
- **Profile** — Kullanıcı profili

### Alt Ekranlar (Stack Route)

- Horoscope (günlük/haftalık)
- Daily Transits + Cosmic Planner + Reminders
- Dream Journal (kayıt + yorum + Groq Whisper ses transkripsiyon)
- Synastry / Compatibility (uyum analizi)
- Numerology
- Spiritual (Dua, Esma sayacı, günlük)
- Vision (kahve/el falı)

---

## 🖥️ Admin Panel Modülleri (`mystic-admin`)

### İçerik Yönetimi (CMS)

| Sayfa | Backend Endpoint |
| :--- | :--- |
| Home Sections | `/api/admin/v1/home-sections/**` |
| Explore Categories | `/api/admin/v1/explore-categories/**` |
| Explore Cards | `/api/admin/v1/explore-cards/**` |
| Placement Banners | `/api/admin/v1/banners/**` |
| Daily Horoscopes | `/api/admin/v1/daily-horoscopes/**` |
| Weekly Horoscopes | `/api/admin/v1/weekly-horoscopes/**` |
| Prayers | `/api/admin/v1/prayers/**` |

### Platform Yönetimi

| Sayfa | Backend Endpoint |
| :--- | :--- |
| Modules | `/api/admin/v1/modules/**` |
| Navigation | `/api/admin/v1/navigation/**` |
| Routes | `/api/admin/v1/routes/**` |
| Admin Users | `/api/admin/v1/admin-users/**` |

### Bildirim Yönetimi

| Sayfa | Backend Endpoint |
| :--- | :--- |
| Notifications | `/api/admin/v1/notifications/**` |
| Notification Catalog | `/api/admin/v1/notification-catalog/**` |
| Notification Triggers | `/api/admin/v1/notification-triggers/**` |
| Notification History | `/api/admin/v1/notification-history/**` |
| Audit Logs | `/api/admin/v1/audit-logs/**` |

---

## 🏗️ CMS Mimarisi (Sprint 5B)

### Entiteler (`notification-service/entity/cms/`)

- **HomeSection** — Ana ekran bölümleri (sectionKey, type, status, isActive, sortOrder)
- **ExploreCategory** — Keşif kategorileri (categoryKey, icon, isActive)
- **ExploreCard** — Keşif kartları (cardKey, categoryKey, isFeatured, isPremium, sortOrder)
- **PlacementBanner** — Banner yönetimi (bannerKey, placementType, priority)
- **DailyHoroscopeCms** — Günlük burç içerikleri (zodiacSign + date + locale unique)
- **WeeklyHoroscopeCms** — Haftalık burç (zodiacSign + weekStartDate + locale unique)
- **PrayerContent** — Dua içerikleri (category, isFeatured, isPremium, audioUrl)

### Public Endpointler (`/api/v1/content/**`)

```
GET /api/v1/content/home-sections
GET /api/v1/content/explore-categories
GET /api/v1/content/explore-cards
GET /api/v1/content/banners
```

### Bootstrap Stratejisi

- `CmsBootstrapService` (`ApplicationRunner`) — idempotent upsert
- `findByKey` → var ise null/boş alanları doldur, yok ise oluştur
- Admin düzenlemeleri korunur (dolu alanların üzerine yazılmaz)

---

## 🔔 Notification Mimarisi

### Dispatch Akışı

```
NotificationDispatchService
  -> UserEngagementScorerService
      (segment: NEW_USER / ACTIVE / PASSIVE / POWER_USER)
  -> DENY / IN_APP_ONLY / PUSH_AND_IN_APP
```

### Scheduler (cron)

| Tetikleyici | Saat |
| :--- | :--- |
| Daily horoscope | 08:30 |
| Dream reminder | 08:00 |
| Prayer | 06:00 |
| Cosmic planner | 07:30 |
| Meditation | 20:00 |
| Evening | 21:00 |
| Weekly (Pazartesi) | 09:00 |
| Cleanup | 03:00 |

### Push Token

- Expo Push API
- `deviceId`, `appVersion`, `environment`, `lastDeliveredAt` takibi
- Geçersiz token otomatik deaktive edilir

---

## 🤖 AI Entegrasyonu

### RabbitMQ Kuyrukları (Servis Başına Ayrı)

| Kuyruk | Tüketen Servis |
| :--- | :--- |
| `ai.responses.astrology.queue` | astrology-service |
| `ai.responses.dream.queue` | astrology-service (rüya modülü burada) |
| `ai.responses.notification.queue` | notification-service |
| `ai.responses.vision.queue` | vision-service |

> ⚠️ **Kritik:** Birden fazla servis aynı kuyruğu dinlerse round-robin dağılımı mesajları yanlış servise iletir. Her servisin kendi kuyruğu olmalıdır.

### Analiz Tipleri (AnalysisType enum)

- `NATAL_CHART_INTERPRETATION`, `RELATIONSHIP_ANALYSIS`, `SYNASTRY`
- `DREAM_INTERPRETATION`, `DREAM_SYNTHESIS`, `MONTHLY_DREAM_STORY`, `SYMBOL_MEANING`
- `DAILY_HOROSCOPE`, `WEEKLY_HOROSCOPE`, `MONTHLY_HOROSCOPE`
- `NUMEROLOGY_INTERPRETATION`, `VISION_ANALYSIS`
- `COLLECTIVE_PULSE_REASON`

> **Kritik Kural:** Yeni `AnalysisType` eklendiğinde `Notification.java` ve `AiResponseListener.java` switch case'leri de güncellenmelidir.

---

## 🕌 Ruhsal Pratikler Modülü (Dua / Esma / Nefes)

> Bu modül, astroloji akışını gölgelememek için mobil ana sayfada **ayrı bir modül/section** olarak konumlandırılır.

### Backend (Spiritual Service)

- **Port:** `8091`
- **Gateway Route:** `/api/v1/spiritual/**` → `spiritual-service`
- **Kapsam:** Günlük dua seti, Esmaül Hüsna sayacı, nefes/farkındalık egzersizleri, log ve haftalık istatistikler
- **Local Data:** `assets/data/esma.tr.json` (99 esma), `assets/data/dua.tr.json`

### Mobil (Expo React Native)

- **Alt Akışlar:** Dua, Esma sayacı, Günlük Journal, İstatistikler, Ayarlar
- **Ek Mini Akış:** Kısa Dualar chip satırı (10-30 sn pratikler)
- **Recommendation Engine:** Natal chart → tema tag'leri → içerik puanlama

### Local Test Profili (Geliştirme Kolaylığı)

- `api-gateway` ve `spiritual-service` için `local` profile altında geçici `permitAll` desteklenir.
- Amaç: Mobil UI'da JWT beklemeden ruhsal modül ekranlarını ve veri akışını test etmek.
- Not: Bu ayar **production için kullanılmaz**.

---

## 🧪 Test Stratejisi

1. **Integration:** Mikroservislerin birbirleri ve mesaj kuyruğu ile uyumu.
2. **Mobile Debug:** Expo Go ile fiziksel cihazlarda performans ve arayüz testi.
3. **E2E:** Postman ve Newman scriptleri ile uçtan uca senaryo doğrulama.

---

## 🔗 Gateway Rotaları (Özet)

| Prefix | Hedef Servis |
| :--- | :--- |
| `/api/auth/**` | auth-service |
| `/api/v1/auth/**` | auth-service |
| `/api/v1/horoscope/**` | astrology-service |
| `/api/v1/transits/**` | astrology-service |
| `/api/v1/dreams/**` | astrology-service |
| `/api/v1/synastry/**` | astrology-service |
| `/api/v1/people/**` | astrology-service |
| `/api/v1/cosmic-planner/**` | astrology-service |
| `/api/v1/reminders/**` | astrology-service |
| `/api/v1/numerology/**` | numerology-service |
| `/api/v1/oracle/**` | oracle-service |
| `/api/v1/notifications/**` | notification-service |
| `/api/v1/content/**` | notification-service (public, no auth) |
| `/api/v1/app-config` | notification-service (public, no auth) |
| `/api/admin/v1/**` | notification-service (admin JWT) |
| `/api/v1/vision/**` | vision-service |
| `/api/v1/spiritual/**` | spiritual-service |

---

## 1️⃣ Altyapı Kurulumu

### Docker Compose ile Altyapıyı Başlatma

```bash
# Tüm altyapı servislerini başlat (PostgreSQL, Redis, RabbitMQ, Zipkin)
docker-compose up -d postgres redis rabbitmq zipkin

# Logları kontrol et
docker-compose logs -f postgres redis rabbitmq
```

### Veritabanlarının Hazır Olduğunu Doğrulama

```bash
# PostgreSQL bağlantı testi
docker exec -it mystic-postgres psql -U mystic -d mystic_auth -c "SELECT 1;"

# RabbitMQ Management UI erişimi
open http://localhost:15672
# Kullanıcı: guest / Şifre: guest

# Redis bağlantı testi
docker exec -it mystic-redis redis-cli ping
# Cevap: PONG
```

### Veritabanı Şemalarını Oluşturma

```bash
# PostgreSQL'e bağlan ve şemaları kontrol et
docker exec -it mystic-postgres psql -U mystic -l

# Beklenen veritabanları:
# - mystic_auth
# - mystic_astrology
# - mystic_numerology
# - mystic_oracle
# - mystic_notification
# - mystic_vision
# - mystic_spiritual
```

---

## 2️⃣ Backend Build & Run

### Tüm Servisleri Maven ile Derleme

```bash
# Ana dizinde tüm modülleri derle
mvn clean install -DskipTests

# Veya paralel derleme (daha hızlı)
mvn clean install -DskipTests -T 4

# Sadece belirli bir servisi derle
mvn clean install -pl notification-service -am -DskipTests
```

### Servisleri Sırayla Başlatma

> ⚠️ **Önemli**: Servisleri aşağıdaki sırayla başlatın!

```bash
# 1. Service Registry (Eureka) - Önce başlamalı
java -jar service-registry/target/service-registry-*.jar &
sleep 15

# 2. Auth Service
java -jar auth-service/target/auth-service-*.jar &
sleep 5

# 3. AI Orchestrator
java -jar ai-orchestrator/target/ai-orchestrator-*.jar &
sleep 5

# 4. Diğer servisler (paralel başlatılabilir)
java -jar astrology-service/target/astrology-service-*.jar &
java -jar numerology-service/target/numerology-service-*.jar &
java -jar oracle-service/target/oracle-service-*.jar &
java -jar notification-service/target/notification-service-*.jar &
java -jar vision-service/target/vision-service-*.jar &
SPRING_PROFILES_ACTIVE=local java -jar spiritual-service/target/spiritual-service-*.jar &
sleep 5

# 5. API Gateway (Son başlamalı)
SPRING_PROFILES_ACTIVE=local java -jar api-gateway/target/api-gateway-*.jar &
```

### Tek Komutla Tüm Servisleri Başlatma (Script)

```bash
chmod +x start-services.sh
mkdir -p logs
./start-services.sh
```

### Servisleri Docker ile Başlatma

```bash
docker-compose up -d
docker-compose logs -f api-gateway
```

---

## 3️⃣ Port Haritası

```
+----------------------------------------------------------+
|                   MYSTIC AI PORT MAP                     |
+--------------+--------+----------------------------------+
| Servis       | Port   | Aciklama                         |
+--------------+--------+----------------------------------+
| Eureka       | 8761   | Service Discovery                |
| Zipkin       | 9411   | Distributed Tracing              |
| RabbitMQ     | 5672   | Message Queue (AMQP)             |
| RabbitMQ UI  | 15672  | RabbitMQ Management              |
+--------------+--------+----------------------------------+
| API Gateway  | 8080   | Ana API Girisi                   |
| Auth         | 8081   | JWT Authentication               |
| Astrology    | 8083   | Natal Chart, Horoscope, Dream    |
| AI Orchestr. | 8084   | AI / Groq LLM Engine             |
| Numerology   | 8085   | Pythagorean Numerology           |
| Oracle       | 8087   | Grand Synthesis                  |
| Notification | 8088   | Push + WebSocket + CMS + Admin   |
| Vision       | 8089   | Image Analysis (Coffee/Palm)     |
| Spiritual    | 8091   | Dua/Esma/Nefes & Log API         |
+--------------+--------+----------------------------------+
| Admin Panel  | 3001   | Next.js Admin Arayuzu            |
| Mobile Dev   | 8090   | Expo Development Server          |
+----------------------------------------------------------+
```

```bash
# Tüm portları kontrol et
lsof -i :8761,9411,15672,8080,8081,8083,8084,8085,8087,8088,8089,8091

# Port kullanan process'leri gör
lsof -ti:8080 | xargs ps
```

---

## 4️⃣ Monitoring Arayüzleri

| Araç | URL | Açıklama |
| :--- | :--- | :--- |
| Eureka | http://localhost:8761 | Tüm mikroservislerin kayıt durumu |
| Zipkin | http://localhost:9411 | Request tracing ve latency analizi |
| RabbitMQ UI | http://localhost:15672 | Kuyruk izleme (guest/guest) |
| Swagger | http://localhost:8080/swagger-ui.html | API dökümantasyonu |
| MailHog | http://localhost:8025 | Test e-posta yakalayıcısı |
| pgAdmin | http://localhost:5050 | PostgreSQL yönetimi |
| Grafana | http://localhost:3000 | Metrik dashboardları |

```bash
# Monitoring profili başlat
docker compose --profile monitoring up -d

# Tools profili başlat
docker compose --profile tools up -d
```

### Actuator Health Checks

```bash
curl http://localhost:8080/actuator/health   # gateway
curl http://localhost:8081/actuator/health   # auth
curl http://localhost:8083/actuator/health   # astrology
curl http://localhost:8088/actuator/health   # notification
```

---

## 5️⃣ Frontend Kurulum & Çalıştırma

### Mobile (React Native / Expo)

```bash
cd mysticai-mobile
npm install
npx expo start

# Android için (Emülatör açık olmalı)
npx expo run:android

# iOS için (Simulator açık olmalı)
npx expo run:ios
```

> Android emülatörde API: `http://10.0.2.2:8080`

### Admin Panel (Next.js)

```bash
cd mystic-admin
pnpm install
pnpm dev
# -> http://localhost:3001
```

---

## 6️⃣ Test Akışı

### Postman Koleksiyonunu Import Etme

```bash
# Postman'i aç
# File -> Import -> Upload Files
# docs/postman/MysticAI_Collection.json seç
# docs/postman/MysticAI_Environment.json seç
```

### Newman ile Terminal'den Test

```bash
# Newman kurulumu
npm install -g newman newman-reporter-html

# Tüm koleksiyonu çalıştır
cd docs/postman
newman run MysticAI_Collection.json \
  -e MysticAI_Environment.json

# HTML rapor ile çalıştır
newman run MysticAI_Collection.json \
  -e MysticAI_Environment.json \
  --reporters cli,html \
  --reporter-html-export test-report.html

# CI/CD için (sadece hata durumunda exit code)
newman run MysticAI_Collection.json \
  -e MysticAI_Environment.json \
  --bail
```

### Manuel Test

```bash
# Health Check
curl http://localhost:8080/actuator/health

# Public CMS endpoint testi
curl http://localhost:8080/api/v1/content/home-sections
curl http://localhost:8080/api/v1/content/explore-cards
curl http://localhost:8080/api/v1/app-config

# Spiritual endpoint testi
curl http://localhost:8080/api/v1/spiritual/daily/prayers
```

---

## 7️⃣ Hata Giderme (Troubleshooting)

### Port Already in Use

```bash
lsof -ti:8088 | xargs kill -9
pkill -f java   # tüm Java process'leri
```

### 503 Register / Gateway Hatası

```bash
# auth-service Eureka'da UP mu?
curl http://localhost:8761
tail -f logs/auth.log      # startup hatası?
tail -f logs/gateway.log   # "No servers available for service: auth-service"
```

### Admin Panel — 400 Required header 'X-Admin-Id'

- Çıkış yapıp tekrar giriş yap (localStorage yenilenir)
- `localStorage.admin_user` formatı: `{ id, email, role }`
- `mystic-admin/src/lib/api.ts` interceptor üç header'ı da göndermeli

### Toggle/Activate Butonu Çalışmıyor

- **Sebep:** Lombok `boolean isActive` → getter `isActive()` → Jackson `is` soyar → JSON'da `"active"` olur
- **Çözüm:** Entite alanına `@JsonProperty("isActive")` ekle (Sprint 5B'de tüm entitelere uygulandı)

### RabbitMQ — Mesajlar Kayboldu

- Birden fazla servis aynı kuyruğu dinliyor → round-robin dağılımı
- Her servisin kendi kuyruğu olmalı (`ai.responses.<servis>.queue`)

### Gateway Timeout (504)

```bash
curl http://localhost:8761   # Eureka UP mu?
tail -f logs/oracle.log      # Servis logu
# Resilience4j circuit breaker ~30 saniyede resetlenir
```

### Database Connection Failed

```bash
docker compose ps postgres
docker compose logs postgres

# Manuel veritabanı oluşturma
docker exec -it mystic-postgres psql -U mystic \
  -c "CREATE DATABASE mystic_notification;"

# Veritabanlarını yeniden oluştur
docker-compose down -v
docker-compose up -d postgres

# account_status null hatası
docker exec -i mystic-postgres psql -U mystic -d mystic_auth -c \
  "UPDATE users SET account_status='ACTIVE' WHERE account_status IS NULL;"
```

### WebSocket Connection Failed

```bash
# GatewayConfig.java'de /ws/** route'u olmalı
curl http://localhost:15672/api/overview -u guest:guest
tail -f logs/notification.log
```

### Ruhsal Modül "Yüklenemedi" Hatası

```bash
# local profile ile çalıştır (JWT olmadan test için)
SPRING_PROFILES_ACTIVE=local mvn -pl spiritual-service spring-boot:run
SPRING_PROFILES_ACTIVE=local mvn -pl api-gateway spring-boot:run

curl http://localhost:8080/api/v1/spiritual/daily/prayers
curl http://localhost:8080/api/v1/spiritual/daily/asma
```

### Maven Build Failure

```bash
mvn clean
rm -rf ~/.m2/repository/com/mysticai
mvn clean install -DskipTests -T 4
mvn dependency:tree
```

### Servis Başlatma Sırası Hataları

```bash
# Hata: "Eureka connection refused"
# start-services.sh script'ini kullan (otomatik sıralama yapar)
# Veya manuel olarak:
sleep 15  # Eureka için bekle
java -jar auth-service/target/auth-service-*.jar &
sleep 5   # Sonraki servis için bekle
```

---

## 🚀 Hızlı Başlangıç Cheat Sheet

```bash
# 1. Altyapıyı başlat
docker-compose up -d postgres redis rabbitmq zipkin

# 2. Backend'i derle ve çalıştır
mvn clean install -DskipTests
./start-services.sh

# 3. Admin paneli başlat
cd mystic-admin && pnpm install && pnpm dev

# 4. Mobile'i başlat
cd mysticai-mobile && npm install && npx expo start

# 5. Test et
curl http://localhost:8080/actuator/health
curl http://localhost:8080/api/v1/content/home-sections
newman run docs/postman/MysticAI_Collection.json -e docs/postman/MysticAI_Environment.json
```

---

## 📊 Log İzleme

```bash
# Tüm servis loglarını izle
tail -f logs/*.log

# Belirli bir servisin logunu izle
tail -f logs/notification.log

# Docker loglarını izle
docker-compose logs -f api-gateway

# Logları filtrele
grep "ERROR" logs/*.log
```

---

## 🔄 Sıfırdan Reset

```bash
# 1. Servisleri durdur
pkill -f "service-registry|auth-service|api-gateway|astrology-service|numerology-service|oracle-service|notification-service|vision-service|spiritual-service|ai-orchestrator" || true
docker-compose down -v

# 2. Logları temizle
rm -rf logs/*

# 3. Maven cache'i temizle
mvn clean

# 4. Yeniden başlat
docker-compose up -d
mvn clean install -DskipTests
./start-services.sh
```

---

## 📁 Proje Yapısı

```
mystic-ai/
├── api-gateway/              # Spring Cloud Gateway
├── auth-service/             # Kimlik doğrulama ve profil
├── astrology-service/        # Astroloji + rüya modülü + burç
├── ai-orchestrator/          # LLM yönlendirici (Groq)
├── numerology-service/       # Numeroloji
├── oracle-service/           # Günlük sentez aggregator
├── notification-service/     # Push + in-app + Admin API + CMS
├── vision-service/           # Görsel analiz
├── spiritual-service/        # Dua/Esma/nefes
├── mystic-common/            # Paylaşılan DTO ve util'ler
├── service-registry/         # Eureka
├── mysticai-mobile/          # React Native Expo uygulaması
├── mystic-admin/             # Next.js admin paneli
├── docs/
│   ├── project-blueprint.md
│   └── USAGE_GUIDE.md
├── docker/
├── docker-compose.yml
├── Makefile
└── start-services.sh
```

---

**Hazırlayan:** Mystic AI Development Team
**Versiyon:** 5.0
**Son Güncelleme:** Mart 2026
