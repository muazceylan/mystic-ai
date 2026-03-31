# Mystic AI Mobile — UI yönü ve tasarım sistemi notları

Bu dosya **mysticai-mobile** içinde UI katmanının nereden beslendiğini, hangi prensiplerle genişletilmesi gerektiğini ve kademeli iyileştirme yolunu özetler. Repo genelinde agent ve geliştirici kuralları için kök dizindeki [**CLAUDE.md**](../../CLAUDE.md) (özellikle bölüm 2, 4, 9 ve “Existing Pattern’i Bozma”) tek kaynak kabul edilir; burada tekrar etmek yerine uyum vurgulanır.

---

## 1. Amaç ve kapsam

- **Amaç:** Mevcut foundation’ı (theme + ortak bileşenler) büyüterek tutarlı, ölçeklenebilir UI; görsel parity; route ve iş mantığına dokunmadan stil mimarisini netleştirmek.
- **Kapsam dışı:** Tek PR’da tüm uygulamayı yeniden yazmak, paralel bir “ikinci tasarım sistemi” kurmak veya sadece kozmetik yüzeysel düzenlemelerle mimari borcu gizlemek.
- **Stil yaklaşımı:** Projede NativeWind bağımlılığı vardır; fiilen ekranların çoğu **React Native `StyleSheet` + token/theme** ile yazılmıştır. Yeni kodda mevcut ekranın ve komşu bileşenlerin stil dilini takip edin; inline stil yalnızca gerçekten dinamik olan durumlarda kalsın.

---

## 2. Mevcut foundation (dosya konumları)

### 2.1 Tasarım token’ları ve tema

| Konum | İçerik |
|--------|--------|
| [`src/theme/`](../src/theme/) | `colors`, `spacing`, `radius`, `typography`, `shadow`, `platform`; [`index.ts`](../src/theme/index.ts) barrel export. |
| [`src/constants/tokens.ts`](../src/constants/tokens.ts) | `TYPOGRAPHY`, `SPACING`, `RADIUS` ve ilgili sabitler — birçok UI bileşeni buradan beslenir. |
| [`src/constants/colors.ts`](../src/constants/colors.ts) + [`src/context/ThemeContext.tsx`](../src/context/ThemeContext.tsx) | Light/dark semantic renkler; `useTheme()` ile bileşen içi dinamik renk. |

**Gerçekçi not:** Tokenlar hem `src/theme/*` hem `src/constants/tokens.ts` üzerinden kullanılıyor; sayılar iki kümede birebir aynı olmayabilir. Hedef **uzun vadede tek sözleşmeye yakınsamak**; kısa vadede **aynı ekranda yeni parça eklerken o ekranın veya kullanılan ortak bileşenin kaynağını** kullanın, üçüncü bir rastgele ölçek icat etmeyin.

### 2.2 Ortak UI bileşenleri

[`src/components/ui/`](../src/components/ui/) — barrel: [`index.ts`](../src/components/ui/index.ts).

**İhracat özeti (mevcut):** `Button`, `IconButton`, `Card`, `Badge`, `Skeleton`, `ListItem`, `ListRow`, `ErrorStateCard`, `SafeScreen` (+ `useBottomTabBarOffset`), `AccessibleText`, `AccordionSection`, `AppHeader`, `BottomSheet`, `ProgressPill`, `Chip`, `TabHeader` (+ `HeaderRightIcons`), `AppSurfaceBackground`, `AppSurfaceHeader` (+ `SurfaceHeaderIconButton`), `AppIcon`, `BrandLogo` / `BrandMark` / `BrandBadge`, `PremiumIconBadge`.

**Deprecated (migration sırasında dikkat):** `TabSwipeGesture` (PagerView tabanlı akışa geçiş notu), `Screen` (`SafeScreen` + scroll tercih edilir).

Özellik ekranlarına özel parçalar [`src/components/`](../src/components/) altında domain klasörleriyle ayrılmaya devam edebilir; bunları `components/ui` içindeki genel bileşenlerle karıştırmayın.

