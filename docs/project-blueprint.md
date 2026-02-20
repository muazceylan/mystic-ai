# 🔮 Mystic AI - Proje Mimari Mavi Kopyası (v3.0)

## 🏗️ Teknik Yığın (Tech Stack)

### Backend (Core)
- **Dil:** Java 21
- **Framework:** Spring Boot 3.4+
- **Mimari:** Event-Driven Microservices
- **AI Entegrasyonu:** Spring AI (OpenAI/Anthropic/Ollama)
- **Veritabanı:** PostgreSQL (Business Data), MySQL (Auth), Redis (Cache)
- **Mesajlaşma:** RabbitMQ (Asenkron İşlemler & Event Bus)

### Frontend (Mobile - React Native)
- **Framework:** React Native (Expo SDK 50+)
- **Routing:** Expo Router (Dosya tabanlı navigasyon)
- **State Management:** Zustand (Hafif ve hızlı global state yönetimi)
- **Styling:** NativeWind (Tailwind CSS)
- **Network:** Axios (REST), StompJS (WebSocket)
- **Depolama:** MMKV (Yüksek performanslı yerel saklama)

### DevOps & Infrastructure
- **Containerization:** Docker & Docker Compose
- **Service Discovery:** Netflix Eureka (Port: 8761)
- **API Gateway:** Spring Cloud Gateway (Port: 8080)
- **Observability:** Zipkin (Tracing), Micrometer, Actuator
- **Resilience:** Resilience4j (Retry & Circuit Breaker)

---

## 🔌 Servis Haritası ve Portlar

| Servis Adı | Port | Açıklama |
| :--- | :--- | :--- |
| **API Gateway** | `8080` | Tek giriş noktası, JWT Filtreleme, Dinamik Routing |
| **Auth Service** | `8081` | Manuel & Sosyal Kayıt/Giriş, Profil ve Role Yönetimi |
| **Astrology Service** | `8083` | Natal Chart hesaplama (Güneş, Ay, Yükselen konumları) |
| **AI Orchestrator** | `8084` | LLM Gateway. Prompt zenginleştirme ve AI Model seçimi |
| **Numerology Service** | `8085` | İsim ve doğum tarihi tabanlı kader sayısı analizleri |
| **Dream Service** | `8086` | Rüya kayıtları ve asenkron rüya yorumlama süreçleri |
| **Oracle Service** | `8087` | Aggregator. Tüm servis verilerini "Daily Secret" olarak sentezler |
| **Notification Service** | `8088` | WebSocket (STOMP) üzerinden anlık geri bildirimler |
| **Vision Service** | `8089` | Multimodal analiz (Kahve ve El falı görselleri için AI) |

---

## 🛠️ Kodlama ve Geliştirme Standartları

### Backend Kuralları
- **Data Transfer:** DTO'lar için Java 21 `record` yapısı kullanımı zorunludur.
- **Hata Yönetimi:** Merkezi `GlobalExceptionHandler` ile `ProblemDetails` formatında yanıtlar.
- **Test:** Testcontainers ile gerçek veritabanı ve RabbitMQ üzerinde entegrasyon testleri.
- **Güvenlik:** Stateless JWT tabanlı yetkilendirme.

