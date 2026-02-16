# Mystic AI - Postman Collection

## 📦 İçerik

Bu dizinde Mystic AI mikroservis ekosistemi için hazırlanmış Postman collection ve environment dosyaları bulunmaktadır.

## 🚀 Hızlı Başlangıç

### 1. Import İşlemleri

Postman'de aşağıdaki dosyaları import edin:

1. **Environment**: `MysticAI_Environment.json`
2. **Collection**: `MysticAI_Collection.json`

### 2. Sırasıyla Çalıştırın

Collection içindeki istekler mantıksal gruplara ayrılmıştır:

#### Adım 1: Auth Flow
1. **Register** - Kullanıcı kaydı oluşturun
2. **Login** - JWT token alın (otomatik olarak environment'e kaydedilir)
3. **Get Current User** - Kullanıcı bilgilerini doğrulayın

#### Adım 2: Mystic Services
- **Numerology** → İsim ve doğum tarihine göre numeroloji hesaplaması
- **Astrology** → Doğum haritası, periyodik analiz, SWOT analizi
- **Dream** → Rüya kaydı ve yorumlama
- **Vision** → Kahve falı ve el falı fotoğraf yükleme
- **The Oracle** → Tüm verilerin birleştirildiği "Günlük Sır"

#### Adım 3: Notifications
- Bildirimleri listeleme, okundu olarak işaretleme
- **WebSocket**: Gerçek zamanlı bildirimler için `/ws/notifications` endpoint'ine bağlanın

#### Adım 4: System Health
- Servis sağlık kontrolleri

## 🔧 Environment Variables

| Variable | Açıklama |
|----------|----------|
| `baseUrl` | API Gateway URL (varsayılan: http://localhost:8080) |
| `jwt_token` | Login sonrası otomatik doldurulur |
| `userId` | Login sonrası otomatik doldurulur |
| `dream_id` | Rüya kaydı sonrası otomatik doldurulur |
| `notification_id` | Bildirim listesi sonrası otomatik doldurulur |
| `vision_analysis_id` | Görüntü analizi sonrası otomatik doldurulur |

## 🧪 Test Senaryoları

### Senaryo 1: Temel Akış
```
Register → Login → Numerology Calculate → Get Daily Secret
```

### Senaryo 2: Rüya Analizi
```
Login → Post Dream → (AI Orchestrator işlemi) → Get Notifications (yorum geldiğinde)
```

### Senaryo 3: Vision Analizi
```
Login → Upload Coffee Cup Photo → (AI Orchestrator işlemi) → Get Vision Analyses
```

### Senaryo 4: Tam Deneyim
```
Login → 
  ├── Numerology Calculate
  ├── Get Natal Chart
  ├── Post Dream
  ├── Upload Palm Photo
  └── Get Daily Secret (tüm veriler birleştirilir)
```

## 📝 Notlar

### Vision Servisi için Dosya Yükleme
Vision isteklerinde (`Upload Coffee Cup Photo`, `Upload Palm Photo`) dosya yolunu kendi sisteminize göre ayarlamalısınız:

```json
{
  "key": "image",
  "type": "file",
  "src": "/Users/sizin/kullanici/adi/Masaustu/coffee.jpg"
}
```

### WebSocket Bağlantısı
Gerçek zamanlı bildirimler için WebSocket'e bağlanın:
- **URL**: `ws://localhost:8080/ws/notifications`
- **STOMP Endpoint**: `/topic/notifications/{userId}`
- **Heartbeat**: 10 saniye

### AI Analizi Süresi
Rüya ve Vision analizleri RabbitMQ üzerinden asenkron işlenir:
- Tipik süre: 2-10 saniye
- Bildirim servisi analiz tamamlandığında WebSocket üzerinden push eder

## 🔍 Troubleshooting

### 401 Unauthorized
- JWT token'ın süresi dolmuş olabilir
- Login isteğini tekrar çalıştırın

### 503 Service Unavailable
- İlgili servis çalışmıyor olabilir
- `docker-compose ps` ile kontrol edin
- `docker-compose up -d` ile servisleri başlatın

### WebSocket Bağlantı Hatası
- API Gateway'in çalıştığından emin olun
- Tarayıcı/WebSocket istemcisi CORS politikalarını desteklemelidir

## 📊 Koleksiyon Yapısı

```
Mystic AI - Complete API Collection
├── 01 - Auth Flow
│   ├── Register
│   ├── Login
│   └── Get Current User
├── 02 - Mystic Services
│   ├── Numerology
│   ├── Astrology
│   ├── Dream
│   ├── Vision
│   └── The Oracle
├── 03 - Notifications
│   ├── Get Unread Notifications
│   ├── Get All Notifications
│   ├── Get Unread Count
│   ├── Mark Notification as Read
│   └── Mark All as Read
└── 04 - System Health
    ├── Gateway Health
    └── Auth Service Health
```

## 🔄 CI/CD Entegrasyonu

Newman ile otomatik test:

```bash
# Newman kurulumu
npm install -g newman

# Collection çalıştırma
newman run MysticAI_Collection.json \
  -e MysticAI_Environment.json \
  --folder "01 - Auth Flow"

# Tüm testler
newman run MysticAI_Collection.json \
  -e MysticAI_Environment.json \
  --reporters cli,html \
  --reporter-html-export report.html
```

## 📚 İlgili Dokümanlar

- [Project Blueprint](../project-blueprint.md)
- [API Gateway](../../api-gateway/src/main/java/com/mysticai/gateway/config/GatewayConfig.java)
- [AI Orchestrator](../../ai-orchestrator/src/main/java/com/mysticai/orchestrator/)
