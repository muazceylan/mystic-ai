# Mystic AI — Kullanım Rehberi

> Bu belge projeyi sıfırdan başlatmak, yaygın hataları çözmek ve geliştirme ortamını yönetmek için hazırlanmıştır.
> **Son Güncelleme:** Mart 2026

---

## 1. Gereksinimler

| Araç | Minimum Sürüm |
|------|--------------|
| Java | 21 |
| Maven | 3.9+ |
| Node.js | 20 LTS |
| pnpm | 8+ (admin panel için) |
| Docker + Docker Compose | 24+ |
| Yardımcı araçlar | `curl`, `lsof`, `pkill` |

---

## 2. Port Haritası

### Altyapı
| Port | Servis |
|------|--------|
| 5432 | PostgreSQL |
| 5672 | RabbitMQ (AMQP) |
| 6379 | Redis |
| 8025 | MailHog UI |
| 15672 | RabbitMQ Yönetim UI |
| 9411 | Zipkin (tracing) |
| 5050 | pgAdmin |
| 3000 | Grafana |

### Uygulama Servisleri
| Port | Servis |
|------|--------|
| 8761 | Service Registry (Eureka) |
| 8080 | API Gateway |
| 8081 | Auth Service |
| 8083 | Astrology Service |
| 8084 | AI Orchestrator |
| 8085 | Numerology Service |
| 8087 | Oracle Service |
| 8088 | Notification Service (+ Admin API + CMS) |
| 8089 | Vision Service |
| 8091 | Spiritual Service |

### Frontend
| Port | Uygulama |
|------|----------|
| 3001 | Admin Panel (mystic-admin, Next.js) |
| 8090 | Mobile Dev Server (Expo) |

---

## 3. Hızlı Başlangıç

```bash
# 1) Env dosyalarını hazırla
cp .env.example .env
cp mysticai-mobile/.env.example mysticai-mobile/.env

# 2) Altyapıyı başlat
make infra
# veya:
# docker compose up -d postgres redis rabbitmq zipkin mailhog

# 3) Backend servislerini başlat
chmod +x start-services.sh
./start-services.sh

# 4) Admin paneli başlat (ayrı terminal)
cd mystic-admin
pnpm install
pnpm dev      # http://localhost:3001

# 5) Mobil uygulamayı başlat (ayrı terminal)
cd mysticai-mobile
npm install
npm run start
```

---

## 4. start-services.sh Ne Yapar?

Script otomatik olarak şunları yapar:

1. `.env` dosyasını yükler
2. Altyapı portlarını kontrol eder (5432, 5672, 6379)
3. Eski Java process'lerini temizler
4. `mvn clean install -DskipTests` ile build alır
5. Eureka ve auth-service'i önce başlatır
6. `AUTH-SERVICE` Eureka kaydını doğrular
7. Diğer servisleri sırasıyla başlatır
8. API Gateway'i son olarak başlatır
9. Gateway üzerinden smoke check çalıştırır

---

## 5. Sağlık Kontrolü

```bash
# Altyapı
docker compose ps

# Eureka (tüm servisler UP olmalı)
curl http://localhost:8761

# Servis health check'leri
curl http://localhost:8081/actuator/health   # auth
curl http://localhost:8083/actuator/health   # astrology
curl http://localhost:8088/actuator/health   # notification
curl http://localhost:8080/actuator/health   # gateway

# Gateway smoke test
curl "http://localhost:8080/api/v1/auth/check-email?email=test@example.com"

# Public CMS endpoint testi
curl http://localhost:8080/api/v1/content/home-sections
curl http://localhost:8080/api/v1/content/explore-categories
curl http://localhost:8080/api/v1/app-config

# Port durumu
lsof -nP -iTCP:8761 -sTCP:LISTEN
lsof -nP -iTCP:8088 -sTCP:LISTEN
```

---

## 6. Yaygın Hatalar ve Çözümleri

### 503 Service Unavailable — Register/Login

