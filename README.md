# Mystic AI

Astroloji, numeroloji, ruya yorumu ve spirituel akislari AI ile birlestiren mikroservis tabanli platform.
Backend Spring Boot + mobil React Native (Expo Router) olarak gelistirilmektedir.

## Son Revizyon (Mart 2026)

- Astrology servisinde yeni `daily transits` endpoint grubu eklendi.
- `cosmic planner` akisi ay/gun/kategori seviyesinde genisletildi.
- Hatirlatici yonetimi icin `planner reminders` API grubu eklendi.
- Mobil uygulamada home dashboard, compare/match ve daily ekranlari revize edildi.

## Mimari

```
Mobile App (Expo/React Native :8090)
                |
                v
        API Gateway (:8080)
                |
   +------------+-------------+---------------------------+
   |            |             |                           |
 Auth        Astrology      Dream                      Numerology
(:8081)      (:8083)       (:8086)                    (:8085)
   |            |
   |            +--> Cosmic Planner / Daily Transits / Reminders / Match
   |
   +-----------------------------------+
                                       |
                                  AI Orchestrator (:8084)
                                       |
                                 RabbitMQ + Redis

Oracle (:8087) | Notification (:8088) | Vision (:8089) | Spiritual (:8091)

Service Discovery: Eureka Service Registry (:8761)
```

## Servisler ve Portlar

| Servis | Port | Aciklama |
|--------|------|----------|
| API Gateway | 8080 | Tek giris noktasi, routing, security filtreleri |
| Auth Service | 8081 | Kimlik dogrulama, kayit/giris, profil |
| Astrology Service | 8083 | Natal chart, synastry, daily transits, cosmic planner |
| AI Orchestrator | 8084 | LLM orkestrasyonu, prompt fallback ve model secimi |
| Numerology Service | 8085 | Numeroloji analizleri |
| Dream Service | 8086 | Ruya kaydi ve yorum |
| Oracle Service | 8087 | Servisler arasi sentez (gunun yorumu vb.) |
| Notification Service | 8088 | REST + WebSocket bildirim altyapisi |
| Vision Service | 8089 | Gorsel analiz (kahve/eli vb.) |
| Spiritual Service | 8091 | Spirituel icerik/akislari |
| Service Registry | 8761 | Eureka service discovery |

## Teknoloji Stack

### Backend

- Java 21
- Spring Boot 3.4.x, Spring Cloud 2024.0.0
- Spring Cloud Gateway, Eureka
- PostgreSQL, Redis, RabbitMQ
- JWT (JJWT), Resilience4j, Micrometer, Zipkin

### Mobile

- React Native + Expo SDK 50
- Expo Router (file-based navigation)
- TypeScript, Zustand, NativeWind
- TanStack Query, Axios

### Altyapi

- Docker / Docker Compose
- Maven multi-module monorepo

## Hizli Baslangic

### Gereksinimler

- Java 21+
- Maven 3.9+
- Docker + Docker Compose
- Node.js 18+ (onerilen 20 LTS)

### 1) Ortam Dosyalarini Hazirla

```bash
cp .env.example .env
cp mysticai-mobile/.env.example mysticai-mobile/.env
```

### 2) Altyapiyi Baslat

```bash
make infra
# alternatif:
# docker compose up -d postgres rabbitmq redis zipkin
```

### 3) Backend Servislerini Baslat

Onerilen yol:

```bash
chmod +x start-services.sh
./start-services.sh
```

Manuel yol (sirayla):

```bash
cd service-registry && mvn spring-boot:run
cd auth-service && mvn spring-boot:run
cd ai-orchestrator && mvn spring-boot:run
cd astrology-service && mvn spring-boot:run
cd numerology-service && mvn spring-boot:run
cd dream-service && mvn spring-boot:run
cd oracle-service && mvn spring-boot:run
cd notification-service && mvn spring-boot:run
cd vision-service && mvn spring-boot:run
cd spiritual-service && mvn spring-boot:run
cd api-gateway && mvn spring-boot:run
```

