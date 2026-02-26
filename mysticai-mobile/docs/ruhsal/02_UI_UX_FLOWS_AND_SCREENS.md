# Ruhsal Pratikler Modulu - UI/UX Akislari ve Ekranlar

Bu belge ekran listesini, akislari ve her ekran icin state/loading/error/empty durumlarini tanimlar.

## Genel Navigasyon Yaklasimi

### MVP

- `Home` icinde `Ruhsal Pratikler` bolumu
- Detay ekranlar `expo-router` ile `/spiritual/*` altinda acilir

### v1 (opsiyonel)

- Ayrı `Ruhsal` bottom tab
- `Home` kartlari tab icine deep-link gibi davranir

## Ekran Envanteri

### 1. Home > Ruhsal Pratikler Karti Grubu

Kartlar:
- `Bugunun Duasi`
- `Bugunun Esmasi`
- `Bugunun Nefesi`
- `Kisa Dualar` (chip/mini card row)

Bilesenler:
- `DailyPrayerCard`
- `DailyAsmaCard`
- `DailyBreathCard`
- `ShortPrayersQuickRow`
- `SectionHeader`

Durumlar:
- Loading: 3 skeleton card
- Error: tek `ErrorStateCard` + `Tekrar Dene`
- Empty: `Bugun icerik hazirlaniyor`

### 2. Dua Akisi

#### 2.1 Bugunun Dua Seti Listesi

Gosterimler:
- Gunun tarihi
- Set ilerleme durumu (`2/5 tamamlandi`)
- Dua item listesi (kisa + orta karisik)
- `Devam et` CTA

Bilesenler:
- `PrayerSetHeader`
- `PrayerListItem`
- `SetProgressPill`
- `ContinueFlowButton`

Durumlar:
- Loading: list skeleton
- Error: retry
- Empty: `Bugun icin dua seti bulunamadi`

#### 2.2 Dua Detay Ekrani

Gosterimler:
- Baslik
- Kategori
- Kaynak etiketi + kaynak notu
- Sekmeler: `Arapca`, `Okunus`, `Meal`
- Font kontrolleri (`A-`, `A+`)
- Favori
- Kopyala/Paylas (opsiyonel)
- TTS butonu (varsayilan kapali)
- Bilgilendirme/disclaimer

Bilesenler:
- `PrayerHeader`
- `SegmentTabs`
- `PrayerTextPanel`
- `FontSizeControls`
- `SourceNoteCard`
- `DisclaimerCard`
- `ActionRow`

Durumlar:
- `arabicText` yoksa `Arapca` sekmesi gizlenir veya disabled tooltip ile sunulur

#### 2.3 Dua Sayaç / Devam Akisi

Gosterimler:
- Aktif dua
- Tekrar sayaçi
- `+1`, `+5`, `+10`
- Basili tut hizli artis
- Ilerleme bari (`count / recommendedRepeatCount`)
- `Sonraki Duaya Gec`

Bilesenler:
- `PrayerCounter`
- `CounterQuickActions`
- `CounterProgressBar`
- `FlowFooterCta`

UX Notlari:
- Her artis network'e gitmez; local state
- Haptic feedback (opsiyonel tercih)
- Tamamlanma aninda yumusak durum degisimi (renk/ikon)

#### 2.4 Dua Tamamlandi Ekrani

Gosterimler:
- `Bugun su duayi X kere okudun` ozeti
- Mood secimi (`sakin`, `sukurlu`, `gergin` vb.)
- Not (opsiyonel)
- Kaydet / Sonraki

Bilesenler:
- `CompletionSummaryCard`
- `MoodChipGroup`
- `OptionalNoteInput`
- `SaveAndContinueButton`

## 3. Esma Akisi

### 3.1 Gunun Esmasi

Gosterimler:
- Arapca yazilis
- Turkce okunus
- Kisa anlam
- Kisa tefekkur/niyet cumlesi
- (Opsiyonel) zikir sayaci `33/99`

Bilesenler:
- `AsmaHeroCard`
- `MeaningCard`
- `IntentionCard`
- `DhikrCounter`
- `SourceNoteCard`

### 3.2 Tum Esmalar

Gosterimler:
- Arama
- Filtre: `rahmet`, `rizik`, `koruma`, ...
- Siralama: alfabetik / numara / tema

