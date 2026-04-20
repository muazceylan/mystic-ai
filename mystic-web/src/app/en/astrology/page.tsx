import type { Metadata } from 'next';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { featurePageJsonLd, faqJsonLd } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Astrology — Natal Chart & Daily Transits',
  description:
    'Discover your personal natal chart, understand planet positions and aspects. Get daily transit analyses for cosmic guidance in your life.',
  alternates: getMetadataAlternates('en', '/astroloji'),
  openGraph: {
    title: 'Astrology — Natal Chart & Daily Transits | AstroGuru',
    description:
      'Discover your personal natal chart, understand planet positions and aspects. Get daily transit analyses for cosmic guidance in your life.',
    url: `${SITE_URL}/en/astrology`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

const topics = [
  {
    title: 'Natal Chart',
    description:
      'The sky map of your birth moment. Discover the cosmic signature through planet positions, house placements, rising sign and aspects.',
  },
  {
    title: 'Daily Transits',
    description:
      'Personalized transit analysis for each day. Learn about the energy, opportunities, and points of attention for the day.',
  },
  {
    title: 'Cosmic Calendar',
    description:
      'Track weekly and monthly planetary movements. See important dates, retrograde periods, and full/new moon dates.',
  },
  {
    title: 'Decision Compass',
    description:
      'Get cosmic guidance for important decisions. Support for optimal timing based on planetary energies.',
  },
];

const faqItems = [
  {
    question: 'What is a natal chart?',
    answer:
      'A natal chart is a map showing the positions of planets in the sky at the moment of your birth. It reveals your personality, strengths, and life themes.',
  },
  {
    question: 'Is birth time required for a natal chart?',
    answer:
      'Birth time is needed for the rising sign and house placements. Without birth time, planet sign positions and aspects can still be calculated.',
  },
  {
    question: 'What are daily transits used for?',
    answer:
      'Daily transits show how current planetary movements interact with your natal chart. They help you understand the energy of the day and act accordingly.',
  },
];

export default function AstrologyPage() {
  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          'Astrology — Natal Chart & Daily Transits',
          'Personal natal chart analysis and daily transit guidance.',
          `${SITE_URL}/en/astrology`,
        )}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      <section className="bg-gradient-to-b from-indigo-950 to-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Natal Chart & Daily Transits
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-indigo-200">
            Discover the cosmic map of your birth moment. Navigate your life
            with planet positions, aspects and daily transit analyses.
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

      <section className="bg-indigo-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Discover Your Natal Chart</h2>
          <p className="mt-4 text-indigo-200">
            Download the app, enter your birth details, and see your personal chart instantly.
          </p>
          <div className="mt-8">
            <DownloadCtaLink
              href="/en#download"
              label="Download Free"
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