### 4) Mobil Uygulamayi Baslat

```bash
cd mysticai-mobile
npm install
npm run start
```

Notlar:

- Expo development server varsayilan olarak `:8090` portunda calisir.
- Android emulatorde API icin `http://10.0.2.2:8080` kullanin.

## Ortam Degiskenleri

### Backend `.env`

| Degisken | Varsayilan |
|----------|------------|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_USER` | `mystic` |
| `DB_PASSWORD` | `mystic123` |
| `RABBITMQ_HOST` | `localhost` |
| `RABBITMQ_PORT` | `5672` |
| `REDIS_HOST` | `localhost` |
| `REDIS_PORT` | `6379` |
| `JWT_SECRET` | Base64 secret |
| `GROQ_API_KEY` | AI key |

### Mobile `mysticai-mobile/.env`

| Degisken | Aciklama |
|----------|----------|
| `EXPO_PUBLIC_APP_ENV` | `dev / stage / prod` |
| `EXPO_PUBLIC_API_BASE_URL_DEV` | Gelistirme API URL (`http://localhost:8080`) |
| `EXPO_PUBLIC_API_BASE_URL_STAGE` | Stage API URL |
| `EXPO_PUBLIC_API_BASE_URL_PROD` | Production API URL |
| `EXPO_PUBLIC_USE_MOCK` | Mock data togglesi |
| `EXPO_PUBLIC_GOOGLE_PLACES_API_KEY` | Places API anahtari |
| `EXPO_PUBLIC_GOOGLE_MAPS_API_KEY` | Maps API anahtari |

## Yeni API Gruplari

Gateway uzerinden cagrilir: `http://localhost:8080`

### Daily Transits

- `GET /api/v1/daily/transits`
- `GET /api/v1/daily/transits/actions`
- `POST /api/v1/daily/transits/actions/{actionId}/done`
- `POST /api/v1/feedback`

### Cosmic Planner

- `GET /api/v1/cosmic-planner/month`
- `GET /api/v1/cosmic-planner/day`
- `GET /api/v1/cosmic-planner/day/categories`

### Planner Reminders

- `POST /api/v1/reminders`
- `GET /api/v1/reminders`
- `PATCH /api/v1/reminders/{id}`
- `DELETE /api/v1/reminders/{id}`

## Veritabanlari

Varsayilan PostgreSQL veritabani adlari:

- `mystic_auth`
- `mystic_astrology`
- `mystic_dream`
- `mystic_numerology`
- `mystic_oracle`
- `mystic_notification`
- `mystic_vision`
- `mystic_spiritual`

## Monitoring ve Araclar

```bash
# Monitoring
docker compose --profile monitoring up -d

# Tooling
docker compose --profile tools up -d
```

| Arac | URL |
|------|-----|
| Eureka | http://localhost:8761 |
| Swagger (Gateway) | http://localhost:8080/swagger-ui.html |
| RabbitMQ UI | http://localhost:15672 |
| Zipkin | http://localhost:9411 |
| pgAdmin | http://localhost:5050 |
| Grafana | http://localhost:3000 |

## Proje Yapisi

```text
mystic-ai/
├── service-registry/
├── api-gateway/
├── auth-service/
├── astrology-service/
├── ai-orchestrator/
├── numerology-service/
├── dream-service/
├── oracle-service/
├── notification-service/
├── vision-service/
├── spiritual-service/
├── mystic-common/
├── mysticai-mobile/
├── docs/
└── docker/
```

## Ek Dokumanlar

- Genel kullanim rehberi: `docs/USAGE_GUIDE.md`
- Mobil daily transits QA checklist: `mysticai-mobile/docs/DAILY_TRANSITS_RELEASE_QA_CHECKLIST.md`
- Mobil production readiness: `mysticai-mobile/docs/PROD_READINESS.md`
