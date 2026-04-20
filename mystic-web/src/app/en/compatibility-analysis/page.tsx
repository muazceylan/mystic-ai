import type { Metadata } from 'next';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { featurePageJsonLd, faqJsonLd } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Compatibility Analysis — Relationship Harmony & Synastry',
  description:
    'Discover the cosmic harmony between two people. Get detailed information about synastry analysis, strengths, challenges and relationship dynamics.',
  alternates: getMetadataAlternates('en', '/uyum-analizi'),
  openGraph: {
    title: 'Compatibility Analysis — Relationship Harmony & Synastry | AstroGuru',
    description:
      'Discover the cosmic harmony between two people. Get detailed information about synastry analysis, strengths, challenges and relationship dynamics.',
    url: `${SITE_URL}/en/compatibility-analysis`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

const topics = [
  {
    title: 'Synastry Analysis',
    description:
      'Comparison of two natal charts. Discover relationship dynamics, areas of harmony and challenge points through planetary aspects.',
  },
  {
    title: 'Compatibility Score',
    description:
      'Overall compatibility percentage and category-based assessment. See emotional, mental, physical and spiritual harmony areas.',
  },
  {
    title: 'Strengths',
    description:
      'The strongest cosmic supports of your relationship. Natural harmony areas and opportunities for growth together.',
  },
  {
    title: 'Challenges & Advice',
    description:
      'Potential areas to work on and cosmic advice to overcome them. Every challenge carries a growth opportunity.',
  },
];

const faqItems = [
  {
    question: 'What is synastry analysis?',
    answer:
      'Synastry is an astrological method that compares the natal charts of two people to examine planetary aspects and energy exchange between them.',
  },
  {
    question: 'What is needed for compatibility analysis?',
    answer:
      'Birth date, birth time (preferably), and birthplace of both people are required. If birth time is unknown, a basic compatibility analysis can still be performed.',
  },
  {
    question: 'Does a low compatibility score mean the relationship is bad?',
    answer:
      'No. A low compatibility score indicates more areas of challenge, but challenges can be transformed into growth opportunities through conscious effort. Awareness is what matters.',
  },
];

export default function CompatibilityAnalysisPage() {
  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          'Compatibility Analysis — Relationship Harmony & Synastry',
          'Discover relationship compatibility through synastry analysis.',
          `${SITE_URL}/en/compatibility-analysis`,
        )}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      <section className="bg-gradient-to-b from-rose-950 to-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Relationship Harmony & Synastry Analysis
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-rose-200">
            Discover the cosmic harmony between two people. Understand strengths,
            challenges and relationship dynamics.
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
          <h2 className="text-2xl font-bold tracking-tight">Frequently Asked Questions</h2>
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
          <h2 className="text-2xl font-bold">Discover Your Compatibility</h2>
          <p className="mt-4 text-rose-200">
            Download the app and analyze your cosmic compatibility right away.
          </p>
          <div className="mt-8">
            <DownloadCtaLink
              href="/en#download"
              label="Download Free"
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
