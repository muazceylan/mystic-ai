import { SITE_URL, SITE_NAME, SUPPORTED_LOCALES } from './constants';
import type { Locale } from './constants';
import { fetchPostsFromCms, fetchPostBySlugFromCms } from './cms';

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  content: string;
  category: 'astroloji' | 'numeroloji' | 'ruya' | 'spirituel' | 'genel';
  publishedAt: string; // ISO date
  updatedAt?: string;
  readingTime: number; // minutes
  locale?: string;
  translationGroup?: string;
  /** Future-proof editorial fields — do not use for route/sitemap gating (use isPublished pattern). */
  editorialStatus?: 'draft' | 'review' | 'published';
  seoReviewed?: boolean;
  translationReviewed?: boolean;
}

/**
 * Static seed posts — used as fallback when CMS API is unavailable.
 */
const seedPosts: BlogPost[] = [
  {
    slug: 'natal-harita-nedir-nasil-yorumlanir',
    title: 'Natal Harita Nedir ve Nasil Yorumlanir?',
    description:
      'Natal haritanin temel bilesenleri, gezegen konumlari, evler ve aspektler. Dogum haritanizi anlamaniz icin kapsamli rehber.',
    category: 'astroloji',
    publishedAt: '2026-04-10',
    readingTime: 8,
    locale: 'tr',
    translationGroup: 'natal-harita-nedir-nasil-yorumlanir',
    content: `Natal harita, dogum aninizdaki gokyuzunun bir fotografidir. Gunes, Ay ve diger gezegenlerin hangi burcta ve hangi evde bulundugunu gosterir.

## Natal Haritanin Temel Bilesenleri

### Gezegenler
Her gezegen farkli bir yasam alanini ve enerjiyi temsil eder. Gunes kimliginizi, Ay duygularinizi, Merkur iletisiminizi, Venus ask ve guzellik anlayisinizi, Mars motivasyonunuzu gosterir.

### Burclar
12 burc, gezegenlerin enerjisini nasil ifade ettigini belirler. Ornegin Gunes Koc burcundaysa, kimliginizi cesur ve oncu bir sekilde ifade edersiniz.

### Evler
12 ev, yasaminizin farkli alanlarini temsil eder. 1. ev kendinizi, 7. ev iliskilerinizi, 10. ev kariyerinizi gosterir.

### Aspektler
Gezegenler arasindaki aci iliskileridir. Konjunksiyon (0°), trigon (120°), kare (90°) gibi aspektler, enerjilerin nasil etkilestigini gosterir.

## Natal Haritanizi Nasil Okursunuz?

1. **Yukselen burcunuzu** belirleyin — bu sizin dis dunyaya gorunusunuzdur
2. **Gunes burcunuzu** inceleyin — temel kimliginiz
3. **Ay burcunuzu** okuyun — duygusal dunya
4. **Gezegen dagiliminizi** kontrol edin — hangi evlerde yogunluk var?
5. **Onemli aspektleri** analiz edin — gezegenler arasi harmonik ve gergin iliskiler

## Dogum Saati Neden Onemlidir?

Dogum saati, yukselen burcunuzu ve ev yerlesimini belirler. Saati bilmeden gezegen burc konumlari hesaplanabilir, ancak tam bir natal harita yorumu icin dogum saati kritik oneme sahiptir.

AstroGuru uygulamasiyla natal haritanizi ucretsiz hesaplayabilir ve detayli AI destekli yorumlar alabilirsiniz.`,
  },
  {
    slug: 'yasam-yolu-sayisi-hesaplama',
    title: 'Yasam Yolu Sayisi Nedir ve Nasil Hesaplanir?',
    description:
      'Numerolojide en onemli sayi olan yasam yolu sayisini hesaplamayi ogren. Adim adim hesaplama ve her sayinin anlami.',
    category: 'numeroloji',
    publishedAt: '2026-04-12',
    readingTime: 6,
    locale: 'tr',
    translationGroup: 'yasam-yolu-sayisi-hesaplama',
    content: `Yasam yolu sayisi, numerolojideki en temel ve onemli sayidir. Dogum tarihinizden hesaplanir ve yasam amacini, dogal yeteneklerinizi ve karsiniza cikacak temalari ortaya koyar.

## Hesaplama Yontemi

Dogum tarihinizdeki tum rakamlari tek tek toplayarak tek haneli bir sayiya indirgersiniz.

### Ornek: 15 Mart 1990
- 1 + 5 + 0 + 3 + 1 + 9 + 9 + 0 = 28
- 2 + 8 = 10
- 1 + 0 = **1**

Yasam yolu sayisi: **1**

### Usta Sayilar
11, 22 ve 33 sayilarina ulasildiginda daha fazla indirgeme yapilmaz. Bunlar "usta sayilar" olarak adlandirilir ve ozel anlamlar tasir.

## Her Sayinin Anlami

**1 — Lider**: Bagimsiz, yenilikci, oncu. Kendi yolunuzu cizmeye egilimlisiniz.

**2 — Diplomat**: Isbirligi, denge, hassasiyet. Iliskilerde uyum arayansiniz.

**3 — Yaratici**: Ifade, sanat, iletisim. Yaratici yetenekleriniz gucludur.

**4 — Kurucu**: Duzene, disiplin, guvenilirlik. Saglam temeller kurarsiniz.

**5 — Kâsif**: Ozgurluk, degisim, macera. Yeni deneyimler arayansiniz.

**6 — Koruyucu**: Sorumluluk, aile, hizmet. Baskalarinin iyiligi icin calisirsiz.

**7 — Dusunur**: Analiz, spiritualite, ic dunya. Derin anlamlar arayansiniz.

**8 — Guc**: Basari, maddi dunya, otorite. Buyuk hedefler pesindesiniz.

**9 — Insancil**: Bilgelik, sefkat, evrensel ask. Insanliga hizmet etmeye egilimlisiniz.

AstroGuru uygulamasiyla yasam yolu sayinizi otomatik hesaplayabilir ve detayli yorumlar alabilirsiniz.`,
  },
  {
    slug: 'ruya-sembolleri-rehberi',
    title: 'En Sik Gorulen Ruya Sembolleri ve Anlamlari',
    description:
      'Ruyalarda en cok gorulen 10 sembol ve anlamlari. Su, ucmak, dismek, hayvanlar ve daha fazlasi.',
    category: 'ruya',
    publishedAt: '2026-04-14',
    readingTime: 7,
    locale: 'tr',
    translationGroup: 'ruya-sembolleri-rehberi',
    content: `Ruyalar, bilincdisimizin bize mesaj gonderdigi guclu bir aractir. Bazi semboller evrensel anlamlar tasirken, bazilari kisisel deneyimlerinize bagli olarak farkli anlamlar kazanabilir.

## 1. Su
Su, duygulari ve bilincdisini temsil eder. Berrak su ic huzuru, bulanik su duygusal karisikligi, sular altinda kalmak bunalmislik hissini gosterir.

## 2. Ucmak
Ucmak ozgurluk, kisisel guc ve sinirlarin asildigi hissini simgeler. Kontrol edilemez bir sekilde ucmak kontrol kaybina, ozgurce ucmak kisisel gelisime isarettir.

## 3. Dismek
En yaygin kaygi ruyalarindan biridir. Dismek kontrol kaybi, guven eksikligi veya buyuk bir degisim karanlama korkusunu temsil edebilir.

## 4. Dis dokulme
Disler guc ve guven simgesidir. Dis dokulme ruyalari ozsaygidaki sarsintilari, iletisim sorunlarini veya yaslanma kaygisini yansitabilir.

## 5. Kovalanmak
Kovalanma ruyalari genellikle kactigimiz duygulari veya durumlar yansitir. Kovalayan varlik, yuzlesmekten kacindiginiz bir konuyu temsil eder.

## 6. Hayvanlar
Yilan donusum ve sifayi, kedi bagimsilik ve sezgiyi, kopek sadakat ve arkadakligi, kus ozgurluk ve yuksek bilinci temsil eder.

## 7. Ev
Ev kendinizi ve ic dunyani temsil eder. Farkli odalar farkli yasam alanlarina, bodrumlar bastirılmis duygulara, catı kati yuksek ideallere isaret eder.

## 8. Sinav / Gec kalmak
Hazir olmama ve degerlendirme kaygisini yansitir. Gercek hayatta bir zorluga hazir olup olmadiginizi sorgulayan bilincdisi mesajidir.

## 9. Yol / Yolculuk
Yasam yolculugunuzu temsil eder. Yolun durumu, ilerleme hizinizi ve karsinizdaki engelleri gosterir.

## 10. Olu birini gormek
Vefat etmis birini ruyada gormek genellikle tamamlanmamis duygusal surecler veya o kisinin temsil ettigi ozelliklerin hayatinizdaki yansisini gosterir.

AstroGuru uygulamasindaki ruya gunlugu ile ruyalarinizi kaydedebilir ve yapay zeka destekli derinlemesine yorum alabilirsiniz.`,
  },
  {
    slug: 'gunluk-transit-nedir',
    title: 'Gunluk Transit Nedir ve Nasil Okunur?',
    description:
      'Astrolojide gunluk transit kavrami, natal haritayla etkilesimi ve gunluk yasama etkileri. Transit okuma rehberi.',
    category: 'astroloji',
    publishedAt: '2026-04-16',
    readingTime: 5,
    locale: 'tr',
    translationGroup: 'gunluk-transit-nedir',
    content: `Gunluk transitler, su anki gezegen konumlarinin natal haritanizla nasil etkilestigini gosterir. Gunun enerjisini anlamaniza ve buna gore adimlar atmaniza yardimci olur.

## Transit Nedir?

Transit, hareket halindeki gezegenlerin natal haritanizdaki sabit gezegen konumlarina yaptigi aspektlerdir. Ornegin bugun Mars natal Venusunuze kare aspekt yapiyorsa, iliskilerde gerginlik hissedebilirsiniz.

## Hizli ve Yavas Transitler

**Hizli transitler** (Ay, Merkur, Venus, Mars) gunluk ve haftalik etkilere sahiptir. Bunlar gunluk ruh halinizi, iletisiminizi ve enerjinizi etkiler.

**Yavas transitler** (Jupiter, Saturn, Uranius, Neptun, Pluto) aylar ve yillar suren etkiler yaratir. Bunlar buyuk yasam donusumlerini gosterir.

## Gunluk Transitler Nasil Okunur?

1. **Ay transiti** en hizli degisen transit. Ruh halinizi belirler.
2. **Merkur transiti** iletisim ve dusunce kalibinizi etkiler.
3. **Venus transiti** iliski ve estetik algilarinizi sekiller.
4. **Mars transiti** enerji seviyenizi ve motivasyonunuzu belirler.

## Transit Yorumunu Kisisel Yapan Ne?

Ayni transit herkes icin farkli etki yaratir cunku natal haritaniz benzersizdir. AstroGuru, transitlari natal haritanizla karsilastirarak size ozel yorumlar uretir.

AstroGuru uygulamasinda gunluk transit analizlerinizi takip edebilir ve kisisellestirilmis oneriler alabilirsiniz.`,
  },
  {
    slug: 'meditasyon-ve-astroloji-baglantisi',
    title: 'Meditasyon ve Astroloji: Kozmik Uyumla Ic Huzur',
    description:
      'Astroloji ve meditasyon pratigi arasindaki baglanti. Natal haritaniza gore meditasyon onerileri ve spirituel rehberlik.',
    category: 'spirituel',
    publishedAt: '2026-04-18',
    readingTime: 6,
    locale: 'tr',
    translationGroup: 'meditasyon-ve-astroloji-baglantisi',
    content: `Astroloji ve meditasyon, ilk bakista farkli disiplinler gibi gorunse de, her ikisi de ic dunyanizi anlamaniza ve yasam dengenizi bulmaniza yardimci olur.

## Astroloji Meditasyona Nasil Rehberlik Eder?

Natal haritaniz, dogal egilimlerinizi ve ihtiyaclarinizi ortaya koyar. Bu bilgiyi meditasyon pratiginize entegre ederek daha etkili sonuclar alabilirsiniz.

### Ates Burclari (Koc, Aslan, Yay)
Enerji dolu ve aksiyon odakli. **Hareket meditasyonu**, yuruyus meditasyonu veya aktif nefes calismalari uygun.

### Toprak Burclari (Boga, Basak, Oglak)
Somut ve bedensel. **Beden tarama meditasyonu**, yoga nidra ve topraklama pratikelri uygun.

### Hava Burclari (Ikizler, Terazi, Kova)
Zihinsel ve analitik. **Farkinalik meditasyonu**, mantra tekrarlari ve zihinsel berraklik calismalari uygun.

### Su Burclari (Yengec, Akrep, Balik)
Duygusal ve sezgisel. **Gorsellestirme meditasyonu**, duygusal salinma ve sezgi gelistirme pratikleri uygun.

## Ay Fazlarina Gore Meditasyon

**Yeni Ay**: Niyet belirleme meditasyonu. Yeni baslangiclari gorsellestirin.

**Ilk Dordun**: Aksiyon odakli meditasyon. Niyetlerinize dogru adim atma motivasyonu.

**Dolunay**: Minnet meditasyonu. Birakma ve kabul pratigi.

**Son Dordun**: Arindirma meditasyonu. Artik isinize yaramayan seylerden arinma.

## Gunluk Pratik Onerileri

- Sabah: 5-10 dakika niyet belirleme meditasyonu
- Ogle: 3 dakika nefes calisma (reset)
- Aksam: 10 dakika gunden arindirma meditasyonu

AstroGuru uygulamasinda natal haritaniza ve gunun transit enerjisine gore kisisellestirilmis spirituel rehberlik alabilirsiniz.`,
  },
];

