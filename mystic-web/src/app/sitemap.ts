import type { MetadataRoute } from 'next';
import { getAllPosts } from '@/lib/blog';
import { SITE_URL } from '@/lib/constants';

type SitemapEntry = MetadataRoute.Sitemap[number];

/** TR ↔ EN route pairs for hreflang alternates in sitemap */
const LOCALE_PAIRS: Array<{ tr: string; en: string; changeFrequency: SitemapEntry['changeFrequency']; priority: number }> = [
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
];

function alternates(trPath: string, enPath: string) {
  return {
    languages: {
      tr: `${SITE_URL}${trPath}`,
      en: `${SITE_URL}${enPath}`,
    },
  };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();
  const entries: MetadataRoute.Sitemap = [];

  for (const pair of LOCALE_PAIRS) {
    const alt = alternates(pair.tr || '/', pair.en);

    // TR entry
    entries.push({
      url: `${SITE_URL}${pair.tr || '/'}`,
      lastModified: now,
      changeFrequency: pair.changeFrequency,
      priority: pair.priority,
      alternates: alt,
    });

    // EN entry
    entries.push({
      url: `${SITE_URL}${pair.en}`,
      lastModified: now,
      changeFrequency: pair.changeFrequency,
      priority: pair.priority,
      alternates: alt,
    });
  }

  // Blog posts — both TR and EN variants
  for (const post of getAllPosts()) {
    const trUrl = `/blog/${post.slug}`;
    const enUrl = `/en/blog/${post.slug}`;
    const alt = alternates(trUrl, enUrl);
    const lastMod = post.updatedAt || post.publishedAt;

    entries.push({
      url: `${SITE_URL}${trUrl}`,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: alt,
    });

    entries.push({
      url: `${SITE_URL}${enUrl}`,
      lastModified: lastMod,
      changeFrequency: 'monthly',
      priority: 0.7,
      alternates: alt,
    });
  }

  return entries;
}
