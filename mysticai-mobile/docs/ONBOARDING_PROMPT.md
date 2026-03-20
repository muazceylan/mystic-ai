# GÖREV: Flutter Çok Adımlı Kayıt (Onboarding) Modülü Geliştirme

Astro Guru projemiz için, kullanıcı deneyimini artıracak, modern ve şık bir "Sihirbaz" (Wizard) tabanlı kayıt akışı tasarlamanı ve kodlamanı istiyorum.

## 1. Tasarım Dili (ÖNEMLİ)
Referans görseller açık tema (light mode) olabilir ancak biz **Mystic Dark Theme** kullanıyoruz.
- **Arka Plan:** Derin Siyah/Lacivert (#0D0D0D)
- **Vurgular:** Altın (#D4AF37) ve Mistik Mor (#9D4EDD)
- **Font:** Başlıklar Cinzel, metinler Lato.
- **Görünüm:** Kartlar hafif transparan (Glassmorphism), kenarlar yuvarlatılmış.

## 2. Kullanıcı Akışı (User Flow)
Kullanıcı "Kayıt Ol" dediğinde tek bir uzun form yerine, `PageView` kullanan ve yumuşak geçişli şu adımları görecek:


### Adım 1: Mail ve isim soyisim bilgilerinin alınması
**Sosyal Giriş:** Kullanıcıyı karşılayan ilk ekranda "Google ile Giriş Yap" ve "Apple ile Giriş Yap" butonları olmalı (Referans: giris_yap.jpg).
- **Bilgi Alımı:** Sosyal giriş başarılı olduğunda ad, soyad ve e-posta bilgilerini otomatik al.
- **Manuel Alternatif:** Sosyal giriş kullanmak istemeyenler için şık bir "E-posta ile devam et" seçeneği sun ve manuel olarak isim, soyisim  ve e-posta giriş alanlarını göster ve  bir parola konulmasını iste.
### Adım 2: Doğum Tarihi (Birth Date)

- Büyük ve şık bir Date Picker veya gün/ay/yıl scroll seçicisi.
- Başlık: "Yıldızların konumunu hesaplamak için..."
- Soru: "Ne zaman doğdun?"

### Adım 3: Doğum Saati (Birth Time)
- Saat seçici (Time Picker).
- **Kritik Özellik:** Altına "Doğum saatimi bilmiyorum" Checkbox'ı.
- Eğer seçilirse saat otomatik 12:00 olarak backend'e gidecek ama kullanıcıya sorulmayacak.

### Adım 4: Doğum Yeri (Birth Location)
- Ülke ve Şehir girişi (Text Input).
- İkon: Konum ikonu.
- Placeholder: "İstanbul, Türkiye"

### Adım 5: Cinsiyet (Gender)
- Yan yana butonlar veya kartlar.
- Seçenekler: Kadın, Erkek, Belirtmek İstemiyorum.
- Seçilen kartın çerçevesi Altın (#D4AF37) renginde parlamalı.

### Adım 6: İlişki Durumu (Marital Status)
- Seçilebilir liste/kartlar:
    - Bekar
    - İlişkisi Var
    - Nişanlı
    - Evli
    - Karmaşık
- Başlık: "Kalbinin durumu nedir?"

### Adım 7: Odak Noktası / Niyet (Focus Point)
- Kullanıcının hayatında şu an neye odaklandığını soracağız.
- **Grid Yapısı (2 sütun):**
    - 💰 Para & Finans
    - ❤️ Aşk & İlişkiler
    - 💼 Kariyer & İş
    - 🏡 Aile & Ev
    - ✈️ Seyahat & Keşif
    - 🔮 Ruhsal Gelişim
- Çoklu seçim yapılabilir veya tek seçim (Tek seçim önerilir).

## 3. Teknik Gereksinimler
1. **State Management:** `OnboardingProvider` (ChangeNotifier) kullanarak tüm bu adımlardaki verileri geçici olarak tut.
2. **Controller:** Sayfa geçişleri için `PageController` kullan. "Devam Et" butonu sonraki sayfaya kaydırsın.
3. **Validasyon:** Tarih boşsa veya şehir girilmediyse sonraki sayfaya geçişi engelle.
4. **Final Action:** Son adımda "Tamamla" butonuna basınca `AuthService.register()` metodunu çağır (Modeli güncellemen gerekebilir).

## 4. Beklenen Çıktılar
- `lib/presentation/pages/auth/onboarding_page.dart` (Ana iskelet)
- `lib/presentation/pages/auth/steps/...` (Her adım için ayrı widget dosyaları - clean code için)
- `lib/presentation/providers/onboarding_provider.dart`
- `RegisterRequest` modeline yeni alanların eklenmesi.

Lütfen bu yapıya uygun Flutter kodlarını yaz.