# Mystic AI Usage Guide

Bu dokuman, projeyi sifirdan kaldirmak ve `503 /api/v1/auth/register` gibi startup hatalarini hizli cozmeye odaklanir.

## 1. Gereksinimler

- Java 21
- Maven 3.9+
- Node.js 20+
- Docker + Docker Compose
- `curl`, `lsof`, `pkill`

## 2. Temel Portlar

| Port | Servis |
| --- | --- |
| 5432 | PostgreSQL |
| 5672 | RabbitMQ |
| 6379 | Redis |
| 8761 | Service Registry (Eureka) |
| 8081 | auth-service |
| 8080 | API Gateway |
| 8025 | MailHog UI |
| 15672 | RabbitMQ UI |

## 3. Hizli Baslangic

```bash
# 1) Env dosyalarini hazirla
cp .env.example .env
cp mysticai-mobile/.env.example mysticai-mobile/.env

# 2) Altyapiyi ac
make infra

# 3) Tum backend servislerini baslat (health check dahil)
chmod +x start-services.sh
./start-services.sh

# 4) Mobil uygulamayi ac
cd mysticai-mobile
npm install
npm run start
```

## 4. start-services.sh Ne Yapar?

`./start-services.sh` asagidaki kontrolleri otomatik yapar:

1. `.env` yukler.
2. Infra portlarini kontrol eder (`5432`, `5672`, `6379`).
3. Eski Java processlerini temizler.
4. `mvn clean install -DskipTests` ile build alir.
5. Eureka ve auth-service'i once baslatir.
6. `AUTH-SERVICE` Eureka kaydini dogrular.
7. API Gateway'i baslatir.
8. Gateway uzerinden `/api/v1/auth/check-email` smoke check calistirir.
9. Sorun olursa ilgili loglardan son satirlari basar.

## 5. Saglik Kontrolu

```bash
curl http://localhost:8761
curl http://localhost:8081/actuator/health
curl http://localhost:8080/actuator/health
curl "http://localhost:8080/api/v1/auth/check-email?email=test@example.com"
```

Beklenen sonuc:

- `auth-service` ayakta ise son istek `200` doner.
- `503` aliyorsaniz gateway `auth-service`'e ulasamiyordur.

## 6. 503 Register Hatasi (En Cok Gorulen)

Semptom:

```text
api_error ... path: /api/v1/auth/register, status: 503
```

Kontrol sirasi:

1. `logs/gateway.log` icinde su satiri ara:
   - `No servers available for service: auth-service`
2. `logs/auth.log` icinde startup hatalarini kontrol et.
3. `auth-service` Eureka'da `UP` degilse gateway register'i 503 verir.

### SIK Sebep A: 8081 Port Cakismasi

`logs/auth.log`:

```text
Web server failed to start. Port 8081 was already in use.
```

Cozum:

```bash
lsof -ti :8081 | xargs kill -9
./start-services.sh
```

### SIK Sebep B: account_status Null Verisi

`logs/auth.log`:

```text
column "account_status" of relation "users" contains null values
```

Cozum:

```bash
docker exec -i mystic-postgres psql -U mystic -d mystic_auth -c \
"UPDATE users SET account_status='ACTIVE' WHERE account_status IS NULL;"
./start-services.sh
```

### SIK Sebep C: Infra Kapali

```bash
make infra
./start-services.sh
```

## 7. Mobil API URL Ayari

`mysticai-mobile/.env`:

```env
EXPO_PUBLIC_APP_ENV=dev
EXPO_PUBLIC_API_BASE_URL_DEV=http://localhost:8080
```

Notlar:

- Android emulator: `http://10.0.2.2:8080`
- Fiziksel cihaz testinde ngrok veya local IP kullanin.

## 8. Durum Komutlari

```bash
# Infra
docker compose ps

# Servis portlari
lsof -nP -iTCP:8761 -sTCP:LISTEN
lsof -nP -iTCP:8081 -sTCP:LISTEN
lsof -nP -iTCP:8080 -sTCP:LISTEN

# Loglar
tail -n 120 logs/auth.log
tail -n 120 logs/gateway.log
tail -n 120 logs/eureka.log
```

## 9. Tam Reset

```bash
pkill -f "service-registry|auth-service|api-gateway|astrology-service|numerology-service|dream-service|oracle-service|notification-service|vision-service|spiritual-service|ai-orchestrator" || true
docker compose down
make infra
./start-services.sh
```