```text
path: /api/v1/auth/register, status: 503
```

Kontrol sırası:
1. `logs/gateway.log` içinde ara: `No servers available for service: auth-service`
2. `logs/auth.log` içinde startup hatalarını kontrol et
3. Eureka'da `auth-service` `UP` değilse gateway 503 döner

**Sebep A: Port çakışması**
```bash
lsof -ti :8081 | xargs kill -9
./start-services.sh
```

**Sebep B: account_status null verisi**
```bash
docker exec -i mystic-postgres psql -U mystic -d mystic_auth -c \
  "UPDATE users SET account_status='ACTIVE' WHERE account_status IS NULL;"
./start-services.sh
```

**Sebep C: Altyapı kapalı**
```bash
make infra
./start-services.sh
```

---

### Admin Panel — 400 Required request header 'X-Admin-Id'

`mystic-admin/src/lib/api.ts` Axios interceptor `X-Admin-Id`, `X-Admin-Email`, `X-Admin-Role` header'larını her admin isteğinde `localStorage.admin_user` üzerinden enjekte eder. Hata devam ediyorsa:
- Çıkış yapıp tekrar giriş yap (localStorage yenilenir)
- `localStorage.admin_user` formatını kontrol et: `{ id, email, role }`

---

### CMS Bootstrap — Detaylar Boş Geliyor

`CmsBootstrapService` her başlatmada idempotent upsert yapar. Mevcut kayıt varsa sadece `null/boş` alanları doldurur. Veritabanındaki kayıtların alanları hâlâ boşsa:
```bash
# Notification service'i yeniden başlat
# Bootstrap her startup'ta çalışır ve eksik alanları tamamlar
```

---

### Toggle/Activate Butonu Çalışmıyor

