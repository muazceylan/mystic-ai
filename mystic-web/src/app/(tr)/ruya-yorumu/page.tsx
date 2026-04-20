import type { Metadata } from 'next';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { featurePageJsonLd, faqJsonLd } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Ruya Yorumu — Yapay Zeka Destekli Ruya Analizi',
  description:
    'Ruyalarini kaydet ve yapay zeka destekli derinlemesine yorum al. Ruya sembollerini anla, aylik ruya hikayeni kesfet.',
  alternates: getMetadataAlternates('tr', '/ruya-yorumu'),
  openGraph: {
    title: 'Ruya Yorumu — Yapay Zeka Destekli Ruya Analizi | AstroGuru',
    description:
      'Ruyalarini kaydet ve yapay zeka destekli derinlemesine yorum al. Ruya sembollerini anla, aylik ruya hikayeni kesfet.',
    url: `${SITE_URL}/ruya-yorumu`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

const topics = [
  {
    title: 'Ruya Gunlugu',
    description:
      'Ruyalarini metin veya sesli olarak kaydet. Yapay zeka ruyanin icerigi otomatik analiz eder ve anahtar sembolleri cikarir.',
  },
  {
    title: 'Sembol Analizi',
    description:
      'Ruyandaki sembollerin anlamlarini ogren. Genis sembol sozlugu ile her detayin ne ifade ettigini kesfet.',
  },
  {
    title: 'Aylik Ruya Hikayesi',
    description:
      'Bir ay boyunca gordugün ruyalarin ortak temalarini ve gelisimini analiz eden aylik rapor.',
  },
  {
    title: 'Kolektif Ruya Nabzi',
    description:
      'Topluluk genelinde en cok gorulen ruya temalarini ve sembolleri kesfet. Kolektif bilincdisinin nabzini tut.',
  },
];

const faqItems = [
  {
    question: 'Ruya yorumu nasil yapiliyor?',
    answer:
      'Ruyanizi metin veya ses olarak kaydediyorsunuz. Yapay zeka ruyanin icerigini analiz ederek sembolleri cikarir, psikolojik ve spirituel baglamda yorumlama sunar.',
  },
  {
    question: 'Sesli ruya kaydi destekleniyor mu?',
    answer:
      'Evet. Ruyanizi sesli olarak kaydedebilirsiniz. Ses-metin donusumu otomatik yapilir ve ardindan yorum sureci baslar.',
  },
  {
    question: 'Ruyalarim gizli tutuluyor mu?',
    answer:
      'Evet. Ruya kayitlariniz sifrelenmis olarak saklanir ve yalnizca sizin hesabinizdan erisilebilir. Ucuncu taraflarla paylasilmaz.',
  },
];

export default function RuyaYorumuPage() {
  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          'Ruya Yorumu — Yapay Zeka Destekli Ruya Analizi',
          'Yapay zeka ile ruya yorumlama ve sembol analizi.',
          `${SITE_URL}/ruya-yorumu`,
        )}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      <section className="bg-gradient-to-b from-violet-950 to-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Yapay Zeka Destekli Ruya Yorumu
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-violet-200">
            Ruyalarini kaydet, sembollerini anla ve bilincdisinin mesajlarini coz.
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

      <section className="bg-violet-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Ruyalarini Kesfet</h2>
          <p className="mt-4 text-violet-200">
            Uygulamayi indir ve ruyalarinin sana ne soyledigini ogren.
          </p>
          <div className="mt-8">
            <DownloadCtaLink
              href="/#indir"
              label="Ucretsiz Indir"
              source="dream_interpretation_feature_page"
              placement="feature_page_footer"
              className="inline-flex h-12 items-center rounded-full bg-white px-8 text-sm font-semibold text-violet-900 transition-transform hover:scale-105"
            />
          </div>
        </div>
      </section>
    </>
  );
}
