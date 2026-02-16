# Mystic AI - Flutter Mobile & Web Application

Mystic AI mikroservis ekosistemi için Flutter tabanlı mobil ve web uygulaması.

## 🏗️ Mimari

### Clean Architecture

```
lib/
├── core/                    # Temel katman
│   ├── constants/          # Sabitler
│   ├── di/                 # Dependency Injection
│   ├── network/            # Dio & WebSocket
│   ├── storage/            # Secure Storage
│   └── theme/              # App Theme
├── data/                    # Veri katmanı
│   ├── models/             # Data Models (Freezed)
│   └── repositories/       # Repository Implementations
├── domain/                  # Domain katmanı (opsiyonel)
├── presentation/            # Sunum katmanı
│   ├── pages/              # Screens
│   ├── providers/          # State Management (Provider)
│   └── widgets/            # UI Components
└── main.dart
```

## 🎨 UI Kit

### Mystical Dark Theme

- **Background**: `#0D0D0D` (Dark)
- **Surface**: `#1A1A2E` (Dark Blue)
- **Card**: `#16213E` (Navy)
- **Primary Gold**: `#D4AF37`
- **Primary Purple**: `#9D4EDD`
- **Accent Teal**: `#00D9FF`
- **Accent Rose**: `#FF006E`

### Typography

- **Display**: Cinzel (Başlıklar)
- **Body**: Lato (İçerik)

## 📦 Kurulum

```bash
# Bağımlılıkları yükle
flutter pub get

# Code generation çalıştır
flutter pub run build_runner build --delete-conflicting-outputs

# Uygulamayı çalıştır
flutter run
```

## 🔌 API Entegrasyonu

### Dio (REST API)

```dart
final dioClient = DioClient(secureStorage);
final response = await dioClient.get('/oracle/daily-secret');
```

### WebSocket (STOMP)

```dart
final wsService = WebSocketService(secureStorage);
await wsService.connect();

// Bildirimleri dinle
wsService.messages.listen((message) {
  print('Yeni bildirim: ${message['title']}');
});
```

## 🎯 Özellikler

### Mevcut

- ✅ Mystical Dark Theme (Gold & Purple)
- ✅ Clean Architecture yapısı
- ✅ Provider State Management
- ✅ Dio HTTP Client
- ✅ STOMP WebSocket Client
- ✅ Oracle Card Widget (Günün Sırrı)
- ✅ Animated UI Components

### Gelecek

- [ ] Auth Flow (Login/Register)
- [ ] Dream Analysis Page
- [ ] Vision Upload (Coffee/Palm)
- [ ] Astrology Chart
- [ ] Numerology Calculator
- [ ] Notifications Page
- [ ] Profile Management

## 🧪 Test

```bash
# Unit tests
flutter test

# Integration tests
flutter test integration_test/

# Code coverage
flutter test --coverage
```

## 📱 Platform Desteği

| Platform | Status |
|----------|--------|
| iOS | ✅ |
| Android | ✅ |
| Web | ✅ |
| macOS | ⚠️ (Beta) |
| Windows | ⚠️ (Beta) |
| Linux | ⚠️ (Beta) |

## 🔐 Güvenlik

- JWT Token Secure Storage'da saklanır
- WebSocket bağlantısı token ile doğrulanır
- API istekleri otomatik token ile gönderilir

## 📚 Bağımlılıklar

| Paket | Amaç |
|-------|------|
| `provider` | State Management |
| `dio` | HTTP Client |
| `stomp_dart_client` | WebSocket/STOMP |
| `flutter_secure_storage` | Secure Storage |
| `google_fonts` | Typography |
| `flutter_animate` | Animations |
| `freezed` | Immutable Models |
| `get_it` | Dependency Injection |

## 🌐 Backend Bağlantısı

Varsayılan API URL: `http://localhost:8080`

WebSocket URL: `ws://localhost:8080/ws`

> Not: Android emülatörde `localhost` yerine `10.0.2.2` kullanın.

## 📄 Lisans

Bu proje Mystic AI ekosisteminin bir parçasıdır.
