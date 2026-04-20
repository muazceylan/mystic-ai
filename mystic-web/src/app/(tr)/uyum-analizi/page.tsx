import type { Metadata } from 'next';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { featurePageJsonLd, faqJsonLd } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Uyum Analizi — Iliski Uyumu ve Synastry',
  description:
    'Iki kisi arasindaki kozmik uyumu kesfet. Synastry analizi, guclu yonler, zorluklar ve iliski dinamikleri hakkinda detayli bilgi al.',
  alternates: getMetadataAlternates('tr', '/uyum-analizi'),
  openGraph: {
    title: 'Uyum Analizi — Iliski Uyumu ve Synastry | AstroGuru',
    description:
      'Iki kisi arasindaki kozmik uyumu kesfet. Synastry analizi, guclu yonler, zorluklar ve iliski dinamikleri hakkinda detayli bilgi al.',
    url: `${SITE_URL}/uyum-analizi`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

const topics = [
  {
    title: 'Synastry Analizi',
    description:
      'Iki kisinin natal haritalarinin karsilastirmasi. Gezegen aspektleri uzerinden iliski dinamiklerini, uyum alanlarini ve zorluk noktalarini kesfet.',
  },
  {
    title: 'Uyum Skoru',
    description:
      'Genel uyum yuzdesi ve kategori bazli degerlendirme. Duygusal, zihinsel, fiziksel ve spirituel uyum alanlarini gor.',
  },
  {
    title: 'Guclu Yonler',
    description:
      'Iliskinizin en guclu kozmik destekleri. Dogal uyum alanlari ve birlikte buyume firsatlari.',
  },
  {
    title: 'Zorluklar ve Tavsiyeler',
    description:
      'Potansiyel calisma alanlari ve bunlari asmak icin kozmik tavsiyeler. Her zorluk bir gelisim firsati tasir.',
  },
];

const faqItems = [
  {
    question: 'Synastry analizi nedir?',
    answer:
      'Synastry, iki kisinin natal haritalarini karsilastirarak aralarindaki gezegen aspektlerini ve enerji alisverisini inceleyen astrolojik yontemdir.',
  },
  {
    question: 'Uyum analizi icin ne gerekli?',
    answer:
      'Her iki kisinin dogum tarihi, dogum saati (tercihen) ve dogum yeri gereklidir. Dogum saati bilinmiyorsa temel uyum analizi yine de yapilabilir.',
  },
  {
    question: 'Dusuk uyum skoru iliskinin kotu oldugu anlamina mi gelir?',
    answer:
      'Hayir. Dusuk uyum skoru zorluk alanlarinin fazla oldugunu gosterir, ancak zorluklar bilinclı calisma ile buyume firsatina donusebilir. Onemli olan farkindaliktir.',
  },
];

export default function UyumAnaliziPage() {
  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          'Uyum Analizi — Iliski Uyumu ve Synastry',
          'Synastry analizi ile iliski uyumu kesfetme.',
          `${SITE_URL}/uyum-analizi`,
        )}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      <section className="bg-gradient-to-b from-rose-950 to-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Iliski Uyumu ve Synastry Analizi
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-rose-200">
            Iki kisi arasindaki kozmik uyumu kesfet. Guclu yonleri, zorluklari
            ve iliski dinamiklerini anla.
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

      <section className="bg-rose-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Uyumunuzu Kesfet</h2>
          <p className="mt-4 text-rose-200">
            Uygulamayi indir ve kozmik uyumunuzu hemen analiz edin.
          </p>
          <div className="mt-8">
            <DownloadCtaLink
              href="/#indir"
              label="Ucretsiz Indir"
              source="compatibility_analysis_feature_page"
              placement="feature_page_footer"
              className="inline-flex h-12 items-center rounded-full bg-white px-8 text-sm font-semibold text-rose-900 transition-transform hover:scale-105"
            />
          </div>
        </div>
      </section>
    </>
  );
}
