# Paylaşılabilir Kart İlişki Tipi Smoke Check

Son güncelleme: 20 Mart 2026

## Amaç
Paylaşılabilir kart ekranında seçilen ilişki tipinin doğru tema ve başlıkla açıldığını hızlıca doğrulamak.

## Hızlı Test Akışı
1. Karşılaştırma modülünde ilgili ilişki tipini seç.
2. Analizi oluştur.
3. `Paylaşılabilir Kart` butonuna tıkla.
4. Kart üst başlığını ve renk temasını kontrol et.
5. `Hemen Paylaş` menüsünü açıp paylaşım akışının hata vermediğini doğrula.

## Kontrol Tablosu
| İlişki Tipi (Seçilen) | Param (`relationshipType`) | Beklenen Kart Başlığı | Beklenen Tema Yönü | Durum |
| --- | --- | --- | --- | --- |
| Aşk | `LOVE` / `love` / `ask` | `AŞK UYUMU • SYNASTRY KARTI` | Lila-pastel romantik | ☐ |
| İş | `BUSINESS` / `work` / `is` | `İŞ ORTAKLIĞI UYUMU • SYNASTRY KARTI` | Mavi-kurumsal | ☐ |
| Arkadaşlık | `FRIENDSHIP` / `friend` / `arkadaslik` | `ARKADAŞLIK UYUMU • SYNASTRY KARTI` | Pembe-mor canlı | ☐ |
| Aile | `FAMILY` / `family` / `aile` | `AİLE UYUMU • SYNASTRY KARTI` | Pudra/soft aile tonu | ☐ |
| Rekabet | `RIVAL` / `rival` / `rekabet` | `REKABET DİNAMİĞİ • SYNASTRY KARTI` | Gül kurusu/sert vurgu | ☐ |

## Beklenen Davranış
- Route paramıyla gelen ilişki tipi kart temasında önceliklidir.
- Backend (`getSynastry`) yalnızca fallback olarak kullanılmalıdır.
- `relationLabel` varsa başlıkla uyumlu görünmelidir.
- `Hemen Paylaş` aksiyonu sistem paylaşım menüsünü açmalı (Instagram yüklüyse listede görünmeli).
