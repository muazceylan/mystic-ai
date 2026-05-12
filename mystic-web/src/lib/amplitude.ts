import { ENABLE_ANALYTICS } from './constants';
import { sanitizeAmplitudeProperties } from './amplitudeSanitization';

type Primitive = string | number | boolean | null;
type Properties = Record<string, Primitive | undefined>;

type AmplitudeModule = typeof import('@amplitude/unified');

const AMPLITUDE_API_KEY = (process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY ?? '').trim();

let initPromise: Promise<void> | null = null;
let modulePromise: Promise<AmplitudeModule | null> | null = null;

function canUseAmplitude(): boolean {
  return (
    ENABLE_ANALYTICS
    && Boolean(AMPLITUDE_API_KEY)
    && typeof window !== 'undefined'
    && typeof document !== 'undefined'
  );
}

async function loadAmplitudeModule(): Promise<AmplitudeModule | null> {
  if (!canUseAmplitude()) {
    return null;
  }

  if (!modulePromise) {
    modulePromise = import('@amplitude/unified')
      .then((mod) => mod)
      .catch((error) => {
        modulePromise = null;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[amplitude] SDK import failed', error);
        }
        return null;
      });
  }

  return modulePromise;
}

export function initializeAmplitude(): Promise<void> {
  if (!canUseAmplitude()) {
    return Promise.resolve();
  }

  if (!initPromise) {
    initPromise = loadAmplitudeModule()
      .then(async (amplitude) => {
        if (!amplitude) {
          return;
        }

        await amplitude.initAll(AMPLITUDE_API_KEY, {
          analytics: {
            autocapture: true,
            minIdLength: 1,
          },
          sessionReplay: {
            sampleRate: 1,
          },
        });
      })
      .catch((error) => {
        initPromise = null;
        if (process.env.NODE_ENV !== 'production') {
          console.warn('[amplitude] initAll failed', error);
        }
        throw error;
      });
  }

  return initPromise;
}

function trackAmplitudeEvent(eventName: string, properties?: Properties) {
  if (!canUseAmplitude()) {
    return;
  }

  void initializeAmplitude()
    .then(async () => {
      const amplitude = await loadAmplitudeModule();
      if (!amplitude) {
        return;
      }

      amplitude.track(eventName, sanitizeAmplitudeProperties(properties));
    })
    .catch(() => {});
}

function resolveReferrerDomain(): string | null {
  if (typeof document === 'undefined') {
    return null;
  }

  const referrer = document.referrer?.trim();
  if (!referrer) {
    return null;
  }

  try {
    return new URL(referrer).hostname;
  } catch {
    return null;
  }
}

function resolveCampaignId(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const params = new URLSearchParams(window.location.search);
  return (
    params.get('campaign_id')
    ?? params.get('utm_id')
    ?? params.get('cid')
    ?? null
  );
}

export function trackAppEntryStarted(params: {
  entryPoint: string;
  ctaLabel: string;
  destinationPath: string;
}) {
  trackAmplitudeEvent('App Entry Started', {
    'entry point': params.entryPoint,
    'cta label': params.ctaLabel,
    'destination path': params.destinationPath,
    'referrer domain': resolveReferrerDomain(),
    'campaign id': resolveCampaignId(),
  });
}

export function trackArticleViewed(params: {
  contentId: string;
  contentCategory?: string;
  contentLanguage: string;
  sourceSurface: string;
}) {
  trackAmplitudeEvent('Article Viewed', {
    'content id': params.contentId,
    'content category': params.contentCategory ?? null,
    'content language': params.contentLanguage,
    'source surface': params.sourceSurface,
    'referrer domain': resolveReferrerDomain(),
  });
}

export function trackArticleCompleted(params: {
  contentId: string;
  contentCategory?: string;
  readTimeSeconds: number;
  scrollDepthPercent: number;
}) {
  trackAmplitudeEvent('Article Completed', {
    'content id': params.contentId,
    'content category': params.contentCategory ?? null,
    'read time seconds': params.readTimeSeconds,
    'scroll depth percent': params.scrollDepthPercent,
  });
}
