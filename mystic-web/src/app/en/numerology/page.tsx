import type { Metadata } from 'next';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { featurePageJsonLd, faqJsonLd } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Numerology — The Hidden Meaning of Numbers',
  description:
    'Discover the numerical vibrations from your birth date and name. Learn your life path number, destiny number and personal year.',
  alternates: getMetadataAlternates('en', '/numeroloji'),
  openGraph: {
    title: 'Numerology — The Hidden Meaning of Numbers | AstroGuru',
    description:
      'Discover the numerical vibrations from your birth date and name. Learn your life path number, destiny number and personal year.',
    url: `${SITE_URL}/en/numerology`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

const topics = [
  {
    title: 'Life Path Number',
    description:
      'The most important numerological number, calculated from your birth date. It reveals your life purpose, natural talents and growth direction.',
  },
  {
    title: 'Destiny Number',
    description:
      'The numerical vibration calculated from your full name. A map of what you are here to do and your potential.',
  },
  {
    title: 'Personal Year',
    description:
      'The energy of your current year. Each year carries a different numerical vibration and presents different opportunities.',
  },
  {
    title: 'Name Analysis',
    description:
      'The numerical meaning your name carries. Discover what your name tells you through each letter vibration and total energy.',
  },
];

const faqItems = [
  {
    question: 'What is numerology?',
    answer:
      'Numerology is the study of using vibrational energies of numbers to gain insights about personality, life purpose and the future. Birth date and name are the primary calculation sources.',
  },
  {
    question: 'How is the life path number calculated?',
    answer:
      'You add all digits of your birth date one by one to reduce to a single digit (or master numbers 11, 22, 33). For example, March 15, 1990 → 1+5+0+3+1+9+9+0 = 28 → 2+8 = 10 → 1+0 = 1.',
  },
  {
    question: 'What is the difference between numerology and astrology?',
    answer:
      'Astrology uses planetary positions and celestial movements, while numerology works with numerical vibrations. They are complementary systems that enrich each other.',
  },
];

export default function NumerologyPage() {
  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          'Numerology — The Hidden Meaning of Numbers',
          'Numerology birth date and name analysis.',
          `${SITE_URL}/en/numerology`,
        )}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      <section className="bg-gradient-to-b from-purple-950 to-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            The Hidden Meaning of Numbers
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-purple-200">
            Discover the numerical vibrations from your birth date and name.
            Understand your life path, destiny and potential.
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

      <section className="bg-purple-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Discover Your Numerology Chart</h2>
          <p className="mt-4 text-purple-200">
            Download the app and learn what your numbers are telling you.
          </p>
          <div className="mt-8">
            <DownloadCtaLink
              href="/en#download"
              label="Download Free"
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
