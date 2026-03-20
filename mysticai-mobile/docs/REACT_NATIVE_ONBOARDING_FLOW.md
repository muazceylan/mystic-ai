# Astro Guru - React Native (Expo) Onboarding Akış Planı

## 🏗 Teknik Mimari
- **Framework:** Expo (Router)
- **State:** Zustand (Onboarding Store)
- **Styling:** NativeWind (Tailwind)
- **Animasyon:** React Native Reanimated

## 🎨 Tasarım Sistemi 
docs klasöründeki ekran görüntülerine göre yapılacak.
## 🔄 Adım Adım Ekran Akışı

### 1. Hoşgeldin & Giriş (Landing)
- **Görsel Ref:** 1)giris_yap.jpg
- **İşlev:** Google & Apple ile Giriş.
- **Ekleme:** "E-posta ile devam et" butonu -> Manuel Ad, Soyad, Email, Şifre formu.

### 2. Doğum Tarihi
- **Görsel Ref:** 2)dogum_tarihi.jpg
- **İşlev:** Gün / Ay / Yıl seçimi. Otomatik burç hesaplama.

### 3. Doğum Saati
- **Görsel Ref:** 3)dogum_saati.jpg
- **İşlev:** Saat / Dakika seçimi + "Saatimi Bilmiyorum" checkbox.

### 4. Konum Seçimi
- **Görsel Ref:** 4)dogum_ulkesi.jpg,5)dogum_sehri.6)dogum_yeri_tamamlandi.jpg
- **İşlev:** Ülke ve Şehir arama (Searchable List).

### 5. Cinsiyet Seçimi
- **Görsel Ref:** 7)cinsiyet.jpg
- **İşlev:** Erkek / Kadın / Belirtmek İstemiyorum (İkonlu kartlar).

### 6. Odak Noktası (Niyet)
- **Görsel Ref:** 8)odak_noktasi.jpg
- **İşlev:** Para, Aşk, Kariyer vb. ikonlu 2x3 grid seçimi.

### 7. Final & Analiz
- **Görsel Ref:** 9)dogum_haritasi_cikar.jpg
- **İşlev:** "Doğum Haritamı Çıkar" (Backend Kayıt) veya "Şimdi Değil".
### 8. Anasayfa
- **Görsel Ref:** 10)uygulama_anasayfa.jpg
- **İşlev: Uygulama anasayfası açılır.Resimdeki gibi orta alanda servisten gelen swot analizi çıkartılır. alt kısımda haftalık yorum olsun. İsmi haftalık mistik yorum olsun. Tarot falı yazan kısım slider gibi dönsün. Tarot falı,rüya analizi,Numeroloji,haftanın analizi,Doğum haritası,İsim analizi seçenekleri olsun.Sayfadaki görsellerin işlevlerini teker teker birlikte yapalım.  

## 📡 Backend Bağlantısı
- Tüm veriler toplandıktan sonra `POST /api/v1/auth/register` ucuna gönderilir.