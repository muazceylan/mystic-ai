import type { Metadata } from 'next';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { featurePageJsonLd, faqJsonLd } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Dream Interpretation — AI-Powered Dream Analysis',
  description:
    'Record your dreams and get AI-powered deep interpretations. Understand dream symbols and explore your monthly dream story.',
  alternates: getMetadataAlternates('en', '/ruya-yorumu'),
  openGraph: {
    title: 'Dream Interpretation — AI-Powered Dream Analysis | AstroGuru',
    description:
      'Record your dreams and get AI-powered deep interpretations. Understand dream symbols and explore your monthly dream story.',
    url: `${SITE_URL}/en/dream-interpretation`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

const topics = [
  {
    title: 'Dream Journal',
    description:
      'Record your dreams via text or voice. AI automatically analyzes the content and extracts key symbols.',
  },
  {
    title: 'Symbol Analysis',
    description:
      'Learn the meanings of symbols in your dreams. Explore what every detail signifies with our extensive symbol dictionary.',
  },
  {
    title: 'Monthly Dream Story',
    description:
      'A monthly report analyzing the common themes and development across the dreams you had over the month.',
  },
  {
    title: 'Collective Dream Pulse',
    description:
      'Discover the most common dream themes and symbols across the community. Feel the pulse of the collective unconscious.',
  },
];

const faqItems = [
  {
    question: 'How does dream interpretation work?',
    answer:
      'You record your dream as text or voice. AI analyzes the content, extracts symbols, and provides psychological and spiritual interpretation.',
  },
  {
    question: 'Is voice dream recording supported?',
    answer:
      'Yes. You can record your dream by voice. Speech-to-text conversion is done automatically, then the interpretation process begins.',
  },
  {
    question: 'Are my dreams kept private?',
    answer:
      'Yes. Your dream records are stored encrypted and are only accessible from your account. They are not shared with third parties.',
  },
];

export default function DreamInterpretationPage() {
  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          'Dream Interpretation — AI-Powered Dream Analysis',
          'AI-powered dream interpretation and symbol analysis.',
          `${SITE_URL}/en/dream-interpretation`,
        )}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      <section className="bg-gradient-to-b from-violet-950 to-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            AI-Powered Dream Interpretation
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-violet-200">
            Record your dreams, understand the symbols, and decode the messages
            from your subconscious.
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

      <section className="bg-violet-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Explore Your Dreams</h2>
          <p className="mt-4 text-violet-200">
            Download the app and discover what your dreams are telling you.
          </p>
          <div className="mt-8">
            <DownloadCtaLink
              href="/en#download"
              label="Download Free"
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
