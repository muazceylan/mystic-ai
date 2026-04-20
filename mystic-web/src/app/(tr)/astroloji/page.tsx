import type { Metadata } from 'next';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { featurePageJsonLd, faqJsonLd } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Astroloji — Natal Harita ve Gunluk Transitler',
  description:
    'Kisisel natal haritani kesfet, gezegen konumlarini ve aspektlerini anla. Gunluk transit analizleri ile hayatina kozmik rehberlik al.',
  alternates: getMetadataAlternates('tr', '/astroloji'),
  openGraph: {
    title: 'Astroloji — Natal Harita ve Gunluk Transitler | AstroGuru',
    description:
      'Kisisel natal haritani kesfet, gezegen konumlarini ve aspektlerini anla. Gunluk transit analizleri ile hayatina kozmik rehberlik al.',
    url: `${SITE_URL}/astroloji`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

const topics = [
  {
    title: 'Natal Harita',
    description:
      'Dogum anindaki gokyuzu haritasi. Gezegen konumlari, ev yerlesimi, yukselen burc ve aspektler ile dogum aninin kozmik imzasini kesfet.',
  },
  {
    title: 'Gunluk Transitler',
    description:
      'Her gun icin kisisellestirilmis transit analizi. Gunun enerjisini, firsatlarini ve dikkat edilmesi gereken noktalarini ogren.',
  },
  {
    title: 'Kozmik Takvim',
    description:
      'Haftalik ve aylik gezegen hareketlerini takip et. Onemli gunleri, retro donusleri ve dolunay/yeniay tarihlerini gor.',
  },
  {
    title: 'Karar Pusulasi',
    description:
      'Onemli kararlarinda kozmik rehberlik al. Gezegen enerjilerini dikkate alarak en uygun zamanlama icin destek.',
  },
];

const faqItems = [
  {
    question: 'Natal harita nedir?',
    answer:
      'Natal harita, dogum anindaki gezegenlerin gokyuzundeki konumlarini gosteren bir haritadir. Kisiliginizi, guclu yonlerinizi ve yasam temalarinizi ortaya koyar.',
  },
  {
    question: 'Natal harita icin dogum saati gerekli mi?',
    answer:
      'Dogum saati, yukselen burc ve ev yerlesimi icin gereklidir. Dogum saati bilinmiyorsa gezegen burc konumlari ve aspektler yine de hesaplanabilir.',
  },
  {
    question: 'Gunluk transitler ne ise yarar?',
    answer:
      'Gunluk transitler, su anki gezegen hareketlerinin natal haritanizla nasil etkilestigini gosterir. Gunun enerjisini anlamaniza ve buna gore hareket etmenize yardimci olur.',
  },
];

export default function AstrolojiPage() {
  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          'Astroloji — Natal Harita ve Gunluk Transitler',
          'Kisisel natal harita analizi ve gunluk transit rehberligi.',
          `${SITE_URL}/astroloji`,
        )}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      {/* Hero */}
      <section className="bg-gradient-to-b from-indigo-950 to-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Natal Harita ve Gunluk Transitler
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-200">
            Dogum aninin kozmik haritasini kesfet. Gezegen konumlari, aspektler
            ve gunluk transit analizleri ile hayatina yon ver.
          </p>
        </div>
      </section>

      {/* Topics */}
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

      {/* FAQ */}
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

      {/* CTA */}
      <section className="bg-indigo-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Natal Haritani Kesfet</h2>
          <p className="mt-4 text-indigo-200">
            Uygulamayi indir, dogum bilgilerini gir ve kisisel haritani hemen gor.
          </p>
          <div className="mt-8">
            <DownloadCtaLink
              href="/#indir"
              label="Ucretsiz Indir"
              source="astrology_feature_page"
              placement="feature_page_footer"
              className="inline-flex h-12 items-center rounded-full bg-white px-8 text-sm font-semibold text-indigo-900 transition-transform hover:scale-105"
            />
          </div>
        </div>
      </section>
    </>
  );
}
