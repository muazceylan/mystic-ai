# Mystic AI Mobile — UI yonu ve tasarim sistemi notlari

Bu dosya **mysticai-mobile** icinde UI katmaninin nereden beslendigi, hangi prensiplerle genisletilmesi gerektigi ve kademeli iyilestirme yolunu ozetler. Repo genelinde agent ve gelistirici kurallari icin kok dizindeki [**CLAUDE.md**](../../CLAUDE.md) (ozellikle bolum 2, 4, 9 ve "Existing Pattern'i Bozma") tek kaynak kabul edilir; burada tekrar etmek yerine uyum vurgulanir.

---

## 1. Amac ve kapsam

- **Amac:** Mevcut foundation'i (theme + ortak bilesenler) buyuterek tutarli, olceklenebilir UI; gorsel parity; route ve is mantigina dokunmadan stil mimarisini netlestirmek.
- **Kapsam disi:** Tek PR'da tum uygulamayi yeniden yazmak, paralel bir "ikinci tasarim sistemi" kurmak veya sadece kozmetik yuzeysel duzenlemelerle mimari borcu gizlemek.
- **Stil yaklasimi:** Projede NativeWind bagimliligi vardir; fiilen ekranlarin cogu **React Native `StyleSheet` + token/theme** ile yazilmistir. Yeni kodda mevcut ekranin ve komsu bilesenlerin stil dilini takip edin; inline stil yalnizca gercekten dinamik olan durumlarda kalsin.

---

## 2. Mevcut foundation (dosya konumlari)

### 2.1 Tasarim token'lari ve tema

| Konum | Icerik |
|--------|--------|
| [`src/theme/`](../src/theme/) | `colors`, `spacing`, `radius`, `typography`, `shadow`, `platform`; [`index.ts`](../src/theme/index.ts) barrel export. |
| [`src/constants/tokens.ts`](../src/constants/tokens.ts) | `TYPOGRAPHY`, `SPACING`, `RADIUS` ve ilgili sabitler — bircok UI bileseni buradan beslenir. |
| [`src/constants/colors.ts`](../src/constants/colors.ts) + [`src/context/ThemeContext.tsx`](../src/context/ThemeContext.tsx) | Light/dark semantic renkler; `useTheme()` ile bilesen ici dinamik renk. |

**Gercekci not:** Tokenlar hem `src/theme/*` hem `src/constants/tokens.ts` uzerinden kullaniliyor; sayilar iki kumede birebir ayni olmayabilir. Hedef **uzun vadede tek sozlesmeye yakinsamak**; kisa vadede **ayni ekranda yeni parca eklerken o ekranin veya kullanilan ortak bilesenin kaynagini** kullanin, ucuncu bir rastgele olcek icat etmeyin.

### 2.2 Ortak UI bilesenleri

[`src/components/ui/`](../src/components/ui/) — barrel: [`index.ts`](../src/components/ui/index.ts).

**Ihracat ozeti (guncel):**

- **Typography & Text:** `AppText` (variant + semantik renk), `AccessibleText`
- **Form:** `TextField` (label, error, helper, focus, multiline, leftIcon, passwordToggle, forwardRef), `Button` (primary/outline/ghost/danger + sm/md/lg + fullWidth), `IconButton`
- **Layout & Containers:** `SafeScreen` (+ `useBottomTabBarOffset`), `Section` (title/subtitle/rightAction + compact/default/relaxed), `Card`, `AccordionSection`
- **Data Display:** `Badge`, `Chip`, `ListItem`, `ListRow`, `ProgressPill`, `Skeleton`, `ErrorStateCard`
- **Navigation & Header:** `AppHeader`, `TabHeader` (+ `HeaderRightIcons`), `AppSurfaceBackground`, `AppSurfaceHeader` (+ `SurfaceHeaderIconButton`)
- **Overlay:** `BottomSheet`
- **Brand & Icons:** `AppIcon`, `BrandLogo` / `BrandMark` / `BrandBadge`, `PremiumIconBadge`

