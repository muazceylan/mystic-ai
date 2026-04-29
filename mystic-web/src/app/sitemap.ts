import type { MetadataRoute } from 'next';
import { fetchAllPosts, getLocalizedPostPath } from '@/lib/blog';
import { SITE_URL } from '@/lib/constants';

type SitemapEntry = MetadataRoute.Sitemap[number];

/** TR ↔ EN route pairs for hreflang alternates in sitemap */
const LOCALE_PAIRS: Array<{
  tr: string;
  en: string;
  changeFrequency: SitemapEntry['changeFrequency'];
  priority: number;
}> = [
  { tr: '', en: '/en', changeFrequency: 'weekly', priority: 1.0 },
  { tr: '/astroloji', en: '/en/astrology', changeFrequency: 'monthly', priority: 0.9 },
  { tr: '/numeroloji', en: '/en/numerology', changeFrequency: 'monthly', priority: 0.9 },
  { tr: '/ruya-yorumu', en: '/en/dream-interpretation', changeFrequency: 'monthly', priority: 0.9 },
  { tr: '/uyum-analizi', en: '/en/compatibility-analysis', changeFrequency: 'monthly', priority: 0.8 },
  { tr: '/spirituel-rehberlik', en: '/en/spiritual-guidance', changeFrequency: 'monthly', priority: 0.8 },
  { tr: '/blog', en: '/en/blog', changeFrequency: 'weekly', priority: 0.8 },
  { tr: '/gizlilik', en: '/en/privacy', changeFrequency: 'yearly', priority: 0.3 },
  { tr: '/kullanim-sartlari', en: '/en/terms', changeFrequency: 'yearly', priority: 0.3 },
  { tr: '/iletisim', en: '/en/contact', changeFrequency: 'yearly', priority: 0.3 },
  { tr: '/account-deletion', en: '/en/account-deletion', changeFrequency: 'yearly', priority: 0.4 },
];

function localeAlternates(trPath: string, enPath: string) {
  return {
    languages: {
      tr: `${SITE_URL}${trPath}`,
      en: `${SITE_URL}${enPath}`,
    },
  };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date().toISOString();
  const entries: MetadataRoute.Sitemap = [];

  for (const pair of LOCALE_PAIRS) {
    const alt = localeAlternates(pair.tr || '/', pair.en);

    entries.push({
      url: `${SITE_URL}${pair.tr || '/'}`,
      lastModified: now,
      changeFrequency: pair.changeFrequency,
      priority: pair.priority,
      alternates: alt,
    });

    entries.push({
      url: `${SITE_URL}${pair.en}`,
      lastModified: now,
      changeFrequency: pair.changeFrequency,
      priority: pair.priority,
      alternates: alt,
    });
  }

  const trPosts = await fetchAllPosts('tr');
  const enPosts = await fetchAllPosts('en');
  const enPostsBySlug = new Map(enPosts.map((post) => [post.slug, post]));
  const trPostSlugs = new Set<string>();

  // Only publish hreflang pairs when both locales have a real article.
  for (const post of trPosts) {
    trPostSlugs.add(post.slug);

    const trUrl = getLocalizedPostPath('tr', post.slug);
    const enPost = enPostsBySlug.get(post.slug);
    const enUrl = enPost ? getLocalizedPostPath('en', post.slug) : null;
    const alt = enUrl ? localeAlternates(trUrl, enUrl) : undefined;

    entries.push({
      url: `${SITE_URL}${trUrl}`,
      lastModified: post.updatedAt || post.publishedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: alt,
    });

    if (enPost && enUrl) {
      entries.push({
        url: `${SITE_URL}${enUrl}`,
        lastModified: enPost.updatedAt || enPost.publishedAt,
        changeFrequency: 'monthly',
        priority: 0.7,
        alternates: alt,
      });
    }
  }

  for (const post of enPosts) {
    if (trPostSlugs.has(post.slug)) continue;

    const enUrl = getLocalizedPostPath('en', post.slug);

    entries.push({
      url: `${SITE_URL}${enUrl}`,
      lastModified: post.updatedAt || post.publishedAt,
      changeFrequency: 'monthly',
      priority: 0.7,
    });
  }

  return entries;
}
