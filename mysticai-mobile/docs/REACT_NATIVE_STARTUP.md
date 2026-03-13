# GÖREV: Mystic AI - React Native (Expo) Frontend Kurulumu

Mevcut Flutter projesini iptal edip, yerine **React Native (Expo)** kullanarak yeniden başlıyoruz. Mystic AI ekosistemi (11 Java Mikroservisi) ile konuşacak, modern, performanslı ve "Mistik Karanlık Tema"ya sahip bir mobil uygulama iskeleti oluşturmanı istiyorum.

## 1. Teknoloji Yığını (Tech Stack)
En güncel ve hatasız kurulum için şu yığını kullanacağız:
- **Framework:** React Native (Expo SDK 54)
- **Dil:** TypeScript
- **Navigasyon:** Expo Router (Dosya tabanlı routing)
- **Styling:** NativeWind (Tailwind CSS for React Native)
- **State Management:** Zustand (Basit ve güçlü global state)
- **Network:** Axios (REST) + TanStack Query (React Query - Caching için)
- **WebSocket:** StompJS (Java Spring Boot ile uyumlu)
- **Storage:** MMKV (Hızlı yerel depolama)
- **Animations:** React Native Reanimated 3

## 2. Proje Yapısı (Clean Architecture)
Proje kök dizininde `src/` klasörü altında şu yapıyı kur:

```text
src/
├── app/                 # Expo Router sayfaları (screens)
│   ├── (auth)/          # Login, Register, Onboarding (Wizard)
│   ├── (tabs)/          # Dashboard, Tarot, Profile (Alt menü)
│   └── _layout.tsx      # Ana layout yapılandırması
├── components/          # Reusable UI bileşenleri
│   ├── ui/              # Temel butonlar, inputlar (Atomik)
│   └── business/        # OracleCard, NatalChart (Business logic içerenler)
├── constants/           # Renkler, API URL'leri
├── hooks/               # Custom React Hooks (useAuth, useWebSocket)
├── services/            # API çağrıları (Axios instance, Endpoints)
├── store/               # Zustand store'ları (authStore, themeStore)
└── types/               # TypeScript arayüzleri (User, OracleResponse)
