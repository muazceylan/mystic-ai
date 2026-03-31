# mysticai-mobile Büyük Dosyalar Performans/Tertip Triyajı

Bu doküman, kullanıcı arayüzünde “çok büyük/çok uzun” yazılmış ekran/component dosyalarını sistematik şekilde hızlandırmak ve düzenlemek için hazırlanmıştır.

## Takip Nasıl Yapılır
1. Önce `Dosyalar (büyükten küçüğe)` tablosundan hedef dosyayı seçiyoruz.
2. Her dosyada `Yapılacaklar` bölümündeki maddeler sırayla uygulanıyor.
3. Her aksiyonun yanında `Status` güncelleniyor (Örn: `todo`, `in_progress`, `done`).
4. Aynı dosyada küçük ve güvenli adımlarla ilerliyoruz (davranışı bozmadan).

> Not: Repo genelinde `npx tsc --noEmit` bazı mevcut hatalarla fail verebilir; bu doküman kapsamında hedef her seferinde sadece ilgili dosya/iyileştirme kapsamını bozmayacak şekilde ilerlemek.

---

## Dosyalar (büyükten küçüğe)

Satır uzunlukları (yaklaşık) `mysticai-mobile/src` içinde ölçülmüştür.

| Öncelik | Dosya | Yaklaşık Satır | Status |
|---:|---|---:|---|
| 1 | `src/app/(tabs)/natal-chart.tsx` | 4562 | in_progress |
| 2 | `src/app/(tabs)/calendar.tsx` | 4388 | in_progress |
| 3 | `src/app/(tabs)/dreams.tsx` | 2632 | in_progress |
| 4 | `src/app/(tabs)/star-mate.tsx` | 2549 | in_progress |
| 5 | `src/screens/match/MatchOverviewScreen.tsx` | 2331 | in_progress |
| 6 | `src/components/match/MatchCard.tsx` | 1788 | in_progress |
| 7 | `src/app/(tabs)/compare/index.tsx` | 1709 | in_progress |
| 8 | `src/app/(tabs)/daily-transits.tsx` | 1415 | in_progress |

---

## Dosya: `calendar.tsx`

### Status
- `in_progress` (başlangıç optimizasyonları yapıldı)

### Yapılacaklar (güvenli + hızlı kazanımlar)
1. `Derived-state` ağır hesaplarını (özellikle insight/summary türetme) render döngüsü dışına almak.
2. Her hücre/render başına tekrar çalışan O(n) aramaları O(1) lookup ile değiştirmek (ör. `find`/`sort` yerine map/tablo).
3. Aynı anda hem:
   - veri/fetch,
   - derived-state,
   - animasyon/gesture,
   - büyük JSX layout
   görevlerini tek dosyada tutmak yerine mümkün olanları hook/component’e taşımak.
4. `useEffect` zincirlerini tek sorumluluklu fonksiyonlara bölmek (fetch, tutorial scroll, detail sheet state vs).

### Yapıldı (bu tur)
1. `interestTags` için `getInsightForDate` içinde her çağrıda üretilen `new Set(...)` maliyetini kaldırdım.
2. `getDaySummary` içinde hücre bazlı `visibleCategories.find(...)` yerine `visibleCategoriesById` ile O(1) lookup kullanıma geçtim.
3. `buildPlannerInsightFromCosmicDetail` içinde `lowSub` hesaplamasını `slice().sort(...)[0]` yerine tek geçişli min arama ile optimize ettim.
4. `calendar.tsx` içinde COSMIC_PLANNER spotlight tutorial scroll mantığını `useEffect` içinden helper’a taşıyarak “tek sorumluluk” ayrımını güçlendirdim.

---

## Dosya: `natal-chart.tsx`

### Beklenen risk alanları (triage hedefleri)
1. `polling` + derived-state + büyük scroll/list bileşimi (render başına hesap taşınması).
2. Büyük `useMemo`/`useCallback` bloklarının içinde:
   - sorted list üretimi,
   - karmaşık mapping,
   - cache update mantığı
   olasılığı.
3. Drag/drop + panel/modal state’inin tek dosyada büyümesi.

### Yapılacaklar (ilk sprint planı)
1. Scroll sırasında çalışan `autoFocusNearestAccordion` içindeki `Object.entries -> filter -> map -> sort` zincirini kaldır:
   - hedef “yakın olanı” bulmaksa `sort` yerine tek geçişli `reduce`/min arama kullan.
   - mümkünse geçici array üretimini azalt.
2. `hotspotAspects` içinde `chart.aspects` için `sort(...).slice(0,2)` yerine “en küçük orb’ler”i sort etmeden seç:
   - 2’li top-min’i tek geçişle üret.
3. Render içinde sık tekrar eden `selectedForComparison.some(...)` kontrollerini:
   - `useMemo` ile precompute edilen `Set`/lookup ile O(1) yap.
4. (Sonraki adım) UI tarafında büyük `switch (sectionKey)` gövdesini bölme:
   - davranışı bozmadan, her `case` için minimal component boundary oluşturmak.
5. `polling` tarafında re-render tetikleyen state güncellemelerini gözden geçir:
   - polling tamamlanınca tek bir `setChart/setCachedChart` akışı gibi.

