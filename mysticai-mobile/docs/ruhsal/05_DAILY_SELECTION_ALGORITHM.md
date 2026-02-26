# Ruhsal Pratikler Modulu - Gunluk Icerik Secim Algoritmasi (Pseudo-code)

Bu belge, dua/esma/egzersiz iceriklerinin deterministik ve dengeli secimi icin algoritma tasarimini tanimlar.

## Hedefler

- Deterministik secim (ayni input -> ayni output)
- `GLOBAL` veya `PER_USER` scope secenegi
- Kategori dengesi (haftalik minimum dagilim)
- Cooldown (tekrar azaltma)
- A/B test destegi (3 vs 5 dua)

## Secim Modlari

### Opsiyon A - `GLOBAL`

- Herkes ayni gun ayni icerigi gorur
- Icerik operasyonu ve destek acisindan daha kolay

### Opsiyon B - `PER_USER`

- Her kullanici ayni gun farkli ama deterministik icerik gorebilir
- Kisisellestirme ve retention acisindan daha guclu

Not:
- MVP'de `GLOBAL` ile baslamak pratik
- v2'de `PER_USER` opsiyonunu aktif etmek daha guvenli

## Yardimci Kavramlar

```pseudo
normalizeDate(date, timezone): LocalDate
hash64(input): long
seededRng(seed): RNG
isoWeekStart(date): LocalDate
weightedPick(items, weightFn): Item
```

## A/B Variant Atamasi (dua set boyutu)

```pseudo
function getPrayerSetVariant(userId):
    seed = hash64("ab:daily_prayer_set:" + userId)
    return (seed % 2 == 0) ? "3_DUA" : "5_DUA"
```

Not:
- Remote config veya experiment assignment tablosu varsa bu fonksiyon override edilir.

## Dua Seti Secimi (Ana Algoritma)

```pseudo
function getDailyPrayerSet(userId, date, scope, locale, timezone):
    d = normalizeDate(date ?? now(), timezone)
    variant = getPrayerSetVariant(userId)
    desiredCount = (variant == "3_DUA") ? 3 : 5

    existing = findPrayerSetSnapshot(d, locale, scope, scope == PER_USER ? userId : null)
    if existing exists:
        return existing

    seedKey = (scope == GLOBAL)
      ? "prayer|" + d + "|" + locale
      : "prayer|" + d + "|" + locale + "|" + userId

    rng = seededRng(hash64(seedKey))
    candidates = prayerRepo.findActive(locale) or fallbackTR()

    recentShown14 = queryShownPrayerIds(userId, d-14, d-1, scope)
    recentShownCount30 = queryShownCounts(userId, d-30, d-1, scope)

    weekStart = isoWeekStart(d)
    weeklyShownCategories = queryShownCategories(userId, weekStart, d-1, scope)
    requiredCategories = ["SUKUR", "KORUNMA", "HUZUR"]
    missingRequired = requiredCategories - weeklyShownCategories

    selected = []
    selectedCategories = set()
    needsShort = true
    needsMedium = true

    while selected.size < desiredCount:
        scored = []

        for prayer in candidates:
            if prayer.id in selected.ids: continue
            if !prayer.active: continue

            score = 100.0

            // cooldown (son 14 gun)
            if prayer.id in recentShown14:
                score -= 45

            // son 30 gun gorulme yogunlugu cezasi
            score -= min(recentShownCount30[prayer.id] * 8, 32)

            // haftalik kategori dengesi bonusu
            if prayer.category in missingRequired:
                score += 40

            // set ici kategori tekrarini azalt
            if prayer.category in selectedCategories:
                score -= 12

            // kisa + orta karisik set hedefi
            if needsShort and prayer.difficultyLevel == 1:
                score += 18
            if needsMedium and prayer.difficultyLevel == 2:
                score += 12

            // cok uzun dualari gunluk akis hizini bozmamasi icin hafif azalt
            if prayer.estimatedReadSeconds > 90:
                score -= 10

            // deterministik jitter (aynı score'larda dagilim)
            score += rng.nextFloat(0, 5)

            scored.add({ prayer, score })

        if scored empty:
            break

        next = weightedPick(scored, weight = max(score, 1))
        selected.add(next.prayer)
        selectedCategories.add(next.prayer.category)

        if next.prayer.difficultyLevel == 1: needsShort = false
        if next.prayer.difficultyLevel == 2: needsMedium = false

        remainingSlots = desiredCount - selected.size
        remainingMissing = missingRequired - selectedCategories
        if remainingSlots == size(remainingMissing):
            // kalan slotlari zorunlu kategorilere ayir
            candidates = candidates.filter(c => c.id in selected.ids OR c.category in remainingMissing)

    if selected.size < desiredCount:
        fillDeterministicallyFromRemaining(candidates, selected, desiredCount, rng)

    snapshot = persistPrayerSetSnapshot(
      date = d,
      locale = locale,
      scope = scope,
      userId = (scope == PER_USER ? userId : null),
      seedHash = hash(seedKey),
      algoVersion = "v1",
      variant = variant,
      items = selected
    )

    return snapshot
```

