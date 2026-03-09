# 🔮 Mystic AI

<div align="center">

**AI-powered mystical platform** — Astrology · Numerology · Dream Interpretation · Spiritual Practices

*Yapay zeka destekli mistik platform* — Astroloji · Numeroloji · Rüya Yorumu · Spiritüel Pratikler

[![Java](https://img.shields.io/badge/Java-21-orange?logo=openjdk)](https://openjdk.org/projects/jdk/21/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.x-green?logo=spring)](https://spring.io/projects/spring-boot)
[![React Native](https://img.shields.io/badge/React%20Native-Expo%20SDK%2050-blue?logo=react)](https://expo.dev)
[![Next.js](https://img.shields.io/badge/Next.js-14+-black?logo=next.js)](https://nextjs.org)
[![License](https://img.shields.io/badge/license-Private-red)](LICENSE)

</div>

---

> 🇹🇷 **Türkçe** döküman için [aşağı kaydırın](#-türkçe).
> 🇬🇧 **English** documentation [below](#-english).

---

## 🇬🇧 English

### Overview

Mystic AI is a microservices-based platform that combines astrology, numerology, dream interpretation, and spiritual practices powered by AI. It consists of:

- **Backend:** 10 Spring Boot microservices
- **Mobile App:** React Native (Expo) for iOS and Android
- **Admin Panel:** Next.js dashboard for content and notification management

### Architecture

```
Mobile App (Expo/React Native)
Admin Panel (Next.js)
         │
         ▼
   API Gateway :8080
   (JWT filter, routing, rate limiting)
         │
  ┌──────┴──────────────────────────────┐
  │                                     │
Auth :8081              Astrology :8083  │
(register, login,       (natal chart,   │
 profile, JWT)          synastry,       │
                        horoscopes,     │
                        dream journal,  │
                        cosmic planner) │
                                        │
AI Orchestrator :8084 ◄─────────────────┘
(LLM gateway · Groq)
         │
         │ RabbitMQ (per-service response queues)
         ▼
Notification :8088 · Numerology :8085 · Oracle :8087
Vision :8089 · Spiritual :8091

Service Registry (Eureka) :8761
```

### Services

| Service | Port | Description |
|---------|------|-------------|
| API Gateway | 8080 | Single entry point, JWT filtering, rate limiting |
| Auth Service | 8081 | Registration, login, email verification, profile |
| Astrology Service | 8083 | Natal chart, synastry, daily transits, cosmic planner, horoscopes, dream journal |
| AI Orchestrator | 8084 | LLM gateway (Groq), prompt enrichment, model selection |
| Numerology Service | 8085 | Pythagorean numerology analysis |
| Oracle Service | 8087 | Cross-service daily synthesis aggregator |
| Notification Service | 8088 | Push + in-app + WebSocket + **Admin API** + **CMS** |
| Vision Service | 8089 | Multimodal image analysis (coffee/palm reading) |
| Spiritual Service | 8091 | Prayer, Asma al-Husna, breath exercises, journal |
| Service Registry | 8761 | Eureka service discovery |

### Tech Stack

**Backend:**
- Java 21 · Spring Boot 3.4.x · Spring Cloud 2024.0.0
- PostgreSQL (per-service DB) · Redis · RabbitMQ
- JWT (JJWT) · Resilience4j · Micrometer · Zipkin
- Groq API (Whisper ASR + LLM)

**Mobile:**
- React Native · Expo SDK 50+ · Expo Router (file-based)
- TypeScript · Zustand · TanStack Query · NativeWind

**Admin Panel:**
- Next.js 14+ · TypeScript · TanStack Query · Tailwind CSS

**Infrastructure:**
- Docker / Docker Compose · Maven multi-module monorepo

### Quick Start

**Prerequisites:** Java 21, Maven 3.9+, Node.js 20+, Docker

```bash
# 1. Copy environment files
cp .env.example .env
cp mysticai-mobile/.env.example mysticai-mobile/.env

# 2. Start infrastructure
make infra

# 3. Build & start all backend services
chmod +x start-services.sh
./start-services.sh

# 4. Start admin panel (separate terminal)
cd mystic-admin && pnpm install && pnpm dev
# → http://localhost:3001

# 5. Start mobile app (separate terminal)
cd mysticai-mobile && npm install && npm run start
```

### Key Features

- 🌟 **Natal Chart** — Sun, Moon, Rising sign calculations with AI interpretation
- 🌙 **Daily Transits** — Real-time planetary transit tracking
- 📅 **Cosmic Planner** — Monthly/daily AI-powered planning
- 💫 **Synastry** — Relationship compatibility analysis
- 💭 **Dream Journal** — Voice recording (Groq Whisper) + AI interpretation
- 🔢 **Numerology** — Name and birth date destiny number analysis
- 🕌 **Spiritual Practices** — Prayer (Dua), Asma al-Husna counter, breath exercises
- 👁️ **Vision** — Coffee cup and palm reading via image AI
- 📢 **Smart Notifications** — Engagement-scored, preference-aware push + in-app
- 🖥️ **CMS** — Admin-controlled home sections, explore cards, banners, horoscopes
- 🛡️ **Admin Panel** — Full CMS, notification management, route registry, audit logs

### Environment Variables

**Backend `.env`**

| Variable | Default |
|----------|---------|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_USER` | `mystic` |
| `DB_PASSWORD` | `mystic123` |
| `RABBITMQ_HOST` | `localhost` |
| `REDIS_HOST` | `localhost` |
| `JWT_SECRET` | Base64 secret (min 32 chars) |
| `GROQ_API_KEY` | Groq API key |
| `ENV` | `local` |
| `API_PUBLIC_URL` | `http://localhost:8080` |

**Mobile `mysticai-mobile/.env`**

| Variable | Description |
|----------|-------------|
| `EXPO_PUBLIC_APP_ENV` | `dev / stage / prod` |
| `EXPO_PUBLIC_API_BASE_URL_DEV` | API URL for development |

### Monitoring Tools

| Tool | URL |
|------|-----|
| Eureka | http://localhost:8761 |
| RabbitMQ UI | http://localhost:15672 |
| Zipkin | http://localhost:9411 |
| MailHog | http://localhost:8025 |
| Swagger | http://localhost:8080/swagger-ui.html |
| pgAdmin | http://localhost:5050 |
| Grafana | http://localhost:3000 |

### Project Structure

```
mystic-ai/
├── api-gateway/            # Spring Cloud Gateway
├── auth-service/           # Authentication & profile
├── astrology-service/      # Astrology + dream + horoscopes
├── ai-orchestrator/        # LLM gateway (Groq)
├── numerology-service/     # Numerology analysis
├── oracle-service/         # Daily synthesis aggregator
├── notification-service/   # Push + CMS + Admin API
├── vision-service/         # Image analysis
├── spiritual-service/      # Spiritual practices
├── mystic-common/          # Shared DTOs & utilities
├── service-registry/       # Eureka
├── mysticai-mobile/        # React Native Expo app
├── mystic-admin/           # Next.js admin panel
├── docs/                   # Documentation
│   ├── project-blueprint.md
│   └── USAGE_GUIDE.md
├── docker/
├── docker-compose.yml
├── Makefile
└── start-services.sh
```

### Documentation

- [Project Blueprint](docs/project-blueprint.md) — Architecture reference
- [Usage Guide](docs/USAGE_GUIDE.md) — Setup, troubleshooting, common errors

---

## 🇹🇷 Türkçe

### Genel Bakış

Mystic AI; astroloji, numeroloji, rüya yorumu ve spiritüel pratikleri yapay zeka ile birleştiren, mikroservis mimarisi üzerine kurulmuş bir platformdur. Üç temel bileşenden oluşur:

- **Backend:** 10 Spring Boot mikroservisi
- **Mobil Uygulama:** iOS ve Android için React Native (Expo)
- **Admin Paneli:** İçerik ve bildirim yönetimi için Next.js dashboard

### Mimari

```
Mobil Uygulama (Expo/React Native)
Admin Paneli (Next.js)
        │
        ▼
  API Gateway :8080
  (JWT filtre, yönlendirme, rate limiting)
        │
  ┌─────┴──────────────────────────────────┐
  │                                        │
Auth :8081              Astrology :8083     │
(kayıt, giriş,          (natal chart,      │
 profil, JWT)           synastry,          │
                        burç takvimi,      │
                        rüya günlüğü,      │
                        cosmic planner)    │
                                           │
AI Orchestrator :8084 ◄─────────────────── ┘
(LLM ağ geçidi · Groq)
        │
        │ RabbitMQ (servis başına yanıt kuyruğu)
        ▼
Notification :8088 · Numeroloji :8085 · Oracle :8087
Vision :8089 · Spiritual :8091

Service Registry (Eureka) :8761
```

### Servisler

| Servis | Port | Açıklama |
|--------|------|----------|
| API Gateway | 8080 | Tek giriş noktası, JWT filtreleme, rate limiting |
| Auth Service | 8081 | Kayıt, giriş, e-posta doğrulama, profil |
| Astrology Service | 8083 | Natal chart, synastry, günlük transit, cosmic planner, burç takvimi, rüya günlüğü |
| AI Orchestrator | 8084 | LLM ağ geçidi (Groq), prompt zenginleştirme |
| Numerology Service | 8085 | Pythagorean numeroloji analizleri |
| Oracle Service | 8087 | Servisler arası günlük sentez agregator |
| Notification Service | 8088 | Push + in-app + WebSocket + **Admin API** + **CMS** |
| Vision Service | 8089 | Çok modlu görsel analiz (kahve/el falı) |
| Spiritual Service | 8091 | Dua, Esmaül Hüsna sayacı, nefes egzersizleri, günlük |
| Service Registry | 8761 | Eureka servis keşfi |

### Teknoloji Yığını

**Backend:**
- Java 21 · Spring Boot 3.4.x · Spring Cloud 2024.0.0
- PostgreSQL (servis başına ayrı DB) · Redis · RabbitMQ
- JWT (JJWT) · Resilience4j · Micrometer · Zipkin
- Groq API (Whisper sesli transkripsiyon + LLM)

**Mobil:**
- React Native · Expo SDK 50+ · Expo Router (dosya tabanlı)
- TypeScript · Zustand · TanStack Query · NativeWind

**Admin Paneli:**
- Next.js 14+ · TypeScript · TanStack Query · Tailwind CSS

**Altyapı:**
- Docker / Docker Compose · Maven multi-module monorepo

### Hızlı Başlangıç

**Gereksinimler:** Java 21, Maven 3.9+, Node.js 20+, Docker

```bash
# 1. Ortam dosyalarını hazırla
cp .env.example .env
cp mysticai-mobile/.env.example mysticai-mobile/.env

# 2. Altyapıyı başlat
make infra

# 3. Backend servislerini derle ve başlat
chmod +x start-services.sh
./start-services.sh

# 4. Admin panelini başlat (ayrı terminal)
cd mystic-admin && pnpm install && pnpm dev
# → http://localhost:3001

# 5. Mobil uygulamayı başlat (ayrı terminal)
cd mysticai-mobile && npm install && npm run start
```

### Temel Özellikler

- 🌟 **Natal Chart** — Güneş, Ay, Yükselen konumu hesaplamaları ve AI yorumu
- 🌙 **Günlük Transitler** — Anlık gezegen transit takibi
- 📅 **Cosmic Planner** — Aylık/günlük AI destekli planlama
- 💫 **Synastry** — İlişki uyumu analizi
- 💭 **Rüya Günlüğü** — Sesli kayıt (Groq Whisper) + AI yorumu
- 🔢 **Numeroloji** — İsim ve doğum tarihi kader sayısı analizi
- 🕌 **Spiritüel Pratikler** — Dua, Esmaül Hüsna sayacı, nefes egzersizleri
- 👁️ **Vision** — Kahve fincanı ve el falı görsel AI analizi
- 📢 **Akıllı Bildirimler** — Etkileşim puanlı, tercih duyarlı push ve in-app bildirimler
- 🖥️ **CMS** — Admin kontrollü ana ekran bölümleri, keşif kartları, banner'lar, burç içerikleri
- 🛡️ **Admin Paneli** — Tam CMS, bildirim yönetimi, route kaydı, audit logları

### Ortam Değişkenleri

**Backend `.env`**

| Değişken | Varsayılan |
|----------|------------|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_USER` | `mystic` |
| `DB_PASSWORD` | `mystic123` |
| `RABBITMQ_HOST` | `localhost` |
| `REDIS_HOST` | `localhost` |
| `JWT_SECRET` | Base64 secret (min 32 karakter) |
| `GROQ_API_KEY` | Groq API anahtarı |
| `ENV` | `local` |
| `API_PUBLIC_URL` | `http://localhost:8080` |

**Mobil `mysticai-mobile/.env`**

| Değişken | Açıklama |
|----------|----------|
| `EXPO_PUBLIC_APP_ENV` | `dev / stage / prod` |
| `EXPO_PUBLIC_API_BASE_URL_DEV` | Geliştirme ortamı API URL'i |

### Monitoring Araçları

| Araç | URL |
|------|-----|
| Eureka | http://localhost:8761 |
| RabbitMQ UI | http://localhost:15672 |
| Zipkin | http://localhost:9411 |
| MailHog | http://localhost:8025 |
| Swagger | http://localhost:8080/swagger-ui.html |
| pgAdmin | http://localhost:5050 |
| Grafana | http://localhost:3000 |

### Proje Yapısı

```
mystic-ai/
├── api-gateway/            # Spring Cloud Gateway
├── auth-service/           # Kimlik doğrulama ve profil
├── astrology-service/      # Astroloji + rüya + burç
├── ai-orchestrator/        # LLM ağ geçidi (Groq)
├── numerology-service/     # Numeroloji analizi
├── oracle-service/         # Günlük sentez agregator
├── notification-service/   # Push + CMS + Admin API
├── vision-service/         # Görsel analiz
├── spiritual-service/      # Spiritüel pratikler
├── mystic-common/          # Ortak DTO ve utility'ler
├── service-registry/       # Eureka
├── mysticai-mobile/        # React Native Expo uygulaması
├── mystic-admin/           # Next.js admin paneli
├── docs/                   # Dökümentasyon
│   ├── project-blueprint.md
│   └── USAGE_GUIDE.md
├── docker/
├── docker-compose.yml
├── Makefile
└── start-services.sh
```

### Dökümanlar

- [Proje Mimari Rehberi](docs/project-blueprint.md) — Mimari referans belgesi
- [Kullanım Rehberi](docs/USAGE_GUIDE.md) — Kurulum, sorun giderme, yaygın hatalar

---

<div align="center">

**Mystic AI Development Team** · Mart 2026

</div>