### Yapıldı (bu tur)
1. Scroll-time `autoFocusNearestAccordion` içinde `filter -> map -> sort` zinciri yerine tek geçişli min arama.
2. `hotspotAspects` içinde `sort(...).slice(0,2)` yerine top-2 smallest-orb seçimi.
3. Render içindeki `selectedForComparison.some(...)` kontrollerini `selectedForComparisonKeys: Set` ile O(1) lookup’a taşıdım.
4. `switch (sectionKey)` içindeki `night_poster` case’ini `renderNightPosterSection` helper’ına taşıyarak ilk UI boundary’yi oluşturdum.
5. Polling tarafında `startPolling` dependency’lerini `user` nesnesi yerine `user?.id` / `resolvedLocale` bazına indirgeyerek gereksiz polling restart/re-render riskini azalttım.
6. `switch (sectionKey)` içindeki `big_three` case’ini `renderBigThreeSection` helper’ına taşıyarak switch bölme adımını genişlettim.
7. `switch (sectionKey)` içindeki `hotspots` case’ini `renderHotspotsSection` helper’ına taşıyarak switch bölme adımını genişlettim.

---

## Dosya: `dreams.tsx`

### Beklenen risk alanları
1. İçerik çokluğu nedeniyle `ScrollView`/çoklu list + conditional render.
2. Sort/derived-state (ör. tarihe göre sıralama) potansiyeli.
3. Aynı ekranda hem form hem detay hem geçmiş liste akışı.

### Yapılacaklar
1. Sort/filtered listeleri `useMemo` sınırlarını daraltarak stabilize et.
2. Çoklu `ScrollView` bölgelerini ayrı component’lere ayır.
3. “dream ekle / interpret / history” gibi farklı akışları hook seviyesinde ayır (UI sadece compose etsin).

### Yapıldı (bu tur)
1. Render içinde tekrar çalışan `monthDreams` ve `yearMonthLabel` türetmesini `useMemo` ile memoize ettim.
2. `recurringSymbols`, `completedDreamCount`, `pendingDreamCount` ve `latestDream` türetmelerini de `useMemo` ile tekilleştirdim.

---

## Dosya: `star-mate.tsx`

### Beklenen risk alanları
1. Gesture/drag + action commit/flyout + deck state.
2. Çok sayıda derived metric ve conditional panel.
3. “action sırasında re-render” maliyeti.

### Yapılacaklar
1. Action state’i parçala: komit/flyout/anim progress ayrı state slice.
2. Sorted/filtered metric hesaplarını sadece gerekli durumlarda güncelle (dependency azalt).
3. Panel içeriklerini memoize eden component boundary’ler oluştur.

### Yapıldı (bu tur)
1. `summaryCards` içindeki `reduce` + `filter` hesaplarını tek geçişli döngüye çevirdim (avg + high aynı anda hesaplanıyor) ve memo deps’i güncelledim.
2. `ReanimatedSwipeDeck` içinde animasyon biter bitmez komiti çağırırken `handleCommitAction` wrapper’ını kaldırdım (direkt `onCommitAction` çağrısı).

---

## Dosya: `MatchOverviewScreen.tsx` ve `MatchCard.tsx`

### Yapılacaklar
1. `filteredAxes` / `supportive/challenging` türetme: lookup + memo boundary.
2. `sort` edilen listeleri render dışında hazırlamak (tek seferlik memo).
3. `MatchCard` içinde büyük hesapları:
   - üst seviyede hazırlayıp prop olarak geçmek
   - ya da `useMemo` sınırlarını sıkılaştırmak.

### Yapıldı (bu tur)
1. `detailFilteredAspects` üzerinden `supportiveAspects` ve `challengingAspects` üretimini tek geçişli döngüye çevirdim (iki ayrı `filter` yerine). 
2. `MatchCard` içinde `strongestAndCautionAxes()` fonksiyonundaki `.sort(...)` maliyetini kaldırıp tek geçişli min/max aramayla hesapladım.
3. `MatchOverviewScreen` içinde `useMemo` dependency’lerini `props` nesnesi yerine ilgili alanlara indirip `fallbackFromProps` / `resolvedData` recompute’lerini azalttım.

---

## Dosya: `compare/index.tsx` ve `daily-transits.tsx`

### Yapılacaklar
1. Section/overview türetme için `useMemo` kapsamını daralt.
2. Render içinde tekrar eden `.sort(...)` ve `map` zincirlerini memo ile sabitle.
3. Fetch + derived-state arasında net ayrım (loading sırasında derived-state pahasına hesap yapmamak).

### Yapıldı (bu tur)
1. `selectOverviewSource()` içindeki `.filter().map().sort()` yapısını sort yerine tek geçişli max aramayla değiştirdim.
2. `daily-transits.tsx` içinde `resolvePrimaryTheme*()` fonksiyonlarındaki `slice().sort(...)[0]` kullanımını sort yerine tek geçişli max aramaya çevirdim.
3. `daily-transits.tsx` içinde `supportiveCount` / `cautionCount` hesaplarını iki ayrı `filter` yerine tek geçişli sayımla yaptım.

4. `daily-transits.tsx` içinde `groupTransits()` tema sıralama hazırlığını ön hesaplanmış `Set` ile sadeleştirdim.
5. `daily-transits.tsx` içinde `processedContent` todayCandidates türetiminde `filter().map()` yerine tek döngüyle push kullandım.
6. `compare/index.tsx` içinde `overviewSections` `useMemo` dependency’lerine `t` ekledim (i18n değişimlerinde stale türetme riskini azaltır).
7. `compare/index.tsx` içinde `signalNotes` ve `spotlightDrivers` memo dependency’lerini tüm `data` yerine kullandığım alanlara indirgedim (gereksiz recompute azaltma).
8. `daily-transits.tsx` içinde `heroPersonalization` / `heroForRender` / `processedContent` `useMemo` dependency’lerini ilgili alanlara indirgedim.
9. `daily-transits.tsx` içinde `heroPersonalization` hesaplamasını fetch payload gelmeden çalıştırmamayı sağlayıp “fetch + derived-state ayrımı” hedefini somutlaştırdım.

---

## Bir sonraki adım
Dokümandaki öncelik sırasına göre sıradaki uygulama `natal-chart.tsx` dosyasında kalan triage hedefleriyle devam edecek.

