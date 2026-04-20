import type { Metadata } from 'next';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { featurePageJsonLd, faqJsonLd } from '@/lib/jsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';

export const metadata: Metadata = {
  title: 'Spiritual Guidance — Prayer, Dhikr & Meditation',
  description:
    'Personalized spiritual guidance. Journey within through prayer, dhikr and meditation practices.',
  alternates: getMetadataAlternates('en', '/spirituel-rehberlik'),
  openGraph: {
    title: 'Spiritual Guidance — Prayer, Dhikr & Meditation | AstroGuru',
    description:
      'Personalized spiritual guidance. Journey within through prayer, dhikr and meditation practices.',
    url: `${SITE_URL}/en/spiritual-guidance`,
    images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
  },
};

const topics = [
  {
    title: 'Prayer Guide',
    description:
      'A collection of prayers for different intentions and needs. Guidance, pronunciation support and practical suggestions for each prayer.',
  },
  {
    title: 'Names of God (Asma al-Husna)',
    description:
      'Spiritual practice with the 99 Divine Names. Meaning, recitation count and personalized name recommendations aligned with your natal chart.',
  },
  {
    title: 'Meditation',
    description:
      'Explore guided meditation sessions. Practices to strengthen your breath work and mindfulness.',
  },
  {
    title: 'Spiritual Journal',
    description:
      'Record your daily spiritual practices. Statistics and insights about your mood, practice and development.',
  },
];

const faqItems = [
  {
    question: 'How is spiritual guidance personalized?',
    answer:
      'Your natal chart planetary positions and thematic areas are analyzed to suggest the most suitable spiritual practices and Divine Names for you.',
  },
  {
    question: 'How are Name recommendations determined?',
    answer:
      'Personalized Divine Name recommendations are offered based on the thematic areas of your natal chart and current transit energies.',
  },
  {
    question: 'Can I track my practices?',
    answer:
      'Yes. With the spiritual journal feature, you can see daily, weekly and monthly practice statistics and track your progress.',
  },
];

export default function SpiritualGuidancePage() {
  return (
    <>
      <JsonLd
        data={featurePageJsonLd(
          'Spiritual Guidance — Prayer, Dhikr & Meditation',
          'Personalized spiritual practices and guidance.',
          `${SITE_URL}/en/spiritual-guidance`,
        )}
      />
      <JsonLd data={faqJsonLd(faqItems)} />

      <section className="bg-gradient-to-b from-emerald-950 to-zinc-950 py-20 text-white sm:py-28">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Prayer, Dhikr & Meditation
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-emerald-200">
            Journey within through personalized spiritual guidance. Discover
            practices aligned with your natal chart.
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

      <section className="bg-emerald-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold">Begin Your Spiritual Journey</h2>
          <p className="mt-4 text-emerald-200">
            Download the app and discover personalized spiritual guidance.
          </p>
          <div className="mt-8">
            <DownloadCtaLink
              href="/en#download"
              label="Download Free"
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
