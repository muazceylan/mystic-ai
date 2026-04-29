import { SITE_URL, SUPPORTED_LOCALES, DEFAULT_LOCALE } from './constants';
import type { Locale } from './constants';

/**
 * Bidirectional TR ↔ EN route mapping.
 * TR paths are at root (/astroloji), EN paths under /en/ prefix (/en/astrology).
 */
const ROUTE_PAIRS: Array<{ tr: string; en: string }> = [
  { tr: '/', en: '/en' },
  { tr: '/astroloji', en: '/en/astrology' },
  { tr: '/numeroloji', en: '/en/numerology' },
  { tr: '/ruya-yorumu', en: '/en/dream-interpretation' },
  { tr: '/uyum-analizi', en: '/en/compatibility-analysis' },
  { tr: '/spirituel-rehberlik', en: '/en/spiritual-guidance' },
  { tr: '/blog', en: '/en/blog' },
  { tr: '/gizlilik', en: '/en/privacy' },
  { tr: '/kullanim-sartlari', en: '/en/terms' },
  { tr: '/iletisim', en: '/en/contact' },
  { tr: '/account-deletion', en: '/en/account-deletion' },
];

/** Get the counterpart URL for a given path in the target locale */
export function getLocalizedPath(currentPath: string, targetLocale: Locale): string {
  const currentLocale: Locale = currentPath.startsWith('/en') ? 'en' : 'tr';

  if (currentLocale === targetLocale) return currentPath;

  // Check static route pairs
  for (const pair of ROUTE_PAIRS) {
    if (pair[currentLocale] === currentPath) {
      return pair[targetLocale];
    }
  }

  // Blog post mapping: /blog/[slug] ↔ /en/blog/[slug]
  const trBlogMatch = currentPath.match(/^\/blog\/(.+)$/);
  const enBlogMatch = currentPath.match(/^\/en\/blog\/(.+)$/);

  if (trBlogMatch && targetLocale === 'en') return `/en/blog/${trBlogMatch[1]}`;
  if (enBlogMatch && targetLocale === 'tr') return `/blog/${enBlogMatch[1]}`;

  // Fallback: prepend /en or strip it
  if (targetLocale === 'en' && !currentPath.startsWith('/en')) {
    return `/en${currentPath}`;
  }
  if (targetLocale === 'tr' && currentPath.startsWith('/en')) {
    return currentPath.replace(/^\/en/, '') || '/';
  }

  return currentPath;
}

/** Generate hreflang alternates for Next.js metadata */
export function getAlternatesWithHreflang(trPath: string, enPath?: string) {
  const resolvedEnPath = enPath || getLocalizedPath(trPath, 'en');

  const languages: Record<string, string> = {};
  for (const locale of SUPPORTED_LOCALES) {
    const path = locale === 'tr' ? trPath : resolvedEnPath;
    languages[locale] = `${SITE_URL}${path}`;
  }
  languages['x-default'] = `${SITE_URL}${trPath}`;

  return { languages };
}

/** Full alternates object for Next.js metadata (canonical + hreflang) */
export function getMetadataAlternates(
  locale: Locale,
  trPath: string,
  enPath?: string,
) {
  const canonical = locale === DEFAULT_LOCALE ? trPath : (enPath || getLocalizedPath(trPath, 'en'));
  const { languages } = getAlternatesWithHreflang(trPath, enPath);

  return {
    canonical,
    languages,
  };
}

export type { Locale };
