import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { fetchPostBySlug, getAllPosts, articleJsonLd } from '@/lib/blog';
import { ArticleOpenTracker } from '@/components/ArticleOpenTracker';
import { DownloadCtaLink } from '@/components/DownloadCtaLink';
import { JsonLd } from '@/components/JsonLd';
import { SITE_URL } from '@/lib/constants';
import { getMetadataAlternates } from '@/lib/i18n';
import { TrackedLink } from '@/components/TrackedLink';

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  if (!post) return {};

  return {
    title: post.title,
    description: post.description,
    alternates: getMetadataAlternates('en', `/blog/${post.slug}`),
    openGraph: {
      title: `${post.title} | AstroGuru`,
      description: post.description,
      url: `${SITE_URL}/en/blog/${post.slug}`,
      type: 'article',
      publishedTime: post.publishedAt,
      modifiedTime: post.updatedAt || post.publishedAt,
      images: [{ url: '/opengraph-image', width: 1200, height: 630, alt: 'AstroGuru' }],
    },
  };
}

const categoryLinks: Record<string, { href: string; label: string; featureName: string }> = {
  astroloji: { href: '/en/astrology', label: 'Astrology', featureName: 'astrology' },
  numeroloji: { href: '/en/numerology', label: 'Numerology', featureName: 'numerology' },
  ruya: { href: '/en/dream-interpretation', label: 'Dream Interpretation', featureName: 'dream_interpretation' },
  spirituel: { href: '/en/spiritual-guidance', label: 'Spiritual Guidance', featureName: 'spiritual_guidance' },
};

export default async function BlogPostPageEn({ params }: Props) {
  const { slug } = await params;
  const post = await fetchPostBySlug(slug);
  if (!post) notFound();

  const relatedLink = categoryLinks[post.category];

  const sections = post.content.split('\n\n').map((block, i) => {
    const trimmed = block.trim();
    if (trimmed.startsWith('## ')) {
      return (
        <h2 key={i} className="mt-8 text-xl font-bold">
          {trimmed.slice(3)}
        </h2>
      );
    }
    if (trimmed.startsWith('### ')) {
      return (
        <h3 key={i} className="mt-6 text-lg font-semibold">
          {trimmed.slice(4)}
        </h3>
      );
    }
    const parts = trimmed.split(/(\*\*[^*]+\*\*)/g);
    return (
      <p key={i} className="mt-4 leading-relaxed text-zinc-700 dark:text-zinc-300">
        {parts.map((part, j) =>
          part.startsWith('**') && part.endsWith('**') ? (
            <strong key={j}>{part.slice(2, -2)}</strong>
          ) : (
            part
          ),
        )}
      </p>
    );
  });

  return (
    <>
      <JsonLd data={articleJsonLd(post)} />
      <ArticleOpenTracker
        slug={post.slug}
        title={post.title}
        category={post.category}
        locale="en"
        translationGroup={post.translationGroup}
      />

      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="mb-8">
          <Link
            href="/en/blog"
            className="text-sm text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            &larr; Blog
          </Link>
        </div>

        <header>
          <div className="flex items-center gap-3 text-sm text-zinc-500">
            {relatedLink && (
              <Link
                href={relatedLink.href}
                className="rounded-full bg-purple-100 px-3 py-0.5 font-medium text-purple-700 hover:bg-purple-200 dark:bg-purple-900/30 dark:text-purple-300"
              >
                {relatedLink.label}
              </Link>
            )}
            <time dateTime={post.publishedAt}>
              {new Date(post.publishedAt).toLocaleDateString('en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </time>
            <span>{post.readingTime} min read</span>
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            {post.title}
          </h1>
          <p className="mt-4 text-lg text-zinc-600 dark:text-zinc-400">
            {post.description}
          </p>
        </header>

        <div className="mt-10 border-t border-zinc-200 pt-10 dark:border-zinc-800">
          {sections}
        </div>

        <div className="mt-12 rounded-2xl bg-purple-950 p-8 text-center text-white">
          <h2 className="text-xl font-bold">Discover with AstroGuru</h2>
          <p className="mt-2 text-purple-200">
            Download the app and get your personal cosmic guidance.
          </p>
          <DownloadCtaLink
            href="/en#download"
            label="Download Free"
            source="blog_article_cta"
            placement="blog_article"
            className="mt-4 inline-flex h-10 items-center rounded-full bg-white px-6 text-sm font-semibold text-purple-900 transition-transform hover:scale-105"
          />
        </div>

        {relatedLink && (
          <div className="mt-8 text-center">
            <TrackedLink
              href={relatedLink.href}
              analyticsEvent={{
                type: 'feature_click',
                params: {
                  feature_name: relatedLink.featureName,
                  source: 'blog_article_related_feature',
                  translation_group: post.translationGroup,
                },
              }}
              className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              Learn more about {relatedLink.label} &rarr;
            </TrackedLink>
          </div>
        )}
      </article>
    </>
  );
}
