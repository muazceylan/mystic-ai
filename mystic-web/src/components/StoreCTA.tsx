'use client';

import { TrackedAnchor } from '@/components/TrackedLink';
import { APP_STORE_URL, PLAY_STORE_URL } from '@/lib/constants';
import { trackAppEntryStarted } from '@/lib/amplitude';

interface StoreCTAProps {
  locale: 'tr' | 'en';
  variant?: 'hero' | 'cta';
  webHref?: string;
}

export function StoreCTA({ locale, variant = 'hero', webHref }: StoreCTAProps) {
  const appStoreAvailable = Boolean(APP_STORE_URL && APP_STORE_URL !== '#');
  const playStoreAvailable = Boolean(PLAY_STORE_URL && PLAY_STORE_URL !== '#');
  const comingSoon = locale === 'tr' ? 'Yakinda' : 'Coming Soon';

  if (variant === 'cta') {
    const singleLabel = locale === 'tr' ? 'Ucretsiz Indir' : 'Download Free';
    const primaryUrl = appStoreAvailable ? APP_STORE_URL : playStoreAvailable ? PLAY_STORE_URL : null;

    return (
      <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
        {primaryUrl ? (
          <TrackedAnchor
            href={primaryUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => {
              trackAppEntryStarted({
                entryPoint: `store_cta_${variant}`,
                ctaLabel: singleLabel,
                destinationPath: primaryUrl,
              });
            }}
            analyticsEvent={{
              type: 'store_click',
              params: {
                store: appStoreAvailable ? 'app_store' : 'play_store',
                placement: variant,
                source: `store_cta_${variant}`,
              },
            }}
            className="inline-flex h-12 items-center rounded-full bg-white px-8 text-sm font-semibold text-purple-900 transition-transform hover:scale-105"
          >
            {singleLabel}
          </TrackedAnchor>
        ) : (
          <span className="inline-flex h-12 cursor-not-allowed items-center rounded-full bg-white/40 px-8 text-sm font-semibold text-purple-900/60">
            {singleLabel} — {comingSoon}
          </span>
        )}
      </div>
    );
  }

  const appStoreLabel = locale === 'tr' ? "App Store'dan Indir" : 'Download on App Store';
  const webLabel = locale === 'tr' ? 'Astro Guru Webe Git' : 'Go to Astro Guru Web';
  const playStoreLabel = locale === 'tr' ? "Google Play'den Indir" : 'Get it on Google Play';

  return (
    <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
      {appStoreAvailable ? (
        <TrackedAnchor
          href={APP_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackAppEntryStarted({
              entryPoint: `store_cta_${variant}`,
              ctaLabel: appStoreLabel,
              destinationPath: APP_STORE_URL,
            });
          }}
          analyticsEvent={{
            type: 'store_click',
            params: {
              store: 'app_store',
              placement: variant,
              source: `store_cta_${variant}`,
            },
          }}
          className="inline-flex h-12 items-center rounded-full bg-white px-8 text-sm font-semibold text-purple-900 shadow-lg transition-transform hover:scale-105"
        >
          {appStoreLabel}
        </TrackedAnchor>
      ) : (
        <span className="inline-flex h-12 cursor-not-allowed items-center rounded-full bg-white/40 px-8 text-sm font-semibold text-purple-900/60 shadow-lg">
          {appStoreLabel} — {comingSoon}
        </span>
      )}
      {webHref ? (
        <TrackedAnchor
          href={webHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackAppEntryStarted({
              entryPoint: `store_cta_${variant}`,
              ctaLabel: webLabel,
              destinationPath: webHref,
            });
          }}
          analyticsEvent={{
            type: 'cta_click',
            params: {
              cta_label: 'astro_guru_web',
              placement: variant,
              source: `store_cta_${variant}`,
            },
          }}
          className="inline-flex h-12 items-center rounded-full border border-amber-300/40 bg-amber-200/10 px-8 text-sm font-semibold text-amber-100 transition-transform hover:scale-105 hover:bg-amber-200/15"
        >
          {webLabel}
        </TrackedAnchor>
      ) : null}
      {playStoreAvailable ? (
        <TrackedAnchor
          href={PLAY_STORE_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => {
            trackAppEntryStarted({
              entryPoint: `store_cta_${variant}`,
              ctaLabel: playStoreLabel,
              destinationPath: PLAY_STORE_URL,
            });
          }}
          analyticsEvent={{
            type: 'store_click',
            params: {
              store: 'play_store',
              placement: variant,
              source: `store_cta_${variant}`,
            },
          }}
          className="inline-flex h-12 items-center rounded-full border border-white/30 px-8 text-sm font-semibold text-white transition-transform hover:scale-105"
        >
          {playStoreLabel}
        </TrackedAnchor>
      ) : (
        <span className="inline-flex h-12 cursor-not-allowed items-center rounded-full border border-white/20 px-8 text-sm font-semibold text-white/60">
          {playStoreLabel} — {comingSoon}
        </span>
      )}
    </div>
  );
}