Bilesenler:
- `SearchInput`
- `FilterChips`
- `AsmaListItem`
- `EmptySearchState`

Durumlar:
- Empty (arama): `Sonuc bulunamadi`

### 3.3 Esma Detay

Gosterimler:
- Esma basligi
- Anlam
- Tefekkur
- Sayaç
- Kaynak notu

## 4. Meditasyon / Nefes Akisi

### 4.1 Gunun Egzersizi Ekrani

Gosterimler:
- Baslik
- Tur (`nefes`, `farkindalik`, `beden tarama`)
- Sure secimi (2/5/10 dk; exercise destekliyorsa)
- Adim adim yonergeler
- Bilgilendirme (dini hukum/tibbi iddia yok)

Bilesenler:
- `ExerciseHeroCard`
- `DurationChips`
- `StepsList`
- `StartPauseButton`
- `DisclaimerCard`

### 4.2 Timer Ekrani

Gosterimler:
- Faz (`Inhale`, `Hold`, `Exhale`)
- Animasyonlu sayaç
- Gecen sure
- Kalan sure
- Dongu sayisi
- Baslat / Duraklat / Bitir

Bilesenler:
- `BreathAnimationCanvas` (Reanimated/SVG)
- `PhaseLabel`
- `CycleCounter`
- `SessionControlBar`

Performans notu:
- UI timer frame akici olmali
- Network islemi seans sonunda

### 4.3 Bitis Check-in

Gosterimler:
- `Nasil hissediyorsun?`
- Mood before / after (opsiyonel before oturum basinda da alinabilir)
- Not (opsiyonel)
- Kaydet

Bilesenler:
- `MoodCheckinSheet`
- `MoodChipGroup`
- `SessionSummaryRow`

## 5. Dua Gunlugum (Log / Habit Tracker)

### 5.1 Ana Gunluk Ekrani

Gosterimler:
- Takvim / heatmap
- Gun bazli log listesi
- Haftalik istatistik kartlari
- Streak badge

Bilesenler:
- `JournalCalendar`
- `JournalDayList`
- `WeeklyStatsCards`
- `StreakBadge`

Durumlar:
- Empty: `Henuz kayit yok. Bugunun pratigini baslat.`

### 5.2 Gun Detay

Gosterimler:
- Seçili tarihteki tum loglar
- Dua/Esma/Meditasyon itemleri
- Toplam tekrar / sure
- Notlar

## 6. Ruhsal Ayarlar

Ayarlari:
- Hatirlatici saatleri (sabah/aksam, hafta ici)
- Font boyutu
- TTS varsayilan acik/kapali + dil
- Icerik dili (`TR`; future `EN/AR`)
- Okuma modu (ekran kararmasin, buyuk font)
- Gizlilik / export
- Hatali icerik bildir

Bilesenler:
- `ReminderSchedulerCard`
- `FontScaleSlider`
- `TTSToggleRow`
- `LanguagePicker`
- `PrivacyActionsCard`

## Metinsel Akis Diyagrami

```text
Home
 -> Ruhsal Pratikler
    -> Bugunun Duasi
       -> Bugunun Dua Seti
       -> Dua Detay (Arapca / Okunus / Meal)
       -> Sayaç Akisi
       -> Tamamlandi Ozeti + Mood/Not
       -> Log Kaydi
       -> Sonraki Dua / Set Tamamlandi

Home
 -> Ruhsal Pratikler
    -> Bugunun Esmasi
       -> Esma Karti + Anlam + Tefekkur
       -> (Opsiyonel) Zikir Sayaci
       -> Log Kaydi
       -> Tum Esmalar -> Esma Detay

Home
 -> Ruhsal Pratikler
    -> Bugunun Nefesi
       -> Egzersiz Detay
       -> Animasyonlu Timer
       -> Check-in
       -> Session Log

Profile / Home CTA
 -> Dua Gunlugum
    -> Takvim + Gun Listesi + Istatistik + Streak

Settings
 -> Ruhsal Ayarlar
```

## State Yonetimi Standarti (Oneri)

- `TanStack Query`: server state (daily content, logs, stats, preferences)
- `Zustand`: aktif akıs ve local interactive state
  - dua sayaç state
  - meditasyon seans state
  - UI toggles / gecici secimler
- `AsyncStorage` / secure layer:
  - pending queue
  - cache metadata
  - local preferences fallback