### Frontend Kuralları (React Native & Expo)
- **Dizin Yapısı:** `src/app` (Routes), `src/components` (UI), `src/store` (State), `src/services` (API).
- **TypeScript:** Tüm bileşenler ve API modelleri için `Interface` tanımlanması zorunludur.
- **Responsive Design:** NativeWind ile farklı cihaz boyutlarına tam uyumluluk.
- **Theme:** "Mystic Dark" (#0D0D0D Arka Plan, #D4AF37 Altın, #9D4EDD Mor).

---

## 🧩 Onboarding ve Kayıt Akışı (V3.0)

React Native tarafında uygulanan 9 adımlık veri toplama ve kullanıcı oluşturma stratejisi:

1. **Giriş Metodu:** Sosyal Login (Google/Apple) veya Manuel E-posta/Şifre formu.
2. **Temel Bilgiler:** İsim, Soyisim ve E-posta verilerinin doğrulanması.
3. **Zaman:** Doğum günü (Burç hesaplama için) ve Doğum saati (Biliniyorsa).
4. **Lokasyon:** Ülke ve Şehir seçimi (Arama desteği ve manuel giriş opsiyonu).
5. **Kişisel:** Cinsiyet ve Medeni Durum seçimi.
6. **Odak:** Kullanıcının niyetini belirlediği 2x3 Grid (Aşk, Para, Kariyer, Sağlık vb.).
7. **Kayıt:** Tüm `zustand` store verilerinin tek seferde `POST /api/v1/auth/register` ucuna gönderilmesi.

---

## 🧪 Test Stratejisi
1. **Integration:** Mikroservislerin birbirleri ve mesaj kuyruğu ile uyumu.
2. **Mobile Debug:** Expo Go ile fiziksel cihazlarda performans ve arayüz testi.
3. **E2E:** Postman ve Newman scriptleri ile uçtan uca senaryo doğrulama.

## 1️⃣ Altyapı Kurulumu

### Docker Compose ile Altyapıyı Başlatma

```bash
# Proje dizinine git
cd /Users/solvia/Documents/mystcai/mystic-ai

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
# - mystic_dream
# - mystic_oracle
# - mystic_notification
# - mystic_vision
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
mvn clean install -pl auth-service -am -DskipTests
```

### Servisleri Sırayla Başlatma

> ⚠️ **Önemli**: Servisleri aşağıdaki sırayla başlatın!

```bash
# 1. Service Registry (Eureka) - Önce başlamalı
java -jar service-registry/target/service-registry-*.jar &
sleep 10

# 2. Auth Service
java -jar auth-service/target/auth-service-*.jar &
sleep 5

# 3. AI Orchestrator
java -jar ai-orchestrator/target/ai-orchestrator-*.jar &
sleep 5

# 4. Diğer servisler (paralel başlatılabilir)
java -jar astrology-service/target/astrology-service-*.jar &
java -jar numerology-service/target/numerology-service-*.jar &
java -jar dream-service/target/dream-service-*.jar &
java -jar oracle-service/target/oracle-service-*.jar &
java -jar notification-service/target/notification-service-*.jar &
java -jar vision-service/target/vision-service-*.jar &
sleep 5

# 5. API Gateway (Son başlamalı)
java -jar api-gateway/target/api-gateway-*.jar &
```

### Tek Komutla Tüm Servisleri Başatma (Script)

```bash
# start-services.sh dosyası oluştur
cat > start-services.sh << 'EOF'
#!/bin/bash

echo "🔮 Mystic AI Servisleri Başlatılıyor..."

# Kill existing Java processes
echo "🧹 Eski process'ler temizleniyor..."
pkill -f "service-registry" || true
pkill -f "auth-service" || true
pkill -f "ai-orchestrator" || true
pkill -f "astrology-service" || true
pkill -f "numerology-service" || true
pkill -f "dream-service" || true
pkill -f "oracle-service" || true
pkill -f "notification-service" || true
pkill -f "vision-service" || true
pkill -f "api-gateway" || true

sleep 2

# Build
echo "🔨 Maven build başlatılıyor..."
mvn clean install -DskipTests -q

echo "🚀 Servisler başlatılıyor..."

# 1. Eureka
echo "📍 Eureka Service Registry..."
nohup java -jar service-registry/target/service-registry-*.jar > logs/eureka.log 2>&1 &
sleep 15

# 2. Core Services
echo "🔐 Auth Service..."
nohup java -jar auth-service/target/auth-service-*.jar > logs/auth.log 2>&1 &
sleep 5

echo "🤖 AI Orchestrator..."
nohup java -jar ai-orchestrator/target/ai-orchestrator-*.jar > logs/ai.log 2>&1 &
sleep 5

echo "⭐ Astrology Service..."
nohup java -jar astrology-service/target/astrology-service-*.jar > logs/astrology.log 2>&1 &

echo "🔢 Numerology Service..."
nohup java -jar numerology-service/target/numerology-service-*.jar > logs/numerology.log 2>&1 &

echo "💭 Dream Service..."
nohup java -jar dream-service/target/dream-service-*.jar > logs/dream.log 2>&1 &

echo "🔮 Oracle Service..."
nohup java -jar oracle-service/target/oracle-service-*.jar > logs/oracle.log 2>&1 &

echo "🔔 Notification Service..."
nohup java -jar notification-service/target/notification-service-*.jar > logs/notification.log 2>&1 &

echo "👁️ Vision Service..."
nohup java -jar vision-service/target/vision-service-*.jar > logs/vision.log 2>&1 &

sleep 5

# 4. API Gateway
echo "🌐 API Gateway..."
nohup java -jar api-gateway/target/api-gateway-*.jar > logs/gateway.log 2>&1 &

echo "✅ Tüm servisler başlatıldı!"
echo ""
echo "📊 Monitoring:"
echo "  - Eureka: http://localhost:8761"
echo "  - Swagger: http://localhost:8080/swagger-ui.html"
echo "  - Zipkin: http://localhost:9411"
echo "  - RabbitMQ: http://localhost:15672"
echo ""
echo "📝 Loglar: logs/ dizininde"
EOF

chmod +x start-services.sh
mkdir -p logs
./start-services.sh
```

### Servisleri Docker ile Başatma

```bash
# Tüm servisleri Docker Compose ile başlat
docker-compose up -d

# Veya sadece backend servisleri
docker-compose up -d service-registry auth-service ai-orchestrator astrology-service numerology-service dream-service oracle-service notification-service vision-service api-gateway

# Logları izle
docker-compose logs -f api-gateway
```

---

## 3️⃣ Port Haritası

### Servis Portları

```
┌─────────────────────────────────────────────────────────────┐
│                    MYSTIC AI PORT MAP                       │
├──────────────┬────────┬─────────────────────────────────────┤
│ Servis       │ Port   │ Açıklama                            │
├──────────────┼────────┼─────────────────────────────────────┤
│ Eureka       │ 8761   │ Service Discovery                   │
│ Zipkin       │ 9411   │ Distributed Tracing                 │
│ RabbitMQ     │ 5672   │ Message Queue (AMQP)                │
│ RabbitMQ UI  │ 15672  │ RabbitMQ Management                 │
├──────────────┼────────┼─────────────────────────────────────┤
│ API Gateway  │ 8080   │ Ana API Girişi                      │
│ Auth         │ 8081   │ JWT Authentication                  │
│ Astrology    │ 8083   │ Natal Chart & Horoscope             │
│ AI Orchestr. │ 8084   │ AI Interpretation Engine            │
│ Numerology   │ 8085   │ Pythagorean Numerology              │
│ Dream        │ 8086   │ Dream Interpretation                │
│ Oracle       │ 8087   │ Grand Synthesis                     │
│ Notification │ 8088   │ WebSocket Notifications             │
│ Vision       │ 8089   │ Image Analysis (Coffee/Palm)        │
└──────────────┴────────┴─────────────────────────────────────┘
```

### Portları Kontrol Etme

```bash
# Tüm portları kontrol et
lsof -i :8761,9411,15672,8080,8081,8082,8083,8084,8085,8086,8087,8088,8089

# Veya netstat ile
netstat -tuln | grep -E ':(8761|9411|15672|8080|8081|8082|8083|8084|8085|8086|8087|8088|8089)'

# Port kullanan process'leri gör
lsof -ti:8080 | xargs ps
```

---

## 4️⃣ Monitoring Arayüzleri

### Eureka Service Registry
```
URL: http://localhost:8761
Açıklama: Tüm mikroservislerin kayıt durumu
```

### Zipkin Distributed Tracing
```
URL: http://localhost:9411
Açıklama: Request tracing ve latency analizi
Kullanım: Bir request'in tüm servisler arası yolculuğunu izleme
```

### RabbitMQ Management
```
URL: http://localhost:15672
Kullanıcı: guest
Şifre: guest

Özellikler:
- Queue'ları görüntüleme
- Message rate monitoring
- Connection management
```

### Swagger UI (API Documentation)
```
URL: http://localhost:8080/swagger-ui.html
Açıklama: Tüm API endpoint'lerinin dokümantasyonu
```

### Actuator Health Checks
```bash
# Gateway health
curl http://localhost:8080/actuator/health

# Individual service health
curl http://localhost:8081/actuator/health
curl http://localhost:8082/actuator/health
# ... etc
```

---

## 5️⃣ React Native Frontend

### Kurulum

cd mysticai-mobile
npm install

### Çalıştırma

# Geliştirme sunucusunu başlat
npx expo start

# Android için (Emülatör açık olmalı)
npx expo run:android

# iOS için (Simulator açık olmalı)
npx expo run:ios
### Build



## 6️⃣ Test Akışı

### Postman Koleksiyonunu Import Etme

```bash
# Postman'i aç
# File → Import → Upload Files
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

# Sadece Auth flow'u çalıştır
cd docs/postman
newman run MysticAI_Collection.json \
  -e MysticAI_Environment.json \
  --folder "01 - Auth Flow"

# HTML rapor ile çalıştır
cd docs/postman
newman run MysticAI_Collection.json \
  -e MysticAI_Environment.json \
  --reporters cli,html \
  --reporter-html-export test-report.html

# CI/CD için (sadece hata durumunda exit code)
cd docs/postman
newman run MysticAI_Collection.json \
  -e MysticAI_Environment.json \
  --bail
```

### Manuel Test Adımları

```bash
# 1. Health Check
curl http://localhost:8080/actuator/health

# 2. Register
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "testuser",
    "email": "test@mysticai.com",
    "password": "TestPass123!",
    "firstName": "Test",
    "lastName": "User",
    "birthDate": "1990-05-15",
    "birthTime": "14:30",
    "birthLocation": "Istanbul, Turkey"
  }'

# 3. Login (Token al)
TOKEN=$(curl -s -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123!"}' \
  | jq -r '.token')

echo "Token: $TOKEN"

# 4. Numerology hesapla
curl http://localhost:8080/api/numerology/calculate \
  -H "Authorization: Bearer $TOKEN" \
  -G -d "name=Test User" -d "birthDate=1990-05-15"

# 5. Oracle Daily Secret
curl http://localhost:8080/api/oracle/daily-secret \
  -H "Authorization: Bearer $TOKEN" \
  -G -d "includeAstrology=true" \
  -d "includeNumerology=true" \
  -d "includeDreams=true"
```

---

## 7️⃣ Hata Giderme (Troubleshooting)

### Port Already in Use

```bash
# Hata: "Port 8080 was already in use"

# Çözüm 1: Port kullanan process'i bul ve öldür
lsof -ti:8080 | xargs kill -9

# Çözüm 2: Tüm Java process'lerini öldür
pkill -f java

# Çözüm 3: Docker port conflict
# Eğer Docker kullanıyorsan, container'ı durdur
docker-compose down

# Çözüm 4: Farklı port kullan
# application.yml'de port değiştir
server:
  port: 8090  # Alternatif port
```

### Gateway Timeout

```bash
# Hata: "504 Gateway Timeout"

# Çözüm 1: Servislerin çalıştığını kontrol et
curl http://localhost:8761  # Eureka

# Çözüm 2: Eureka'da kayıtlı servisleri kontrol et
# http://localhost:8761 adresinden kontrol et

# Çözüm 3: Servis loglarını kontrol et
tail -f logs/oracle.log

# Çözüm 4: Circuit breaker açık olabilir, bekle veya restart
# Resilience4j circuit breaker 30 saniyede resetlenir
```

### Database Connection Failed

```bash
# Hata: "Connection refused" veya "Database not found"

# Çözüm 1: PostgreSQL container'ını kontrol et
docker-compose ps postgres
docker-compose logs postgres

# Çözüm 2: Veritabanlarını yeniden oluştur
docker-compose down -v  # Volumes'leri de sil
docker-compose up -d postgres

# Çözüm 3: Manuel veritabanı oluşturma
docker exec -it mystic-postgres psql -U mystic -c "CREATE DATABASE mystic_auth;"
```

### WebSocket Connection Failed

```bash
# Hata: WebSocket bağlantı hatası

# Çözüm 1: API Gateway WebSocket yapılandırmasını kontrol et
# GatewayConfig.java'de /ws/** route'u olmalı

# Çözüm 2: RabbitMQ bağlantısını kontrol et
curl http://localhost:15672/api/overview -u guest:guest

# Çözüm 3: Notification Service loglarını kontrol et
tail -f logs/notification.log
```

### JWT Token Expired

```bash
# Hata: "401 Unauthorized - Token expired"

# Çözüm: Yeni token al
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"TestPass123!"}'
```

### Maven Build Failure

```bash
# Hata: "Could not resolve dependencies"

# Çözüm 1: Maven cache'i temizle
mvn clean
rm -rf ~/.m2/repository/com/mysticai

# Çözüm 2: Offline mode'da çalışma
mvn clean install -o

# Çözüm 3: Dependency tree kontrolü
mvn dependency:tree
```


### Servis Başlatma Sırası Hataları

```bash
# Hata: "Eureka connection refused"

# Çözüm: Eureka'nın tamamen başlamasını bekle
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

# 3. Frontend'i çalıştır
npx expo start --ios --port 8800 --clear

# 4. Test et
curl http://localhost:8080/actuator/health
newman run docs/postman/MysticAI_Collection.json -e docs/postman/MysticAI_Environment.json
```

---

## 📊 Log İzleme

```bash
# Tüm servis loglarını izle
tail -f logs/*.log

# Belirli bir servisin logunu izle
tail -f logs/oracle.log

# Docker loglarını izle
docker-compose logs -f api-gateway

# Logları filtrele
grep "ERROR" logs/*.log
grep "OracleService" logs/oracle.log
```

---

## 🔄 Sıfırdan Reset

```bash
# Tümüyle temiz başlangıç

# 1. Servisleri durdur
pkill -f java
docker-compose down -v

# 2. Logları temizle
rm -rf logs/*

# 3. Maven cache'i temizle
mvn clean

# 5. Yeniden başlat
docker-compose up -d
mvn clean install -DskipTests
./start-services.sh
```

---

**Hazırlayan**: Mystic AI Development Team  
**Son Güncelleme**: 2026-01-31  
**Versiyon**: 1.0.0
