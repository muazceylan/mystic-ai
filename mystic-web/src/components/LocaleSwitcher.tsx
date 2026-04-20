'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { TrackedLink } from '@/components/TrackedLink';
import { buildTrackedUrl, getLocaleFromPathname } from '@/lib/analytics';
import { getLocalizedPath } from '@/lib/i18n';

export function LocaleSwitcher() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const currentLocale = getLocaleFromPathname(pathname);
  const targetLocale = currentLocale === 'tr' ? 'en' : 'tr';
  const href = buildTrackedUrl(
    getLocalizedPath(pathname, targetLocale),
    searchParams.toString(),
  );

  return (
    <TrackedLink
      href={href}
      analyticsEvent={{
        type: 'locale_switch',
        params: {
          from_locale: currentLocale,
          to_locale: targetLocale,
          source: 'header_locale_toggle',
        },
      }}
      className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 transition-colors hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
    >
      {targetLocale}
    </TrackedLink>
  );
}
