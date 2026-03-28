# Mystic AI — Windows Kurulum

## Gereksinimler (once kur)

| Araç | Minimum | İndir |
|------|---------|-------|
| Java JDK | 21 LTS | https://adoptium.net |
| Apache Maven | 3.9+ | https://maven.apache.org/download.cgi |
| Node.js | 20 LTS | https://nodejs.org |
| Docker Desktop | son sürüm | https://www.docker.com/products/docker-desktop |

> Maven kurulumu: zip'i çıkar, `bin` klasörünü PATH'e ekle.
> Java kurulumu: MSI installer'ı çalıştır, PATH otomatik eklenir.

---

## İlk Kurulum (tek seferlik)

**1. PowerShell'i Yönetici olarak aç:**
```
Win + X  →  "Windows PowerShell (Yönetici)"
```

**2. Script çalışma iznini ver (bir kez):**
```powershell
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

**3. Repo klasörüne git ve kurulumu başlat:**
```powershell
cd C:\mystic-ai          # repo neredeyse o yol
.\setup.ps1
```

Script şunları otomatik yapar:
- Prereq versiyonlarını kontrol eder
- `.env` dosyalarını oluşturur
- Docker altyapısını başlatır (PostgreSQL, RabbitMQ, Redis, MailHog)
- Tüm Java servislerini Maven ile derler
- Servisleri arka planda başlatır ve sağlık kontrolü yapar

**Süre:** ~5-10 dakika (ilk Maven build + Docker image pull)

---

## Günlük Kullanım

```powershell
# Sadece altyapıyı başlat
docker compose up -d postgres rabbitmq redis mailhog

# Servisleri başlat (build olmadan)
.\start-services.ps1 -SkipBuild

# Admin panel (ayrı terminalde)
cd mystic-admin
pnpm install   # ilk seferde
pnpm dev       # http://localhost:3000

# Mobil (ayrı terminalde)
cd mysticai-mobile
npm install    # ilk seferde
npm start      # Expo dev server
```

---

## Sağlık Kontrolü

```powershell
# Backend
curl http://localhost:8080/actuator/health
curl "http://localhost:8080/api/v1/auth/check-email?email=test@test.com"

# Paneller
# Eureka:   http://localhost:8761
# Swagger:  http://localhost:8080/swagger-ui.html
# MailHog:  http://localhost:8025
# RabbitMQ: http://localhost:15672  (mystic / mystic123)
```

---

## Sık Karşılaşılan Sorunlar

**Port zaten kullanımda (örn. 8081):**
```powershell
netstat -ano | findstr :8081
taskkill /PID <PID> /F
```

**Docker portları açık değil (5432/5672/6379):**
```powershell
docker compose up -d postgres rabbitmq redis mailhog
```

**Maven build hatası — bağımlılık indirilemiyor:**
```powershell
mvn clean install -DskipTests   # detaylı çıktı için -q kaldır
```

**Auth service başlamıyor — account_status NULL hatası:**
```powershell
docker exec -it mystic-postgres psql -U mystic -d mystic_auth -c "UPDATE users SET account_status='ACTIVE' WHERE account_status IS NULL;"
```

**Loglar:**
```
logs\eureka.log
logs\auth.log
logs\gateway.log
logs\notification.log
... (her servis için ayrı)
```