const DEFAULT_POST_LOCALE: Locale = 'tr';

function withNormalizedLocale(post: BlogPost): BlogPost {
  return {
    ...post,
    locale: post.locale ?? DEFAULT_POST_LOCALE,
    translationGroup: post.translationGroup ?? post.slug,
  };
}

function matchesLocale(post: BlogPost, locale?: Locale): boolean {
  if (!locale) return true;
  return (post.locale ?? DEFAULT_POST_LOCALE) === locale;
}

function sortPosts(posts: BlogPost[]): BlogPost[] {
  return [...posts].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

function getSeedPosts(locale?: Locale): BlogPost[] {
  return seedPosts
    .map(withNormalizedLocale)
    .filter((post) => matchesLocale(post, locale));
}

export function getLocalizedPostPath(locale: Locale, slug: string): string {
  return locale === 'en' ? `/en/blog/${slug}` : `/blog/${slug}`;
}

export function getPostMetadataAlternates(
  slug: string,
  locale: Locale,
  availableLocales: Locale[],
) {
  const languages = Object.fromEntries(
    availableLocales.map((availableLocale) => [
      availableLocale,
      `${SITE_URL}${getLocalizedPostPath(availableLocale, slug)}`,
    ]),
  );

  if (availableLocales.includes('tr')) {
    languages['x-default'] = `${SITE_URL}${getLocalizedPostPath('tr', slug)}`;
  }

  return {
    canonical: getLocalizedPostPath(locale, slug),
    languages,
  };
}

/** Sync access to seed data (for build-time SSG fallback) */
export function getPostBySlug(slug: string, locale?: Locale): BlogPost | undefined {
  return getSeedPosts(locale).find((post) => post.slug === slug);
}

/** Sync access to seed data (for build-time SSG fallback) */
export function getAllPosts(locale?: Locale): BlogPost[] {
  return sortPosts(getSeedPosts(locale));
}

/** Async CMS-first fetch with local seed fallback */
export async function fetchAllPosts(locale?: Locale): Promise<BlogPost[]> {
  const cmsPosts = await fetchPostsFromCms(locale);
  const localizedCmsPosts = cmsPosts?.map(withNormalizedLocale) ?? [];

  if (localizedCmsPosts.length > 0) {
    return sortPosts(localizedCmsPosts);
  }

  return sortPosts(getSeedPosts(locale));
}

/** Async CMS-first fetch with local seed fallback */
export async function fetchPostBySlug(slug: string, locale?: Locale): Promise<BlogPost | undefined> {
  const cmsPost = await fetchPostBySlugFromCms(slug, locale);
  if (cmsPost) return withNormalizedLocale(cmsPost);
  return getPostBySlug(slug, locale);
}

export async function getAvailablePostLocales(slug: string): Promise<Locale[]> {
  const cmsLocaleChecks = await Promise.all(
    SUPPORTED_LOCALES.map(async (locale) => {
      const post = await fetchPostBySlugFromCms(slug, locale);
      return post ? locale : null;
    }),
  );

  const cmsLocales = cmsLocaleChecks.filter((locale): locale is Locale => locale !== null);
  if (cmsLocales.length > 0) {
    return cmsLocales;
  }

  return SUPPORTED_LOCALES.filter((locale) => Boolean(getPostBySlug(slug, locale)));
}

export function articleJsonLd(post: BlogPost, locale: Locale = 'tr') {
  const postPath = getLocalizedPostPath(locale, post.slug);

  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo.png`,
      },
    },
    inLanguage: locale,
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}${postPath}`,
    },
    url: `${SITE_URL}${postPath}`,
  };
}
