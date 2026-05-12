import { envConfig } from '../config/env';

export type AmplitudePrimitive = string | number | boolean | null;
export type AmplitudeProperties = Record<string, AmplitudePrimitive | undefined>;

type AmplitudeIdentify = {
  set: (key: string, value: AmplitudePrimitive) => AmplitudeIdentify;
};

type AmplitudeResult = {
  promise?: Promise<unknown>;
};

type AmplitudeModule = {
  Identify: new () => AmplitudeIdentify;
  identify: (identify: AmplitudeIdentify) => AmplitudeResult | Promise<unknown> | void;
  init: (
    apiKey: string,
    userId?: string,
    options?: Record<string, unknown>,
  ) => AmplitudeResult | Promise<unknown> | void;
  reset: () => void;
  setOptOut?: (optOut: boolean) => void;
  setUserId: (userId: string | undefined) => void;
  track: (
    eventName: string,
    properties?: Record<string, AmplitudePrimitive>,
  ) => AmplitudeResult | Promise<unknown> | void;
};

const analyticsConfig = envConfig.analytics;

let initPromise: Promise<void> | null = null;
let initialized = false;
let permanentlyDisabled = false;
let didWarnUnavailable = false;
let amplitudeModule: AmplitudeModule | null = null;

function hasAmplitudeApiKey(): boolean {
  return Boolean(analyticsConfig.apiKey);
}

function warnAmplitudeUnavailable(reason: string, error?: unknown): void {
  if (!__DEV__ || didWarnUnavailable) {
    return;
  }

  didWarnUnavailable = true;
  console.warn(
    `[amplitude] React Native SDK unavailable during ${reason}. ` +
      'Amplitude tracking stays disabled until a native build with the SDK is installed.',
    error,
  );
}

function getAmplitudeModule(): AmplitudeModule | null {
  if (amplitudeModule || permanentlyDisabled) {
    return amplitudeModule;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@amplitude/analytics-react-native') as AmplitudeModule;
    amplitudeModule = mod;
  } catch (error) {
    permanentlyDisabled = true;
    warnAmplitudeUnavailable('module load', error);
    amplitudeModule = null;
  }

  return amplitudeModule;
}

async function toPromise(result: AmplitudeResult | Promise<unknown> | void): Promise<void> {
  if (result && typeof result === 'object' && 'promise' in result) {
    await result.promise;
    return;
  }

  if (result instanceof Promise) {
    await result;
  }
}

function canUseAmplitude(): boolean {
  return hasAmplitudeApiKey() && !permanentlyDisabled;
}

export function initializeAmplitudeClient(): Promise<void> {
  if (initialized || !canUseAmplitude()) {
    return Promise.resolve();
  }

  if (!initPromise) {
    const apiKey = analyticsConfig.apiKey;
    const amplitude = getAmplitudeModule();

    if (!apiKey || !amplitude) {
      return Promise.resolve();
    }

    initPromise = toPromise(
      amplitude.init(apiKey, undefined, {
        flushIntervalMillis: 10000,
        flushQueueSize: 20,
        minIdLength: 1,
      }),
    )
      .then(() => {
        initialized = true;
        amplitude.setOptOut?.(!analyticsConfig.collectionEnabledByDefault);
      })
      .catch((error) => {
        initPromise = null;
        permanentlyDisabled = true;
        warnAmplitudeUnavailable('init', error);
      });
  }

  return initPromise;
}

export function trackAmplitudeClientEvent(
  eventName: string,
  properties?: AmplitudeProperties,
): void {
  if (!canUseAmplitude()) {
    return;
  }

  void initializeAmplitudeClient()
    .then(() => {
      if (!initialized) {
        return;
      }

      getAmplitudeModule()?.track(
        eventName,
        properties as Record<string, AmplitudePrimitive> | undefined,
      );
    })
    .catch(() => {});
}

export function setAmplitudeClientUserId(userId: string | null): void {
  if (!canUseAmplitude()) {
    return;
  }

  void initializeAmplitudeClient()
    .then(() => {
      if (!initialized) {
        return;
      }

      getAmplitudeModule()?.setUserId(userId ?? undefined);
    })
    .catch(() => {});
}

export function identifyAmplitudeClientUserProperties(
  properties: AmplitudeProperties,
): void {
  if (!canUseAmplitude()) {
    return;
  }

  const entries = Object.entries(properties).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return;
  }

  void initializeAmplitudeClient()
    .then(() => {
      if (!initialized) {
        return;
      }

      const amplitude = getAmplitudeModule();
      if (!amplitude) {
        return;
      }

      const identify = new amplitude.Identify();
      for (const [key, value] of entries) {
        if (value !== undefined) {
          identify.set(key, value);
        }
      }
      void toPromise(amplitude.identify(identify));
    })
    .catch(() => {});
}

export function setAmplitudeClientOptOut(optOut: boolean): void {
  if (!canUseAmplitude()) {
    return;
  }

  void initializeAmplitudeClient()
    .then(() => {
      if (!initialized) {
        return;
      }

      getAmplitudeModule()?.setOptOut?.(optOut);
    })
    .catch(() => {});
}

export function resetAmplitudeClient(): void {
  if (!canUseAmplitude()) {
    return;
  }

  void initializeAmplitudeClient()
    .then(() => {
      if (!initialized) {
        return;
      }

      getAmplitudeModule()?.reset();
    })
    .catch(() => {});
}
