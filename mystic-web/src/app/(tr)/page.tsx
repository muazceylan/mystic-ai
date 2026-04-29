import type { Metadata } from 'next';
import Link from 'next/link';
import { JsonLd } from '@/components/JsonLd';
import { organizationJsonLd, webApplicationJsonLd } from '@/lib/jsonLd';
import { fetchAllPosts } from '@/lib/blog';
import { getMetadataAlternates } from '@/lib/i18n';
import { StoreCTA } from '@/components/StoreCTA';
import { TrackedLink } from '@/components/TrackedLink';

export const metadata: Metadata = {
  alternates: getMetadataAlternates('tr', '/'),
};

const features = [
  {
    title: 'Natal Harita',
    description:
      'Dogum aninin gokyuzu haritasini kesfet. Gezegen konumlari, ev yerlesimi ve aspektler ile kendini tani.',
  },
  {
    title: 'Gunluk Transitler',
    description:
      'Her gun icin kisisel transit analizini al. Gunun enerjisini anla, firsatlari ve dikkat noktalarini gor.',
  },
  {
    title: 'Numeroloji',
    description:
      'Dogum tarihinden ve isminden gelen sayisal titresimlerini kesfet. Yasam yolunu, kaderini ve potansiyelini anla.',
  },
  {
    title: 'Ruya Yorumu',
    description:
      'Ruyalarini kaydet ve yapay zeka destekli derinlemesine yorum al. Sembol analizleri ve aylik ruya hikayeni kesfet.',
  },
  {
    title: 'Uyum Analizi',
    description:
      'Iki kisi arasindaki kozmik uyumu kesfet. Synastry analizi, guclu yonler ve zorluklar hakkinda detayli bilgi al.',
  },
  {
    title: 'Spirituel Rehberlik',
    description:
      'Dua, esma ve meditasyon pratigin icin kisisellestirilmis rehberlik. Gunluk spirituel rutinini olustur.',
  },
] as const;

export const revalidate = 3600;

export default async function HomePage() {
  const recentPosts = (await fetchAllPosts('tr')).slice(0, 3);

  return (
    <>
      <JsonLd data={organizationJsonLd()} />
      <JsonLd data={webApplicationJsonLd()} />

      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-b from-purple-950 via-indigo-950 to-zinc-950 py-24 text-white sm:py-32">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Senin Icin Yazilmis
            <br />
            Kozmik Bir Yol Haritasi
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-purple-200">
            Dogum haritandan gunluk transitlerine, sayilarindan ruyalarina
            kadar tum isaretleri tek yerde bul. Hazir yorumlar degil, sana
            dokunan kisisel astroloji, numeroloji ve spirituel rehberlik
            deneyimini kesfet.
          </p>
          <div id="indir">
            <StoreCTA locale="tr" variant="hero" />
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <h2 className="text-center text-3xl font-bold tracking-tight sm:text-4xl">
            Neler Sunuyoruz
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-center text-zinc-600 dark:text-zinc-400">
            AstroGuru ile kozmik rehberligini her zaman yaninda tasi.
          </p>
          <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-zinc-200 p-6 dark:border-zinc-800"
              >
                <h3 className="text-lg font-semibold">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-600 dark:text-zinc-400">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Blog Preview */}
      <section className="border-t border-zinc-200 py-20 dark:border-zinc-800">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Son Yazilar
            </h2>
            <Link
              href="/blog"
              className="text-sm font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
            >
              Tum yazilar &rarr;
            </Link>
          </div>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {recentPosts.map((post) => (
                <TrackedLink
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  analyticsEvent={{
                    type: 'blog_card_click',
                    params: {
                      slug: post.slug,
                      title: post.title,
                      category: post.category,
                      source: 'home_blog_preview',
                      translation_group: post.translationGroup,
                    },
                  }}
                  className="group rounded-2xl border border-zinc-200 p-5 transition-shadow hover:shadow-lg dark:border-zinc-800"
                >
                  <time
                    dateTime={post.publishedAt}
                    className="text-xs text-zinc-400"
                  >
                    {new Date(post.publishedAt).toLocaleDateString('tr-TR', {
                      day: 'numeric',
                      month: 'long',
                    })}
                  </time>
                  <h3 className="mt-2 font-semibold leading-snug group-hover:text-purple-600 dark:group-hover:text-purple-400">
                    {post.title}
                  </h3>
                  <p className="mt-2 text-sm text-zinc-600 line-clamp-2 dark:text-zinc-400">
                    {post.description}
                  </p>
                </TrackedLink>
              ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-purple-950 py-16 text-white">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6">
          <h2 className="text-2xl font-bold sm:text-3xl">
            Kozmik Yolculuguna Basla
          </h2>
          <p className="mt-4 text-purple-200">
            Uygulamayi indir, dogum bilgilerini gir ve kisisel haritani kesfet.
          </p>
          <StoreCTA locale="tr" variant="cta" />
        </div>
      </section>
    </>
  );
}