**Deprecated (migration sirasinda dikkat):** `TabSwipeGesture` (PagerView tabanli akisa gecis notu), `Screen` (`SafeScreen` + scroll tercih edilir).

Ozellik ekranlarina ozel parcalar [`src/components/`](../src/components/) altinda domain klasorleriyle ayrilmaya devam edebilir; bunlari `components/ui` icindeki genel bilesenlerle karistirmayin.

### 2.3 Tipik ekran iskeleti

- **Guvenli alan ve tab bar:** `SafeScreen`, gerekirse `useBottomTabBarOffset`.
- **Baslik:** `AppHeader`, `TabHeader` veya yuzeye ozel `AppSurfaceHeader` pattern'i.
- **Hata / bos / yukleme:** `ErrorStateCard`, `Skeleton`; liste satirlari icin `ListItem` / `ListRow`.
- **Metin:** `AppText` ile variant ve semantik renk; `AccessibleText` ham Text ihtiyaci icin.
- **Form:** `TextField` ile label/error/helper; `Button` ile variant/size/fullWidth.
- **Section gruplama:** `Section` ile baslik/alt baslik/sag aksiyon + icerik.

---

## 3. Prensipler (CLAUDE.md ile uyumlu)

1. **Foundation'i genislet:** Paralel "yeni ui/ agaci" veya ikinci bir token dosya kumesi acmak yerine mevcut `theme`, `constants/tokens`, `ThemeContext` ve `components/ui` hattini netlestirin.
2. **Merkezi karar, yerel uygulama:** Renk, spacing, tipografi, radius gibi kararlar token/theme uzerinden; bilesenin gorunumu bilesen dosyasinda `StyleSheet` veya tutarli bir stil fabrikasinda.
3. **Gorsel parity:** Refactor sonrasi kullanici mevcut ekrani tanimaya devam etmeli; "tamamen baska urun" hissi hedef degil.
4. **Sinir:** Route yapisi, API cagrilari, Zustand/React Query akislari — yalnizca UI refactor bahanesiyle degistirilmez.
5. **Buyuk dosyalar:** `src/app/**` altinda cok satirli route dosyalari orchestration'a indirgenmeli; bu **kademeli** ve kucuk PR'larla yapilir, tek seferde tum ekrani koparmak beklenmez.

---

## 4. Bilesen envanteri

| Ihtiyac | Durum | Not |
|---------|--------|-----|
| Button (variant, loading, disabled) | **Var** | [`Button.tsx`](../src/components/ui/Button.tsx) — `primary`/`outline`/`ghost`/`danger` + `sm`/`md`/`lg` + `fullWidth` |
| Icon button | **Var** | `IconButton` |
| Metin hiyerarsisi (AppText) | **Var** | [`AppText.tsx`](../src/components/ui/AppText.tsx) — tum `TYPOGRAPHY` varyantlari + semantik renk + `useTheme()` dark mode |
| Ekran kabi | **Var** | `SafeScreen` (tercih), `Screen` deprecated |
| Section layout | **Var** | [`Section.tsx`](../src/components/ui/Section.tsx) — title/subtitle/rightAction + compact/default/relaxed spacing |
| Kart, chip, badge | **Var** | `Card`, `Chip`, `Badge`, `PremiumIconBadge` |
| Liste satiri | **Var** | `ListItem`, `ListRow` |
| Bottom sheet | **Var** | `BottomSheet` |
| Header | **Var** | `AppHeader`, `TabHeader`, `AppSurfaceHeader` — inline stiller tokenize edildi |
| Bos / hata / iskelet | **Var** | `ErrorStateCard`, `Skeleton` |
| Form alanlari (TextField) | **Var** | [`TextField.tsx`](../src/components/ui/TextField.tsx) — label, error, helper, focus, multiline, leftIcon, passwordToggle, forwardRef |
| Tab bar gorunumu | **Kismen** | Tab layout [`src/app/(tabs)/_layout.tsx`](../src/app/(tabs)/_layout.tsx); gorsel tekillestirme layout + ortak header ile kademeli |

