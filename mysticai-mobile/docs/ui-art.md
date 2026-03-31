PROJE GÖREVİ — UI MİMARİSİNİ BAŞTAN DÜZENLE / COMPONENT-BAZLI STİL SİSTEMİ KUR / SAYFALARI BOZMA

Bu projede UI katmanı dağınık. Ortak stil yaklaşımı net değil, component sınırları bulanık, buton/tabbar/typography/font kullanımları standardize değil. İstediğim şey mevcut sayfaları görsel olarak bozmadan, UI mimarisini baştan düzenlemen.

HEDEF
- Tüm UI mimarisini yeniden organize et.
- Sayfaların mevcut akışını, business logic’ini ve route yapısını bozma.
- Görsel yapı mümkün olduğunca korunacak; ama iç mimari profesyonel, ölçeklenebilir ve component-bazlı hale gelecek.
- Yeni geliştirilecek tüm ekranlar aynı UI sistemini kullanabilecek hale gelsin.
- “Bir ekranda ayrı, başka ekranda ayrı stil” kaosunu bitir.

KRİTİK KURAL
- Bu iş sadece kozmetik değil, mimari refactor işidir.
- Yarım bırakma.
- Geçici çözüm üretme.
- Dosya dosya uygula.
- Kullanılmayan eski stil yapılarını temizle.
- Sonunda detaylı teslim raporu ver.

TEKNİK HEDEF MİMARİ
UI katmanı aşağıdaki prensiplerle yeniden kurulacak:

1) COMPONENT-BAZLI YAPI
- Her reusable UI parçası ayrı component olacak.
- Her component kendi stilini kendi içinde veya kendi klasöründe taşıyacak.
- Stil, component’e yakın olacak; rastgele tek bir global dosyada birikmeyecek.
- “screen içinde inline style yığını” yaklaşımı kaldırılacak.
- Büyük ekran dosyaları parçalanacak.

2) TASARIM SİSTEMİ OLUŞTUR
Projede net bir design system kurulacak:
- Renk sistemi
- Typography sistemi
- Font family / weight / size / lineHeight sistemi
- Spacing sistemi
- Radius sistemi
- Shadow/elevation sistemi
- Border sistemi
- Z-index/layering yaklaşımı
- Opacity/overlay değerleri
- Icon size standartları
- Button height / input height / chip / card / header / tabbar ölçüleri
- Light/dark mode uyumu varsa bunu bozmadan sistematik hale getir

3) GLOBAL STYLE ÇÖPLÜĞÜ YAPMA
- Tek bir “styles.ts” ya da “commonStyles.ts” içine yüzlerce stil yığma.
- Merkezi yerde sadece design token / theme contract / primitive sabitler olabilir.
- Component görünümü component seviyesinde tanımlansın.
- Ama renk, spacing, typography, radius, shadow gibi kararlar merkezi token sistemi üzerinden beslensin.
- Yani:
  - Merkezi: tokens, theme, semantic values
  - Yerel: component’in kendi stili
Bu ayrımı temiz kur.

4) ORTAK UI BİLEŞENLERİNİ STANDARDİZE ET
Aşağıdaki bileşenleri reusable ve production-ready hale getir:
- Button
  - primary
  - secondary
  - ghost
  - outline
  - danger
  - icon button
  - loading
  - disabled
  - full width / compact / large varyantları
- Text / Typography primitives
  - display
  - title
  - subtitle
  - body
  - caption
  - label
- Screen container
- Section container
- Card
- Chip / Tag / Pill
- Divider
- Icon wrapper
- Input / TextField
- Search input
- TextArea
- Switch / Toggle row
- Modal / BottomSheet içerik wrapper’ları
- Empty state
- Loading state / skeleton varsa düzenle
- List item patternleri
- Header patternleri
- TabBar / custom tab item
- CTA row / sticky bottom action area
- Badge / counter / status indicator

