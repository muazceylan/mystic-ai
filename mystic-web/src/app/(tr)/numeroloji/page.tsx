import type { Metadata } from 'next';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { featurePageJsonLd, faqJsonLd } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Numeroloji — Sayilarin Gizli Anlami',
  description:
    'Dogum tarihinden ve isminden gelen sayisal titresimlerini kesfet. Yasam yolu sayini, kader sayini ve kisisel yilini ogren.',
  alternates: getMetadataAlternates('tr', '/numeroloji'),
  openGraph: {
    title: 'Numeroloji — Sayilarin Gizli Anlami | AstroGuru',
    description:
      'Dogum tarihinden ve isminden gelen sayisal titresimlerini kesfet. Yasam yolu sayini, kader sayini ve kisisel yilini ogren.',
    url: `${SITE_URL}/numeroloji`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

const topics = [
  {
    title: 'Yasam Yolu Sayisi',
    description:
      'Dogum tarihinden hesaplanan en onemli numerolojik sayi. Yasam amacini, dogal yeteneklerini ve gelisim yonunu ortaya koyar.',
  },
  {
    title: 'Kader Sayisi',
    description:
      'Tam isimden hesaplanan sayisal titresim. Hayatta ne yapman icin burada oldugunun ve potansiyelinin haritasi.',
  },
  {
    title: 'Kisisel Yil',
    description:
      'Icerisinde bulundugun yilin enerjisi. Her yil farkli bir sayisal titresim tasir ve sana farkli firsatlar sunar.',
  },
  {
    title: 'Isim Analizi',
    description:
      'Isminin tasidigi sayisal anlam. Her harfin titresimi ve toplam enerjisi ile ismin sana ne soyluyor kesfet.',
  },
];

const faqItems = [
  {
    question: 'Numeroloji nedir?',
    answer:
      'Numeroloji, sayilarin titresimsel enerjilerini kullanarak kisilik, yasam amaci ve gelecek hakkinda bilgi edinme bilimidir. Dogum tarihi ve isim temel hesaplama kaynaklaridir.',
  },
  {
    question: 'Yasam yolu sayisi nasil hesaplanir?',
    answer:
      'Dogum tarihinizdeki tum rakamlari tek tek toplayarak tek haneli bir sayiya (veya usta sayi olan 11, 22, 33\'e) indirgersiniz. Ornegin 15.03.1990 → 1+5+0+3+1+9+9+0 = 28 → 2+8 = 10 → 1+0 = 1.',
  },
  {
    question: 'Numeroloji ve astroloji arasindaki fark nedir?',
    answer:
      'Astroloji gezegen konumlarini ve gokyuzu hareketlerini kullanirken, numeroloji sayisal titresimlerle calisir. Ikisi birbirini tamamlayan sistemlerdir.',
  },
];

export default function NumerolojiPage() {
  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          'Numeroloji — Sayilarin Gizli Anlami',
          'Numeroloji ile dogum tarihi ve isim analizleri.',
          `${SITE_URL}/numeroloji`,
        )}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      <section className="bg-gradient-to-b from-purple-950 to-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Sayilarin Gizli Anlami
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-purple-200">
            Dogum tarihinden ve isminden gelen sayisal titresimlerini kesfet.
            Yasam yolunu, kaderini ve potansiyelini anla.
          </p>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2">
            {topics.map((topic) => (
              <div
                key={topic.title}
                className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800"
              >
                <h2 className="text-xl font-semibold">{topic.title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {topic.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-zinc-200 py-20 dark:border-zinc-800">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <h2 className="text-2xl font-bold tracking-tight">Sik Sorulan Sorular</h2>
          <dl className="mt-8 space-y-8">
            {faqItems.map((item) => (
              <div key={item.question}>
                <dt className="font-semibold">{item.question}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {item.answer}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="bg-purple-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Numeroloji Haritani Kesfet</h2>
          <p className="mt-4 text-purple-200">
            Uygulamayi indir ve sayilarinin sana ne soyledigini ogren.
          </p>
          <div className="mt-8">
            <DownloadCtaLink
              href="/#indir"
              label="Ucretsiz Indir"
              source="numerology_feature_page"
              placement="feature_page_footer"
              className="inline-flex h-12 items-center rounded-full bg-white px-8 text-sm font-semibold text-purple-900 transition-transform hover:scale-105"
            />
          </div>
        </div>
      </section>
    </>
  );
}