---

## 5. Klasorleme

Hedef yapi **zaten var** olanlari genisletmektir:

- **`src/theme/`** — renk/spacing/radius/typography/shadow; gerektiginde `semantic` ayrimi **yeni dosyalar** ile (or. ileride `semantic.ts`) ve geriye donuk uyum planiyla.
- **`src/components/ui/`** — uygulama genelinde tekrar eden primitives ve bilesenler; alt klasorler (or. `form/`) yalnizca dosya sayisi ve sinir netlestiginde eklenir.
- **Ekrana ozel parcalar:** `src/components/<feature>/` veya ekran yaninda `components` — `components/ui` ile karistirilmaz.

Yeni "hepsi tek `styles.ts` icinde" coplukler olusturmayin; tekrar eden ekran stilleri bilesene veya feature-local `styles` modulune tasinir.

---

## 6. Kademeli yol haritasi (onerilen sira)

1. **Yeni ozellik / yeni ekran:** Sadece `theme` + `constants/tokens` + `components/ui` + `ThemeContext`; magic number yerine mevcut token'a baglanma.
2. **Mevcut ekran dokunusu:** Ayni PR'da yalnizca ilgili bolum; gorsel karsilastirma (parity).
3. **Buyuk ekran parcalama:** `calendar.tsx` gibi cok satirli dosyalarda section/component cikarma; davranis degismeden.
4. **Token birlesimi:** Iki token kumesini uzun vadede tek sozlesmeye indirgeme — ayri milestone; migration notu ve tuketici guncellemeleri ile.

---

## 7. Anti-pattern'ler (temizlik surekli surectir)

