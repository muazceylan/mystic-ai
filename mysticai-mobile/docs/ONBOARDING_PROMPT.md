# Onboarding Modülü — Tasarım Referansı

Bu belge, onboarding akışının tasarım dilini ve adımlarını tanımlar.
Uygulama React Native (Expo) ile yazılmıştır.

## Tasarım Dili

- **Tema:** Mystic Dark Theme
- **Arka Plan:** Derin Siyah/Lacivert (`#0D0D0D`)
- **Vurgular:** Altın (`#D4AF37`) ve Mistik Mor (`#9D4EDD`)
- **Font:** Başlıklar Cinzel, metinler Lato
- **Görünüm:** Kartlar hafif transparan (Glassmorphism), kenarlar yuvarlatılmış

## Kullanıcı Akışı

Kullanıcı "Kayıt Ol" dediğinde tek bir uzun form yerine, çok adımlı bir wizard akışı görür.

### Adım 1 — E-posta ve İsim
- **Sosyal Giriş:** Google ve Apple ile giriş seçenekleri
- **Manuel Alternatif:** E-posta + şifre girişi

### Adım 2 — Doğum Tarihi
- Büyük ve şık Date Picker veya gün/ay/yıl scroll seçicisi
- Başlık: "Yıldızların konumunu hesaplamak için..."

### Adım 3 — Doğum Saati
- Saat seçici (Time Picker)
- Kritik: "Doğum saatimi bilmiyorum" checkbox'ı — seçilirse 12:00 varsayılan olarak gönderilir

### Adım 4 — Doğum Yeri
- Ülke ve Şehir girişi

### Adım 5 — Cinsiyet
- Seçenekler: Kadın, Erkek, Belirtmek İstemiyorum
- Seçilen kartın çerçevesi Altın renginde parlamalı

### Adım 6 — İlişki Durumu
- Bekar / İlişkisi Var / Nişanlı / Evli / Karmaşık

### Adım 7 — Odak Noktası
- Grid yapısı (2 sütun): Para & Finans, Aşk, Kariyer, Aile, Seyahat, Ruhsal Gelişim

## Teknik Notlar

- State: onboarding store'u (`useAuthStore` ya da ayrı `useOnboardingStore`)
- Sayfa geçişleri: `PageView` benzeri bir scroll yaklaşımı ya da `expo-router` push akışı
- Validasyon: eksik alan varsa ileri geçişi engelle
- Final action: tüm adımlar tamamlandığında `AuthService.register()` çağrısı
- Aktif implementasyon için: `src/app/(auth)/` route grubuna bakın
