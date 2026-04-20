import type { Metadata } from 'next';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { featurePageJsonLd, faqJsonLd } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Spirituel Rehberlik — Dua, Esma ve Meditasyon',
  description:
    'Kisisellestirilmis spirituel rehberlik. Dua, esma ve meditasyon pratikleri ile ic dunyana yolculuk yap.',
  alternates: getMetadataAlternates('tr', '/spirituel-rehberlik'),
  openGraph: {
    title: 'Spirituel Rehberlik — Dua, Esma ve Meditasyon | AstroGuru',
    description:
      'Kisisellestirilmis spirituel rehberlik. Dua, esma ve meditasyon pratikleri ile ic dunyana yolculuk yap.',
    url: `${SITE_URL}/spirituel-rehberlik`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

const topics = [
  {
    title: 'Dua Rehberi',
    description:
      'Farkli niyet ve ihtiyaclara gore dua koleksiyonu. Her dua icin rehberlik, telaffuz destegi ve pratik onerileri.',
  },
  {
    title: 'Esma-ul Husna',
    description:
      '99 esma ile spirituel pratik. Her esmanin anlami, zikir sayisi ve kisisel natal haritanla uyumlu esma onerileri.',
  },
  {
    title: 'Meditasyon',
    description:
      'Rehberli meditasyon seanslarini kesfet. Nefes calismalari, farkindaliklarini guclendirmek icin pratikler.',
  },
  {
    title: 'Spirituel Gunluk',
    description:
      'Gunluk spirituel pratiklerini kaydet. Ruh halin, pratigin ve gelisimin hakkinda istatistikler ve icgoruler.',
  },
];

const faqItems = [
  {
    question: 'Spirituel rehberlik nasil kisisellestiriliyor?',
    answer:
      'Natal haritanizdaki gezegen konumlari ve tematik alanlar analiz edilerek size en uygun spirituel pratikler ve esmalar onerilir.',
  },
  {
    question: 'Esma onerileri nasil belirleniyor?',
    answer:
      'Natal haritanizdaki tematik alanlara ve mevcut transit enerjilerine gore kisisellestirilmis esma onerileri sunulur.',
  },
  {
    question: 'Pratiklerimi takip edebilir miyim?',
    answer:
      'Evet. Spirituel gunluk ozelligiyle gunluk, haftalik ve aylik pratik istatistiklerinizi gorebilir, gelisiminizi takip edebilirsiniz.',
  },
];

export default function SpiriruelRehberlikPage() {
  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          'Spirituel Rehberlik — Dua, Esma ve Meditasyon',
          'Kisisellestirilmis spirituel pratikler ve rehberlik.',
          `${SITE_URL}/spirituel-rehberlik`,
        )}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      <section className="bg-gradient-to-b from-emerald-950 to-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Dua, Esma ve Meditasyon
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-200">
            Kisisellestirilmis spirituel rehberlik ile ic dunyana yolculuk yap.
            Natal haritana uygun pratikler kesfet.
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

      <section className="bg-emerald-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Spirituel Yolculuguna Basla</h2>
          <p className="mt-4 text-emerald-200">
            Uygulamayi indir ve kisisellestirilmis spirituel rehberligini kesfet.
          </p>
          <div className="mt-8">
            <DownloadCtaLink
              href="/#indir"
              label="Ucretsiz Indir"
              source="spiritual_guidance_feature_page"
              placement="feature_page_footer"
              className="inline-flex h-12 items-center rounded-full bg-white px-8 text-sm font-semibold text-emerald-900 transition-transform hover:scale-105"
            />
          </div>
        </div>
      </section>
    </>
  );
}