- Ekran icinde buyuk inline style bloklari ve copy-paste margin/padding.
- Ayni isi yapan ikinci bir "mini Button" / "mini Card" (once `components/ui` ve theme'i kontrol edin).
- Hardcoded `fontSize` / renk — mumkunse token veya `useTheme()` semantic rengi.
- Tab bar veya safe area icin ekran bazli kirik hack'ler; once `SafeScreen` ve tab layout ortak davranisi.
- Kullanilmayan style ve olu bilesen — dokundugunuz dosyada guvenle kaldirilabilir (kapsami dar tutun).
- `AppText` yerine raw `Text` ile yeni hardcoded tipografi stillemesi; once `AppText` variant'larini kontrol edin.
- `TextField` yerine raw `TextInput` ile yeni label/error/wrapper pattern'i; once `TextField` prop'larini kontrol edin.

---

## 8. Erisilebilirlik ve performans

- Dokunma alanlari: `spacing` icindeki hit alani sabitlerine (or. `chevronHitArea`) uyum; icon-only icin `accessibilityLabel`.
- `AccessibleText` / `AppText` ve theme ile kontrasti bilincli dusunun.
- Uzun Turkce metinlerde `lineHeight` ve tasma (`numberOfLines`) davranisini koruyun.
- Listelerde `FlatList` / `SectionList` ile stabil `keyExtractor`; gereksiz inline style objesi uretiminden kacinin.

---

## 9. Yeni ekran / PR checklist (kisa)

- [ ] `SafeScreen` ve uygun header pattern kullanildi mi?
- [ ] `AppText` variant ile tipografi, `useTheme` ile renk mi?
- [ ] `TextField` form alanlari icin kullanildi mi?
- [ ] `Section` ile bolum gruplama yapildi mi (gerektiginde)?
- [ ] Yukleme / hata / bos durumlari dusunuldu mu?
- [ ] Route ve veri akisi degismeden yalnizca UI mi?
- [ ] Gorsel parity icin once/sonra veya ekran goruntusu notu (buyuk degisikliklerde)?

---

## 10. Kabul olcutleri (milestone bazli)

Tek seferde "tum kritik ekranlar migrate" sarti yerine:

- Yeni veya ciddi degisen kod **`src/theme` / `constants/tokens` ve `components/ui` hattina** uyuyor.
- Tekrarlayan stiller azaliyor; buyuk ekranlar planli parcalaniyor.
- Paralel ikinci bir tasarim dili (yeni global stil coplugu) olmuyor.
- Calisan kullanici akislari ve route'lar korunuyor.

---

## 11. Teslim raporu (kapsam ve zorunlu ciktilar)

UI ile ilgili **epic, milestone veya buyuk refactor** (birden fazla ekran / token / ortak bilesen) tamamlandiginda yalnizca kod yetmez; asagidaki **teslim raporu** doldurulmalidir. PR aciklamasina ozet, detay repoda veya ekip aracinda (Confluence, issue, vb.) tutulabilir; en azindan PR'da **eksikler** ve **kalan isler** maddeleri yazilmalidir.

### 11.1 Raporun amaci

- Yapilan isin **ne oldugunu** ve **nerede bittigini** netlestirmek.
- **Bilincli olarak yapilmayan** veya **ertelenen** noktalari kayit altina almak.
- Sonraki sprint'e **tasinan isleri** (backlog) tek listede toplamak.
- Regresyon ve QA icin **manuel test alanlarini** acik birakmamak.

### 11.2 Kapsamli teslim raporu sablonu

Asagidaki basliklari sirayla doldurun; ilgisi yoksa "Yok / bu kapsamda degil" yazin.

| # | Baslik | Icerik |
|---|--------|--------|
| 1 | **Ozet** | 3-6 cumle: hedef, yapilan, etki (kullanici / gelistirici). |
| 2 | **Mimari ve kararlar** | Hangi token hatti (`src/theme` vs `constants/tokens` + `ThemeContext`); yeni bilesen sinirlari; gorsel parity stratejisi. |
| 3 | **Degisen dosyalar** | `src/theme/*`, `src/constants/tokens.ts`, `src/components/ui/*`, dokunulan `src/app/**` route'lari — mumkunse madde veya `git diff --stat` ozeti. |
| 4 | **Yeni / guncellenen ortak bilesenler** | Isim, kisa amac, tuketen ekranlar (varsa). |
| 5 | **Refactor edilen ekranlar veya moduller** | Dosya yolu + ne parcalandi / ne sadelestirildi. |
| 6 | **Test ve dogrulama** | Calistirilan komutlar (`npx tsc --noEmit`, vb.); manuel smoke senaryolari (hangi sekmeler / akislar). |
| 7 | **Eksikler ve bilincli tavizler** | Token birlesimi ertelendi mi; bir ekran yari migrate mi; deprecated bilesen hala kullaniliyor mu — **acik liste**. |
| 8 | **Kalan isler (backlog)** | Sonraki PR'lara birakilan maddeler: oncelik (P0/P1), tahmini kapsam, bagimlilik notu. |
| 9 | **Riskler ve dikkat noktalari** | Regresyon riski yuksek alanlar; dark mode; buyuk liste performansi; erisilebilirlik. |
| 10 | **Dokumantasyon** | `ui-art.md` veya ilgili doc guncellendi mi; migration notu var mi. |

### 11.3 "Eksikler" bolumu — ne yazilmali?

Sunlari ozellikle kacirmayin:

- **Iki token kumesi:** `src/theme` ile `constants/tokens` hala hizalanmadiysa hangi dosyalarin eski kalacagi.
- **Tamamlanmamis migrate:** `Screen` / `TabSwipeGesture` gibi deprecated kullanimin kaldigi yerler.
- **Form / tab bar / tipografi:** Tabloda "kismen" olan alanlarda bu milestone'da ne yapilmadi.
- **Buyuk dosyalar:** Orn. `calendar.tsx` — sadece bir bolum cikarildiysa geriye kalan satir riski.
- **Analytics / i18n:** UI degisikligi etiket veya ceviri anahtarini etkilediyse kontrol edilmediyse not.

### 11.4 "Kalan isler" bolumu — ornek format

Her madde tek satirda net olsun:

- **[P1]** `src/theme/typography` ile `constants/tokens` TYPOGRAPHY hizasi — bagimli: tema genisletme PR'i.
- **[P2]** `X` ekraninda inline style kumesini `Y` bilesenine tasima.
- **[Backlog]** Token tekillestirme ADR veya kisa migration plani.

### 11.5 Kucuk degisiklikler

Tek dosyali, davranisi degistirmeyen kucuk UI duzeltmelerinde tam tablo sart degildir; PR'da **2-3 cumle ozet + test notu** yeterlidir. Kapsam buyurse bu bolume uygun raporu tamamlayin.

---

## 12. Ozet

Bu proje icin UI isi **sifirdan mimari kurma** degil; **mevcut `theme`, `constants/tokens`, `ThemeContext` ve `components/ui` omurgasini** buyutup tutarli hale getirmektir. Iyilestirme **kucuk, guvenli adimlarla** ve CLAUDE.md'deki minimal degisiklik disipliniyle yapilir. Buyuk teslimlerde **eksikler** ve **kalan isler** bolum 11'deki teslim raporu sablonu ile kapatilmalidir. Milestone'a ozel zorunluluklar, calisma sirasi ve tamamlanma kosullari icin **bolum 13-15**'e bakin.

---

## 13. Bu milestone icin zorunlu uygulama kapsami

Bu bolum, UI iyilestirme **milestone'u** icin gecerlidir. Amac, bolum 4 envanterinde **Kismen** gorunen alanlari ortak **primitive ve contract** ile kapatmaktir. Tum uygulamanin tek PR'da tasinmasi beklenmez; ancak soz konusu contract'lar tanimlanmis ve bu milestone'da **dokunulan** yuzeylerde copy-paste / gereksiz inline azaltilmis olmalidir.

Bu dokuman yalnizca yon notu degildir; bu milestone icinde asagidakiler uygulanacaktir:

1. `components/ui` altinda mevcut foundation ile uyumlu ortak primitive ve pattern'ler guclendirilecek.
2. En az su alanlarda standardizasyon zorunludur:
   - Button varyantlari
   - Typography/Text primitive veya net typography contract
   - Input/TextField primitive
   - Tab/header gorunum contract'i
   - Screen container / section layout pattern'i
3. Yeni bir `ui-v2`, `design-system-v2`, `theme-next`, `shared-styles-new` benzeri paralel yapi acilmayacak.
4. Ucuncu bir token kaynagi olusturulmayacak.
5. Route, API, analytics, state akisi UI refactor bahanesiyle degistirilmeyecek.
6. Bu milestone kapsaminda **refactor edilen veya bilincli olarak dokunulan** ekranlarda copy-paste stil bloklari ve gereksiz inline stiller temizlenecek; sprint kapsami dar ise teslim raporunda hangi ekranlarin bu turda ele alindigi acikca yazilacak.
7. Refactor sonunda teslim raporunda "eksikler" ve "kalan isler" zorunlu doldurulacak.

---

## 14. Calisma sirasi

Uygulama sirasi asagidaki gibi olacaktir:

1. Mevcut ortak foundation kullanimini analiz et.
2. Reusable pattern tekrarlarini tespit et.
3. `components/ui` ve mevcut theme hattinda eksik primitive'leri tamamla.
4. Oncelikli ekranlari yeni yapiya tasi.
5. Deprecated kullanimlari isaretle veya migrate et.
6. Teslim raporu ver.

---

## 15. Bu milestone tamamlanmis sayilmaz eger

- Form/input primitive hala belirsiz birakilmissa.
- Typography kullanimi hala ekran bazli daginiksa.
- Tab/header contract'i netlesmediyse.
- Yeni paralel stil/token yapisi acildiysa.
- Teslim raporunda eksikler/kalan isler yazilmadiysa.