5) TABBAR VE NAVIGATION UI STANDARDI
- Tab bar görünümü tek standarda bağlanacak.
- Aktif/pasif icon davranışı, label stili, spacing, hit area, safe area, yükseklik, background, blur/shadow yaklaşımı net olsun.
- Bottom tab’ın farklı ekranlarda farklı görünmesi engellensin.
- Header/title/back davranışları mümkün olduğunca ortak desenle yönetilsin.
- Navigation kaynaklı layout zıplamaları varsa azalt.

6) FONT VE TYPOGRAPHY STANDARDI
- Projede hangi fontlar kullanılıyorsa tek yerde tanımla.
- Font kullanımını component seviyesinde rastgele yapma.
- Tüm başlıklar, metinler, buton label’ları, tab label’ları typography sisteminden beslensin.
- Hardcoded fontSize/fontWeight kalabalığını temizle.
- Metin hiyerarşisi netleşsin.
- Türkçe içeriklerin okunabilirliğini bozma.

7) SCREEN DOSYALARINI TEMİZLE
- Screen dosyaları mümkün olduğunca orchestration katmanı gibi çalışsın.
- Büyük JSX bloklarını componentlere ayır.
- Stil ve layout tekrarlarını çıkar.
- Aynı card, aynı section, aynı title patterni farklı ekranlarda kopyalanmışsa ortaklaştır.
- Business logic’i gereksiz yere taşıma; UI ayrıştırmasını dikkatli yap.

8) CSS / STYLE YAKLAŞIMI
Projede kullanılan styling yaklaşımı neyse ona sadık kal ama mimariyi düzelt:
- StyleSheet kullanılıyorsa düzenli ve component-bazlı kullan
- NativeWind / benzeri yapı varsa yine component-bazlı contract kur
- Inline style sadece gerçekten dinamik durumda ve anlamlıysa kalsın
- Magic number kullanımını azalt
- Tekrarlanan değerleri token’a bağla
- Gereksiz re-render üreten style üretimlerini azalt

9) SAYFALARI GÖRSEL OLARAK BOZMA
En kritik konulardan biri bu:
- Var olan ekranların route, içerik ve genel görsel kurgusu korunacak
- Refactor sonrası “tamamen başka tasarım olmuş” görüntüsü istemiyorum
- Ama dağınık, tutarsız, tekrar eden UI yapıları temizlenecek
- Hedef: görsel parity + mimari iyileşme
- Yani kullanıcı mevcut sayfayı tanımaya devam etmeli ama kod tarafı profesyonel hale gelmeli

10) COMPONENT DOSYA ORGANİZASYONU
Aşağıdaki gibi net ve sürdürülebilir bir klasörleme yap:
- ui/
  - primitives/
  - components/
  - navigation/
  - feedback/
  - form/
  - layout/
- theme/
  - tokens
  - colors
  - typography
  - spacing
  - radius
  - shadows
  - semantic mapping
- screen’lerde kullanılan özel parçalar ekran altı component klasörlerine ayrılabilir
- Çok genel component ile sadece tek ekrana özel component’i birbirine karıştırma

11) TOKEN / SEMANTIC AYRIMINI DOĞRU KUR
Aşağıdakileri ayır:
- Raw tokens: sayı/renk/radius/spacings
- Semantic tokens: surface, background, textPrimary, textSecondary, borderSubtle, actionPrimary vb.
- Component variant mapping: Button primary, Card elevated, Tab active, Badge success vb.
Bu katmanları karıştırma.

12) VARIANT SİSTEMİ KUR
Özellikle reusable bileşenlerde varyant mantığı kur:
- size
- tone
- emphasis
- state
- icon position
- fullWidth
- pressed / disabled / loading
Ama abartılı generic yapı kurup okunabilirliği bozma.

13) ERİŞİLEBİLİRLİK VE DOKUNMATİK KALİTE
- Dokunma alanlarını iyileştir
- Küçük icon-only target’ları düzelt
- Kontrastı bozma
- Text overflow durumlarını kontrol et
- Uzun Türkçe metinlerde kırılma ve line-height kalitesini koru
- Accessibility label gerektiren temel yerleri atlama

