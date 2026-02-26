# Ruhsal Pratikler Modulu - Kisa Urun Ozeti

## Urun Vizyonu

Mevcut astroloji mobil uygulamasina, kullanicinin gunluk ritmine kolayca dahil olabilecek bir `Ruhsal Pratikler` modulu eklemek:

- `Dua`: gunluk okunacak dualar + sayaç + sirali akış
- `Esmaul Husna`: gunun esmasi + kisa tefekkur + zikir sayaci
- `Nefes ve Farkindalik`: kisa egzersizler + timer + check-in
- `Gunluk`: log/habit tracker + streak + haftalik ozet

Amac, astroloji tarafini bozmadan kullanicinin duzenli pratik yapmasini tesvik etmektir.

## Konumlandirma (Astrolojiyi Golgelememe)

### MVP konumlandirma (onerilen)

- Ana tab yapisi degistirilmeden `Home` icinde `Ruhsal Pratikler` bolumu
- 3 kart: `Bugunun Duasi`, `Bugunun Esmasi`, `Bugunun Nefesi`
- Mevcut astroloji hero/ozet alanlarinin yerine gecmez

### v1 opsiyonu

- Ayrı `Ruhsal` tab (remote config ile kontrollu rollout)
- Kullanici davranisi olumlu ise kalici tab yapilabilir

## Urun Ilkeleri

### 1. Kisa ve surdurulebilir pratik

- Gunluk set 3-7 dua
- Kisa dualar hizli erisim
- 2-10 dk nefes/farkindalik egzersizleri

### 2. Hassas ve dogru dil

- Dini hukum iddiasi yok
- Tibbi/psikolojik vaad yok
- Her icerikte `Kaynak Notu` ve `Bilgilendirme`

### 3. Aliskanlik olusturma odagi

- Sayaç + ilerleme bari
- Streak / haftalik toplam
- Hatirlatici bildirimler
- Tamamlanma ozetleri

### 4. Teknik olarak dayanikli deneyim

- Bugunun icerigi offline cache
- Sayaç/timer akici ve lokal state ile anlik tepki verir
- Loglar arka planda gonderilir/senkronize edilir

## Ana Kullanici Senaryolari

### A. Sabah rutini (30-120 sn)

1. Kullanici uygulamayi acar
2. Home icinde `Bugunun Duasi` kartini gorur
3. Dua setine girer, ilk duayi okur
4. Sayaç ile tekrar sayisini tamamlar
5. Sonraki duaya gecer
6. Kisa ozet gorur ve cikis yapar

### B. Esma odakli kisa pratik (20-60 sn)

1. Kullanici `Bugunun Esmasi`na girer
2. Anlam + niyet cumlesini okur
3. Isterse 33 tekrar zikir sayaci kullanir
4. Log kaydi olusur

### C. Stres/sakinlesme ihtiyaci (2-5 dk)

1. Kullanici `Bugunun Nefesi`ne girer
2. Egzersizi baslatir (orn. box breathing)
3. Timer bitince mini check-in yapar
4. Oturum gunluge kaydedilir

## Bilgi Mimarisi (IA)

```text
Home
 -> Ruhsal Pratikler
    -> Bugunun Duasi
    -> Bugunun Esmasi
    -> Bugunun Nefesi
    -> Kisa Dualar
    -> Dua Gunlugum
    -> Ruhsal Ayarlar
```

## Tasarim Yonu (Mevcut mor/beyaz tema ile uyumlu)

- Mevcut ana tema korunur (mor/beyaz)
- Ruhsal modulde daha sakin `light` alt tonlar
- Vurgu renkleri:
  - mor (ana aksiyon)
  - yumusak altin (spiritual vurgu)
  - pastel yesil (tamamlandi/sakin)
- Tipografi:
  - mevcut uygulama tipografi sistemine uyum
  - okuma ekranlarinda daha buyuk satir araligi
- Bilesen hissi:
  - yumusak border/surface
  - okunabilirlik onceleme

## Basari Metrikleri (onerilen)

- Ruhsal modulu haftalik aktif kullanici orani
- Gunluk pratik tamamlama oranı
- 7 gun streak olusturma orani
- Ortalama gunluk tekrar sayisi (dua/esma)
- 2+ dakika egzersiz tamamlama orani
- Bildirimden acilis oranı

## Kapsam Disi (simdilik)

- Fetva/hukum/yorum motoru
- Topluluk/leaderboard (duyarlilik nedeniyle onerilmez)
- AI ile dini metin uretimi (editoryal risk yuksek)