Lomboklu entitelerde `boolean isActive` için Jackson getter'dan `is` önekini soyar ve JSON'da `active` olarak yazar. Bu durumda frontend `isActive` değeri `undefined` görür. Düzeltme: tüm `boolean is*` alanlara `@JsonProperty("isActive")` eklenmeli (Sprint 5B'de uygulandı).

---

### RabbitMQ — Mesajlar Kayboldu

Birden fazla servis aynı kuyruğu dinliyorsa round-robin dağılımı mesajları yanlış servise iletir. Her servisin kendi kuyruğu olmalıdır:
- `ai.responses.astrology.queue` → astrology-service
- `ai.responses.notification.queue` → notification-service
- vb.

---

### Port Already in Use

```bash
# Tek port
lsof -ti:8080 | xargs kill -9

# Tüm Java process'leri
pkill -f java
```

---

### Gateway Timeout (504)

```bash
# Eureka'da kayıtlı servisleri kontrol et
curl http://localhost:8761

# Servis logunu incele
tail -f logs/oracle.log

# Resilience4j circuit breaker ~30 saniyede resetlenir
```

---

### Veritabanı Bağlantı Hatası

```bash
# Container durumu
docker compose ps postgres
docker compose logs postgres

# Manuel veritabanı oluşturma
docker exec -it mystic-postgres psql -U mystic \
  -c "CREATE DATABASE mystic_notification;"

# Temizden başla
docker compose down -v
docker compose up -d postgres
```

---

### Maven Build Hatası

```bash
# Cache temizle
mvn clean
rm -rf ~/.m2/repository/com/mysticai

# Dependency tree
mvn dependency:tree
```

---

## 7. Mobil Geliştirme

### API URL Ayarı

`mysticai-mobile/.env`:
```env
EXPO_PUBLIC_APP_ENV=dev
EXPO_PUBLIC_API_BASE_URL_DEV_OVERRIDE=
```

Notlar:
- Dev URL otomatik çözülür:
- Web: `window.location.hostname` + `8080`
- iOS simulator: `localhost:8080`
- Android emulator: `10.0.2.2:8080`
- Fiziksel cihaz (Expo Go / dev client): Metro host IP + `8080`
- Gerekirse manuel override için `EXPO_PUBLIC_API_BASE_URL_DEV_OVERRIDE=http://<host>:8080` kullan
- Spiritual service dev çözümü de aynıdır (port `8091`); gerekirse `EXPO_PUBLIC_SPIRITUAL_API_URL_OVERRIDE` verilebilir
- Fiziksel cihaz testinde telefon ve bilgisayar aynı Wi-Fi ağında olmalı
- Backend fiziksel cihazdan erişilecekse `0.0.0.0` bind veya LAN erişimi açık olmalı
- Push notification testi için fiziksel cihaz gerekir (Expo Go simulator'da push çalışmaz)

### Ekran Geliştirme Kuralları

- Her yeni sayfa `app/(tabs)/` içinde olmalı (tab bar görünsün)
- Alt sayfa gerekiyorsa folder-based route + `_layout.tsx` (Stack)
- `SafeScreen` wrapper zorunlu
- Haptics: `src/utils/haptics.ts` (doğrudan `expo-haptics` import etme)

---

## 8. Admin Panel Geliştirme

### Kurulum

```bash
cd mystic-admin
pnpm install
pnpm dev
```

### Admin Kullanıcısı (local/dev)

Servis başlarken seed edilen varsayılan admin:
- Email: `admin@mysticai.com`
- Password: `.env` dosyasındaki `ADMIN_DEFAULT_PASSWORD`

### API İsteklerinin Yapısı

Tüm `/api/admin/v1/**` istekleri şu header'ları içermelidir:
```
Authorization: Bearer <admin_jwt>
X-Admin-Id: <id>
X-Admin-Email: <email>
X-Admin-Role: SUPER_ADMIN | PRODUCT_ADMIN | NOTIFICATION_MANAGER
```

---

## 9. Log İzleme

```bash
# Tüm servis logları
tail -f logs/*.log

# Belirli servis
tail -f logs/notification.log
tail -f logs/gateway.log

# Hata filtresi
grep "ERROR" logs/*.log

# Docker logları
docker compose logs -f api-gateway
docker compose logs -f postgres
```

---

## 10. Monitoring Araçları

| Araç | URL |
|------|-----|
| Eureka | http://localhost:8761 |
| RabbitMQ UI | http://localhost:15672 (guest/guest) |
| Zipkin | http://localhost:9411 |
| MailHog | http://localhost:8025 |
| pgAdmin | http://localhost:5050 |
| Grafana | http://localhost:3000 |
| Swagger (Gateway) | http://localhost:8080/swagger-ui.html |

```bash
# Monitoring profili başlat
docker compose --profile monitoring up -d

# Tools profili başlat
docker compose --profile tools up -d
```

---

## 11. Tam Reset

```bash
# 1. Java process'lerini durdur
pkill -f "service-registry|auth-service|api-gateway|astrology-service|numerology-service|oracle-service|notification-service|vision-service|spiritual-service|ai-orchestrator" || true

# 2. Altyapıyı durdur (volume'ler dahil)
docker compose down -v

# 3. Logları temizle
rm -rf logs/*

# 4. Maven cache temizle
mvn clean

# 5. Yeniden başlat
make infra
mvn clean install -DskipTests
./start-services.sh
```

---

## 12. E-posta Doğrulama (Domain Yokken)

1. Backend'i local'de başlat
2. `ngrok http 8080` ile public tunnel aç
3. `.env` içinde `API_PUBLIC_URL=https://xxxx.ngrok-free.app` yap
4. Kayıt ol — doğrulama maili ngrok URL'i içerecek
5. MailHog UI üzerinden maili görüntüle: http://localhost:8025

Domain hazır olduğunda sadece env değişkenlerini güncelle:
```env
API_PUBLIC_URL=https://api.<domain>
APP_PUBLIC_URL=https://app.<domain>
```

---

**Hazırlayan:** Mystic AI Development Team
**Son Güncelleme:** Mart 2026