## Gunun Esmasi Secimi

```pseudo
function getDailyAsma(userId, date, scope, locale, timezone):
    d = normalizeDate(date ?? now(), timezone)

    existing = findAsmaDailySnapshot(d, locale, scope, scope == PER_USER ? userId : null)
    if existing exists:
        return existing

    activeAsma = asmaRepo.findAllActiveOrderByOrderNoAsc() // genellikle 99 kayit

    seedKey = (scope == GLOBAL)
      ? "asma|" + d + "|" + locale
      : "asma|" + d + "|" + locale + "|" + userId
    idx = hash64(seedKey) % activeAsma.size

    candidate = activeAsma[idx]

    // tekrar azaltma (opsiyonel)
    recentAsmaIds = queryRecentAsmaIds(userId, d-30, d-1, scope)
    shift = 0
    while candidate.id in recentAsmaIds and shift < activeAsma.size:
        idx = (idx + 1) % activeAsma.size
        candidate = activeAsma[idx]
        shift += 1

    return persistAsmaDailySnapshot(d, locale, scope, userId?, candidate, seedKey, "v1")
```

## Gunun Egzersizi Secimi

```pseudo
function getDailyMeditation(userId, date, scope, locale, timezone):
    d = normalizeDate(date ?? now(), timezone)

    existing = findMeditationDailySnapshot(d, locale, scope, scope == PER_USER ? userId : null)
    if existing exists:
        return existing

    prefs = userPreferences(userId)
    recentExerciseIds = queryRecentMeditationExerciseIds(userId, d-14, d-1, scope)
    recentTypes7d = queryRecentMeditationTypes(userId, d-7, d-1, scope)
    candidates = meditationRepo.findAllActive()

    scored = []
    for ex in candidates:
        score = 100

        if ex.id in recentExerciseIds:
            score -= 50

        if repeatedTooOften(ex.type, recentTypes7d):
            score -= 15

        if prefs.shortSessionPreferred and ex.durationSec <= 180:
            score += 20

        if prefs.beginnerMode and ex.difficultyLevel == 1:
            score += 10

        score += deterministicJitter(hash64(ex.id + "|" + d), 0, 4)
        scored.add({ ex, score })

    selected = weightedPick(scored, weight = max(score, 1))

    return persistMeditationDailySnapshot(d, locale, scope, userId?, selected, seedKey, "v1")
```

## Cache ve Snapshot Politikasi

- Once DB snapshot bak (`*_daily`, `prayer_sets`)
- Yoksa algorithm calistir ve snapshot kaydet
- Redis cache anahtarlari:
  - `daily:prayers:{date}:{locale}:{scope}:{userId?}`
  - `daily:asma:{date}:{locale}:{scope}:{userId?}`
  - `daily:meditation:{date}:{locale}:{scope}:{userId?}`
- Icerik publish version degisirse cache invalidation tetiklenir

## Kategori Denge Kurali (Haftalik)

Hedef:
- Haftada en az 1 `SUKUR`
- Haftada en az 1 `KORUNMA`
- Haftada en az 1 `HUZUR`

Uygulama:
- Gunluk secimde bu kategoriler eksikse bonus puan
- Gunun kalan slotlari eksik kategori sayisina esit oldugunda force-filter

## Gozlemlenebilirlik (onerilen)

Olculmesi gerekenler:
- `daily_selection_cache_hit_rate`
- `daily_selection_generation_ms`
- `prayer_repeat_rate_14d`
- `category_balance_miss_rate`
- `ab_variant_distribution`