### 2.3 Tipik ekran iskeleti

- **Güvenli alan ve tab bar:** `SafeScreen`, gerekirse `useBottomTabBarOffset`.
- **Başlık:** `AppHeader`, `TabHeader` veya yüzeye özel `AppSurfaceHeader` pattern’i.
- **Hata / boş / yükleme:** `ErrorStateCard`, `Skeleton`; liste satırları için `ListItem` / `ListRow`.

---

## 3. Prensipler (CLAUDE.md ile uyumlu)

1. **Foundation’ı genişlet:** Paralel “yeni ui/ ağacı” veya ikinci bir token dosya kümesi açmak yerine mevcut `theme`, `constants/tokens`, `ThemeContext` ve `components/ui` hattını netleştirin.
2. **Merkezi karar, yerel uygulama:** Renk, spacing, tipografi, radius gibi kararlar token/theme üzerinden; bileşenin görünümü bileşen dosyasında `StyleSheet` veya tutarlı bir stil fabrikasında.
3. **Görsel parity:** Refactor sonrası kullanıcı mevcut ekranı tanımaya devam etmeli; “tamamen başka ürün” hissi hedef değil.
4. **Sınır:** Route yapısı, API çağrıları, Zustand/React Query akışları — yalnızca UI refactor bahanesiyle değiştirilmez.
5. **Büyük dosyalar:** `src/app/**` altında çok satırlı route dosyaları orchestration’a indirgenmeli; bu **kademeli** ve küçük PR’larla yapılır, tek seferde tüm ekranı koparmak beklenmez.

---

## 4. Bileşen envanteri (yön — “var / kısmen / açık”)

| İhtiyaç | Durum | Not |
|---------|--------|-----|
| Button (variant, loading, disabled) | **Var** | [`Button.tsx`](../src/components/ui/Button.tsx) — `ThemeContext` + `constants/tokens` |
| Icon button | **Var** | `IconButton` |
| Metin hiyerarşisi | **Kısmen** | `AccessibleText`; tipografi `theme/typography` ve `constants/tokens` içinde; tüm ekranlar tek primitive’e bağlı değil |
| Ekran kabı | **Var** | `SafeScreen` (tercih), `Screen` deprecated |
| Kart, chip, badge | **Var** | `Card`, `Chip`, `Badge`, `PremiumIconBadge` |
| Liste satırı | **Var** | `ListItem`, `ListRow` |
| Bottom sheet | **Var** | `BottomSheet` |
| Header | **Var** | `AppHeader`, `TabHeader`, `AppSurfaceHeader` |
| Boş / hata / iskelet | **Var** | `ErrorStateCard`, `Skeleton` |
| Form alanları (tek TextField primitive) | **Açık** | İhtiyaç oldukça mevcut form pattern’leri veya yeni primitive `components/ui` altında, token ile |
| Tab bar görünümü | **Kısmen** | Tab layout [`src/app/(tabs)/_layout.tsx`](../src/app/(tabs)/_layout.tsx); görsel tekilleştirme layout + ortak header ile kademeli |

---

## 5. Klasörleme

Hedef yapı **zaten var** olanları genişletmektir:

- **`src/theme/`** — renk/spacing/radius/typography/shadow; gerektiğinde `semantic` ayrımı **yeni dosyalar** ile (ör. ileride `semantic.ts`) ve geriye dönük uyum planıyla.
- **`src/components/ui/`** — uygulama genelinde tekrar eden primitives ve bileşenler; alt klasörler (ör. `form/`) yalnızca dosya sayısı ve sınır netleştiğinde eklenir.
- **Ekrana özel parçalar:** `src/components/<feature>/` veya ekran yanında `components` — `components/ui` ile karıştırılmaz.

Yeni “hepsi tek `styles.ts` içinde” çöplükleri oluşturmayın; tekrar eden ekran stilleri bileşene veya feature-local `styles` modülüne taşınır.

