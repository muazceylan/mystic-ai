# Ruhsal Pratikler Modulu - Guvenlik, Gizlilik ve Hassas Icerik Notlari

Bu belge, modulu guvenli ve hassasiyetlere uygun sekilde sunmak icin temel prensipleri tanimlar.

## F) Guvenlik + Gizlilik + Hassas Icerik

## 1. Uygulama Dili ve Sorumluluk Siniri

### Zorunlu mesajlar

Her ilgili ekranda uygun sekilde gosterilmelidir:

- `Bu icerikler bilgilendirme amaclidir.`
- `Meditasyon/Nefes bolumu nefes ve farkindalik egzersizi olarak sunulur.`

Meditasyon ekraninda ek mesaj:
- `Bu egzersiz tibbi tavsiye degildir. Rahatsizlik durumunda uzman gorusu alin.`

### Kacinilmasi gereken dil

- `tedavi eder`, `garanti eder`, `kesin sonuc`, `sifa verir` gibi iddiali ifadeler
- dini hukum/fetva veriyormus gibi kesin yargilar
- psikolojik tani/teshis dili

## 2. Dini Icerik Hassasiyeti ve Dogruluk

Her icerikte olmasi gereken alanlar:
- `sourceLabel`
- `sourceNote`
- `disclaimerText`

Urun davranisi:
- `Kaynak Notu` kullaniciya gorunur olmali
- `Bilgilendirme` gizlenmemeli (minimum detay ekraninda sabit)
- Hatali icerik bildirim butonu bulunmali

Editoryal surec (onerilen):
1. Icerik ekleme
2. Kaynak notu/dogrulama kontrolu
3. Editoryal onay
4. Publish/version
5. Kullanici raporu varsa revizyon

## 3. Kullanici Verisi Gizliligi (KVKK/GDPR Genel Prensipler)

### Toplanan veri tipleri

- Dua / Esma tekrar sayilari
- Meditasyon seans sureleri
- Ruh hali (mood) secimleri
- Opsiyonel notlar
- Hatirlatici tercihleri

Bunlar kisisel veri olarak degerlendirilmelidir.

### Minimizasyon

- Gerekmedikce serbest metin (note) zorunlu olmamali
- Mood alanlari enum ile sinirlanmali
- Dogrudan PII olmayan alanlar tercih edilmeli

### Saklama ve erisim

- Kullanici yalniz kendi loglarini gorebilir
- Backend tarafinda JWT subject ile data ownership dogrulanmali
- Admin erisimi varsa audit log ile izlenmeli

### Veri yasam dongusu (onerilen)

- Export (JSON)
- Delete / retention policy
- Hesap silmede ilgili gunluk verilerinin silinmesi veya anonimlestirilmesi

## 4. Mobil Tarafta Guvenli Saklama

MVP:
- Query cache + pending queue local saklanir
- Hassas local payload icin sifreleme katmani planlanir

v1/v2 onerisi:
- `expo-secure-store` ile encryption key sakla
- Log/pending queue verisini sifreleyerek sakla (AsyncStorage veya local DB)
- TTS/tema gibi non-sensitive preference'lar normal storage'da tutulabilir

Not:
- Tam gunluk notlari plain text olarak kontrolsuz saklamak risklidir

## 5. Backend Guvenlik Kontrolleri

### Kimlik dogrulama / yetkilendirme

- JWT zorunlu
- `userId` request body'den degil JWT'den alinmali
- Cross-user access engellenmeli

### Input validation

- `count`, `durationSec`, `note`, `mood` alanlari validasyonlu olmali
- SQL injection riskini ORM + param binding ile azalt
- Not alanlarinda uzunluk siniri ve gerekirse content moderation

### Rate limiting (Redis)

- Log endpointlerinde spam korumasi
- `content/report` endpointinde abuse korumasi

### Idempotency / duplicate koruma

- `Idempotency-Key` veya `client_session_id`
- Ayni seansin tekrar gonderimi duplicate log olusturmamali

## 6. Bildirimler ve Kullanici Izinleri

- Bildirimler opt-in olmali
- Kullanici saat ve gun secimi yapabilmeli
- `sadece hafta ici` gibi tercih desteklenmeli
- Sessiz saatler (v1) icin altyapi dusunulmeli

Bildirim icerik dili:
- Nötr ve saygili
- Baskilayici olmayan ton
- Dini/tibbi iddia icermeyen ifadeler

## 7. Icerik Raporlama ve Olay Yonetimi

`Hatali Icerik Bildir` akisi:
- `content_type` (`PRAYER`, `ASMA`, `MEDITATION`)
- `content_id`
- `reason` (`KAYNAK`, `YAZIM`, `ANLAM`, `HASSASIYET`, `DIGER`)
- opsiyonel not

Operasyonel beklenti:
- Raporlar `OPEN -> REVIEWING -> RESOLVED` durumlariyla takip edilmeli
- Yuksek hassasiyet raporlari hizli incelenmeli
- Icerik publish version ile rollback desteklenmeli

## 8. Gozlemlenebilirlik ve Audit (onerilen)

Takip edilmesi gereken sinyaller:
- Auth basarisizligi oranı
- Rate limit hit orani
- Duplicate log reject oranı
- `content/report` hacmi ve kategori dagilimi
- Daily endpoint latency / cache hit rate

Audit event ornekleri:
- preference update
- reminder enable/disable
- content report create
- content version publish

## 9. Uygulama Icinde Onerilen Bilgilendirme Metni (kisa)

Detay ekranlari icin:

```text
Bu icerik bilgilendirme amaclidir. Kaynak notunu inceleyiniz.
```

Meditasyon/Nefes ekrani icin:

```text
Bu bolum nefes ve farkindalik egzersizi sunar; dini hukum veya tibbi tavsiye yerine gecmez.
```

