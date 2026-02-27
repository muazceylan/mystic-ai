# Mystic AI

Astroloji, tarot, numeroloji, ruya yorumu ve daha fazlasini yapay zeka ile birlestiren mistik rehberlik platformu. Spring Boot mikroservis mimarisi + React Native mobil uygulama.

## Mimari

```
                         ┌──────────────┐
                         │  Mobile App  │
                         │ (React Native)│
                         └──────┬───────┘
                                │
                         ┌──────▼───────┐
                         │ API Gateway  │
                         │    :8080     │
                         └──────┬───────┘
                                │
          ┌─────────────────────┼─────────────────────┐
          │                     │                      │
    ┌─────▼─────┐    ┌─────────▼────────┐    ┌───────▼───────┐
    │   Auth    │    │   Astrology      │    │    Tarot      │
    │  :8081   │    │     :8083        │    │    :8082     │
    └───────────┘    └──────────────────┘    └───────────────┘
          │                     │                      │
    ┌─────▼─────┐    ┌─────────▼────────┐    ┌───────▼───────┐
    │  Dream   │    │   Numerology     │    │   Vision     │
    │  :8086   │    │     :8085        │    │    :8089     │
    └───────────┘    └──────────────────┘    └───────────────┘
          │                     │                      │
          └─────────────────────┼──────────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │   AI Orchestrator    │
                    │       :8084          │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │    RabbitMQ / Redis   │
                    └───────────────────────┘
```

## Servisler

| Servis | Port | Aciklama |
|--------|------|----------|
| **API Gateway** | 8080 | Tek giris noktasi, JWT filtreleme, dinamik yonlendirme |
| **Auth Service** | 8081 | Kullanici kayit, giris, sosyal login, profil yonetimi |
| **Astrology Service** | 8083 | Dogum haritasi hesaplama (Gunes, Ay, Yukselen) |
| **AI Orchestrator** | 8084 | LLM gateway, prompt zenginlestirme, model secimi |
| **Numerology Service** | 8085 | Isim ve dogum tarihine gore kader sayisi analizi |
| **Dream Service** | 8086 | Ruya kaydi ve asenkron ruya yorumu |
| **Oracle Service** | 8087 | Tum servis verilerini "Gunun Sirri" sentezine birlestirme |
| **Notification Service** | 8088 | WebSocket (STOMP) ile gercek zamanli bildirimler |
| **Vision Service** | 8089 | Kahve fali ve el fali icin goruntu analizi |
| **Service Registry** | 8761 | Eureka servis kesfii |

## Teknolojiler

**Backend:**
- Java 21, Spring Boot 3.4, Spring Cloud 2024.0.0
- Spring AI (OpenAI / Anthropic / Ollama)
- PostgreSQL (pgvector), Redis, RabbitMQ
- JWT (JJWT 0.12.6), Resilience4j
- Micrometer + Zipkin (distributed tracing)

**Mobile:**
- React Native (Expo), TypeScript
- Expo Router (file-based navigation)
- Zustand, NativeWind (Tailwind CSS)
- Axios (REST) + StompJS (WebSocket)

**Altyapi:**
- Docker & Docker Compose
- Maven (multi-module)
- Spring Cloud Eureka & Gateway

## Kurulum

### Gereksinimler

- Java 21+
- Maven 3.9+
- Docker & Docker Compose
- Node.js 18+ (mobil icin)

### 1. Altyapi Servislerini Baslat

```bash
docker-compose up -d postgres rabbitmq redis zipkin
```

### 2. Backend Servislerini Baslat

Sirasiyla baslatilmalidir:

```bash
# 1. Service Registry (diger servisler bunun hazir olmasini bekler)
cd service-registry && mvn spring-boot:run

# 2. Core servisler
cd auth-service && mvn spring-boot:run
cd ai-orchestrator && mvn spring-boot:run

# 3. Business servisler
cd astrology-service && mvn spring-boot:run
cd dream-service && mvn spring-boot:run
cd numerology-service && mvn spring-boot:run
cd vision-service && mvn spring-boot:run
cd oracle-service && mvn spring-boot:run
cd notification-service && mvn spring-boot:run

# 4. API Gateway (en son)
cd api-gateway && mvn spring-boot:run
```

Ya da toplu baslatma scripti:

```bash
chmod +x start-services.sh
./start-services.sh
```

### 3. Mobil Uygulamayi Baslat

```bash
cd mysticai-mobile
npm install
npx expo start
```

## Ortam Degiskenleri

`.env.example` dosyasini `.env` olarak kopyalayin:

```bash
cp .env.example .env
```

Temel degiskenler:

| Degisken | Varsayilan | Aciklama |
|----------|-----------|----------|
| `DB_HOST` | localhost | PostgreSQL host |
| `DB_PORT` | 5432 | PostgreSQL port |
| `DB_USER` | mystic | Veritabani kullanicisi |
| `DB_PASSWORD` | mystic123 | Veritabani sifresi |
| `RABBITMQ_HOST` | localhost | RabbitMQ host |
| `REDIS_HOST` | localhost | Redis host |
| `JWT_SECRET` | (base64 key) | JWT imzalama anahtari |
| `GROQ_API_KEY` | - | AI servis API anahtari |

## Veritabanlari

Her servisin kendi PostgreSQL veritabani vardir:

`mystic_auth`, `mystic_astrology`, `mystic_dream`, `mystic_oracle`, `mystic_notification`, `mystic_vision`, `mystic_numerology`

## Monitoring (Opsiyonel)

```bash
# Prometheus + Grafana
docker-compose --profile monitoring up -d

# pgAdmin + Redis Commander
docker-compose --profile tools up -d
```

| Arac | URL | Kullanici |
|------|-----|-----------|
| Eureka Dashboard | http://localhost:8761 | - |
| RabbitMQ Management | http://localhost:15672 | mystic / mystic123 |
| pgAdmin | http://localhost:5050 | admin@mysticai.com / admin123 |
| Grafana | http://localhost:3000 | admin / admin123 |
| Zipkin | http://localhost:9411 | - |

## API Dokumantasyonu

Gateway uzerinden tum endpoint'lere erisilebilir: `http://localhost:8080/api/{service}/...`

Ornek:
```bash
# Kayit
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"pass123","fullName":"Test User"}'

# Giris
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"pass123"}'
```

Detayli API dokumantasyonu: [docs/USAGE_GUIDE.md](docs/USAGE_GUIDE.md)

## Proje Yapisi

```
mystic-ai/
├── api-gateway/            # API Gateway (Spring Cloud Gateway)
├── auth-service/           # Kimlik dogrulama servisi
├── ai-orchestrator/        # AI model yonetimi
├── astrology-service/      # Astroloji servisi
├── dream-service/          # Ruya yorumu servisi
├── numerology-service/     # Numeroloji servisi
├── oracle-service/         # Sentez servisi
├── notification-service/   # Bildirim servisi
├── vision-service/         # Goruntu analizi servisi
├── service-registry/       # Eureka Server
├── mystic-common/          # Ortak DTO ve event siniflari
├── mysticai-mobile/        # React Native mobil uygulama
├── docker/                 # Docker konfigurasyonlari
└── docs/                   # Dokumantasyon
```