---

## 6. Kademeli yol haritası (önerilen sıra)

1. **Yeni özellik / yeni ekran:** Sadece `theme` + `constants/tokens` + `components/ui` + `ThemeContext`; magic number yerine mevcut token’a bağlanma.
2. **Mevcut ekran dokunuşu:** Aynı PR’da yalnızca ilgili bölüm; görsel karşılaştırma (parity).
3. **Büyük ekran parçalama:** `calendar.tsx` gibi çok satırlı dosyalarda section/component çıkarma; davranış değişmeden.
4. **Token birleşimi:** İki token kümesini uzun vadede tek sözleşmeye indirgeme — ayrı milestone; migration notu ve tüketici güncellemeleri ile.

---

## 7. Anti-pattern’ler (temizlik sürekli süreçtir)

- Ekran içinde büyük inline style blokları ve copy-paste margin/padding.
- Aynı işi yapan ikinci bir “mini Button” / “mini Card” (önce `components/ui` ve theme’i kontrol edin).
- Hardcoded `fontSize` / renk — mümkünse token veya `useTheme()` semantic rengi.
- Tab bar veya safe area için ekran bazlı kırık hack’ler; önce `SafeScreen` ve tab layout ortak davranışı.
- Kullanılmayan style ve ölü bileşen — dokunduğunuz dosyada güvenle kaldırılabilir (kapsamı dar tutun).

---

## 8. Erişilebilirlik ve performans

- Dokunma alanları: `spacing` içindeki hit alanı sabitlerine (ör. `chevronHitArea`) uyum; icon-only için `accessibilityLabel`.
- `AccessibleText` ve theme ile kontrastı bilinçli düşünün.
- Uzun Türkçe metinlerde `lineHeight` ve taşma (`numberOfLines`) davranışını koruyun.
- Listelerde `FlatList` / `SectionList` ile stabil `keyExtractor`; gereksiz inline style objesi üretiminden kaçının.

---

## 9. Yeni ekran / PR checklist (kısa)

- [ ] `SafeScreen` ve uygun header pattern kullanıldı mı?
- [ ] Renk/spacing tipografi mümkün olduğunca token / `useTheme` ile mi?
- [ ] Yükleme / hata / boş durumları düşünüldü mü?
- [ ] Route ve veri akışı değişmeden yalnızca UI mı?
- [ ] Görsel parity için önce/sonra veya ekran görüntüsü notu (büyük değişikliklerde)?

---

## 10. Kabul ölçütleri (milestone bazlı)

Tek seferde “tüm kritik ekranlar migrate” şartı yerine:

- Yeni veya ciddi değişen kod **`src/theme` / `constants/tokens` ve `components/ui` hattına** uyuyor.
- Tekrarlayan stiller azalıyor; büyük ekranlar planlı parçalanıyor.
- Paralel ikinci bir tasarım dili (yeni global stil çöplüğü) oluşmuyor.
- Çalışan kullanıcı akışları ve route’lar korunuyor.

---

## 11. Teslim raporu (kapsam ve zorunlu çıktılar)

UI ile ilgili **epic, milestone veya büyük refactor** (birden fazla ekran / token / ortak bileşen) tamamlandığında yalnızca kod yetmez; aşağıdaki **teslim raporu** doldurulmalıdır. PR açıklamasına özet, detay repoda veya ekip aracında (Confluence, issue, vb.) tutulabilir; en azından PR’da **eksikler** ve **kalan işler** maddeleri yazılmalıdır.

### 11.1 Raporun amacı

- Yapılan işin **ne olduğunu** ve **nerede bittiğini** netleştirmek.
- **Bilinçli olarak yapılmayan** veya **ertelenen** noktaları kayıt altına almak.
- Sonraki sprint’e **taşınan işleri** (backlog) tek listede toplamak.
- Regresyon ve QA için **manuel test alanlarını** açık bırakmamak.

### 11.2 Kapsamlı teslim raporu şablonu

