import type { Metadata } from 'next';
import { fetchAllPosts } from '@/lib/blog';
import { getMetadataAlternates } from '@/lib/i18n';
import { TrackedLink } from '@/components/TrackedLink';

export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Blog — Astroloji, Numeroloji ve Spirituel Rehberlik Yazilari',
  description:
    'AstroGuru blog: astroloji, numeroloji, ruya yorumu ve spirituel rehberlik hakkinda bilgilendirici yazilar ve rehberler.',
  alternates: getMetadataAlternates('tr', '/blog'),
};

const categoryLabels: Record<string, string> = {
  astroloji: 'Astroloji',
  numeroloji: 'Numeroloji',
  ruya: 'Ruya Yorumu',
  spirituel: 'Spirituel',
  genel: 'Genel',
};

export default async function BlogPage() {
  const posts = await fetchAllPosts();

  return (
    <>
      <section className="bg-gradient-to-b from-purple-950 to-zinc-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Blog</h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-purple-200">
            Astroloji, numeroloji, ruya yorumu ve spirituel rehberlik hakkinda
            bilgilendirici yazilar.
          </p>
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {posts.map((post) => (
              <article
                key={post.slug}
                className="flex flex-col rounded-2xl border border-zinc-200 p-6 transition-shadow hover:shadow-lg dark:border-zinc-800"
              >
                <div className="flex items-center gap-3 text-xs text-zinc-500">
                  <span className="rounded-full bg-purple-100 px-2.5 py-0.5 font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                    {categoryLabels[post.category] || post.category}
                  </span>
                  <time dateTime={post.publishedAt}>
                    {new Date(post.publishedAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </time>
                </div>
                <h2 className="mt-3 text-lg font-semibold leading-snug">
                  <TrackedLink
                    href={`/blog/${post.slug}`}
                    analyticsEvent={{
                      type: 'blog_card_click',
                      params: {
                        slug: post.slug,
                        title: post.title,
                        category: post.category,
                        source: 'blog_index_title',
                        translation_group: post.translationGroup,
                      },
                    }}
                    className="hover:text-purple-600 dark:hover:text-purple-400"
                  >
                    {post.title}
                  </TrackedLink>
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {post.description}
                </p>
                <div className="mt-4 flex items-center justify-between text-xs text-zinc-400">
                  <span>{post.readingTime} dk okuma</span>
                  <TrackedLink
                    href={`/blog/${post.slug}`}
                    analyticsEvent={{
                      type: 'blog_card_click',
                      params: {
                        slug: post.slug,
                        title: post.title,
                        category: post.category,
                        source: 'blog_index_read_more',
                        translation_group: post.translationGroup,
                      },
                    }}
                    className="font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
                  >
                    Devamini Oku
                  </TrackedLink>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