14) PERFORMANS
- Gereksiz büyük component render zincirlerini azalt
- Memoization gerekiyorsa abartmadan kullan
- Stil objeleri yüzünden gereksiz render üretme
- FlatList / SectionList kullanılan yerlerde item component ayrımını düzgün yap
- Animated/Navigation kaynaklı layout flicker varsa kötüleştirme

15) KALDIRILACAK KÖTÜ PRATİKLER
Aşağıdakileri tespit edip temizle:
- Ekran içinde dağınık inline style kümeleri
- Aynı stilin copy-paste edilmiş halleri
- Rastgele margin/padding düzeltmeleri
- Aynı işi yapan birden fazla benzer UI component
- Hardcoded font family / font size / color
- Safe area / bottom spacing hack’leri
- Tabbar/header için ekran bazlı kırık override’lar
- Kullanılmayan style blokları ve ölü componentler

16) UYGULAMA ŞEKLİ
Bu işi bir kerede bütün projeye yay:
- Önce mevcut UI yapısını analiz et
- Tekrarlanan desenleri çıkar
- Ortak reusable componentleri belirle
- Theme/token altyapısını kur
- Sonra ekranları sırayla yeni yapıya taşı
- Her taşımada görsel bozulma yaratma
- Eski kullanım yerlerini migrate et
- Migration bitmeden sistemi yarım bırakma

17) DOKUNULMAMASI GEREKENLER
- Route yapısını bozma
- API/business logic akışlarını bozma
- State management düzenini gereksiz yere değiştirme
- Sadece UI refactor bahanesiyle feature davranışlarını değiştirme
- Kullanıcı akışını kırma
- Çalışan ekranı gereksiz yere yeniden tasarlama

18) ÇIKTI BEKLENTİSİ
Çalışma sonunda aşağıdakileri teslim et:
- Yeni UI mimarisi uygulanmış kod
- Oluşturulan / güncellenen component listesi
- Theme/token yapısı
- Standardize edilen button/tabbar/typography sistemi
- Refactor edilen ekran listesi
- Kaldırılan eski stil yapıları
- Gerekliyse migration notları
- Riskli görülen alanlar
- Sonraki ekranların bu sistemi nasıl kullanacağına dair kısa yönlendirme

19) TESLİM RAPORU ZORUNLU
İş bitince şu formatta rapor ver:
1. Yapılan mimari değişiklikler
2. Oluşturulan yeni klasör/dosyalar
3. Refactor edilen ekranlar
4. Standardize edilen reusable componentler
5. Typography / font / spacing / color sistemi
6. Tabbar / header / button standardizasyonu
7. Silinen eski / gereksiz yapılar
8. Kırılma riski olan noktalar
9. Manuel test edilmesi gereken alanlar

20) KABUL KRİTERLERİ
İş ancak şu şartlarla tamamlanmış sayılacak:
- UI component-bazlı mimariye geçmiş olacak
- Ortak tasarım kararları sistematik olacak
- Button, tabbar, typography, font ve temel UI standartları netleşmiş olacak
- Screen dosyaları sadeleşmiş olacak
- Tekrarlayan stiller azaltılmış olacak
- Yeni ekran geliştirirken kullanılacak temiz UI altyapısı kurulmuş olacak
- Mevcut sayfalar bozulmamış olacak
- Eksik bırakılmış migrate edilmemiş kritik ekran olmayacak

21) ÇALIŞMA PRENSİBİ
- Tahmin etme, kodu incele
- Dosya dosya ilerle
- Gerekirse componentleri böl
- Ama over-engineering yapma
- Okunabilirlik ve sürdürülebilirlik öncelik olsun
- “Şimdilik böyle kalsın” yaklaşımı istemiyorum
- Prod-ready kalite istiyorum

Bu görev bir UI cleanup değil; tam kapsamlı UI architecture refactor görevidir.
Eksik bırakma.
Tüm kritik ekranları yeni sisteme geçir.
Kod tabanını bundan sonra büyütülebilir hale getir.