Aşağıdaki başlıkları sırayla doldurun; ilgisi yoksa “Yok / bu kapsamda değil” yazın.

| # | Başlık | İçerik |
|---|--------|--------|
| 1 | **Özet** | 3–6 cümle: hedef, yapılan, etki (kullanıcı / geliştirici). |
| 2 | **Mimari ve kararlar** | Hangi token hattı (`src/theme` vs `constants/tokens` + `ThemeContext`); yeni bileşen sınırları; görsel parity stratejisi. |
| 3 | **Değişen dosyalar** | `src/theme/*`, `src/constants/tokens.ts`, `src/components/ui/*`, dokunulan `src/app/**` route’ları — mümkünse madde veya `git diff --stat` özeti. |
| 4 | **Yeni / güncellenen ortak bileşenler** | İsim, kısa amaç, tüketen ekranlar (varsa). |
| 5 | **Refactor edilen ekranlar veya modüller** | Dosya yolu + ne parçalandı / ne sadeleştirildi. |
| 6 | **Test ve doğrulama** | Çalıştırılan komutlar (`npx tsc --noEmit`, vb.); manuel smoke senaryoları (hangi sekmeler / akışlar). |
| 7 | **Eksikler ve bilinçli tavizler** | Token birleşimi ertelendi mi; bir ekran yarı migrate mi; deprecated bileşen hâlâ kullanılıyor mu — **açık liste**. |
| 8 | **Kalan işler (backlog)** | Sonraki PR’lara bırakılan maddeler: öncelik (P0/P1), tahmini kapsam, bağımlılık notu. |
| 9 | **Riskler ve dikkat noktaları** | Regresyon riski yüksek alanlar; dark mode; büyük liste performansı; erişilebilirlik. |
| 10 | **Dokümantasyon** | `ui-art.md` veya ilgili doc güncellendi mi; migration notu var mı. |

### 11.3 “Eksikler” bölümü — ne yazılmalı?

Şunları özellikle kaçırmayın:

- **İki token kümesi:** `src/theme` ile `constants/tokens` hâlâ hizalanmadıysa hangi dosyaların eski kalacağı.
- **Tamamlanmamış migrate:** `Screen` / `TabSwipeGesture` gibi deprecated kullanımın kaldığı yerler.
- **Form / tab bar / tipografi:** Tabloda “açık” veya “kısmen” olan alanlarda bu milestone’da ne yapılmadı.
- **Büyük dosyalar:** Örn. `calendar.tsx` — sadece bir bölüm çıkarıldıysa geriye kalan satır riski.
- **Analytics / i18n:** UI değişikliği etiket veya çeviri anahtarını etkilediyse kontrol edilmediyse not.

### 11.4 “Kalan işler” bölümü — örnek format

Her madde tek satırda net olsun:

- **[P1]** `src/theme/typography` ile `constants/tokens` TYPOGRAPHY hizası — bağımlı: tema genişletme PR’ı.
- **[P2]** `X` ekranında inline style kümesini `Y` bileşenine taşıma.
- **[Backlog]** Token tekilleştirme ADR veya kısa migration planı.

### 11.5 Küçük değişiklikler

Tek dosyalı, davranışı değiştirmeyen küçük UI düzeltmelerinde tam tablo şart değildir; PR’da **2–3 cümle özet + test notu** yeterlidir. Kapsam büyürse bu bölüme uygun raporu tamamlayın.

---

## 12. Özet

Bu proje için UI işi **sıfırdan mimari kurma** değil; **mevcut `theme`, `constants/tokens`, `ThemeContext` ve `components/ui` omurgasını** büyütüp tutarlı hale getirmektir. İyileştirme **küçük, güvenli adımlarla** ve CLAUDE.md’deki minimal değişiklik disipliniyle yapılır. Büyük teslimlerde **eksikler** ve **kalan işler** bölüm 11’deki teslim raporu şablonu ile kapatılmalıdır.
