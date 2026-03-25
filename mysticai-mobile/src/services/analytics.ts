import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { NativeModules, Platform, TurboModuleRegistry } from 'react-native';
import { envConfig } from '../config/env';
import api from './api';

// ── Types ────────────────────────────────────────────────────────────

export type AnalyticsPrimitive = string | number | boolean | null | undefined;
export type AnalyticsParams = Record<string, AnalyticsPrimitive>;

type QueuedEvent = {
  name: string;
  params: Record<string, string | number | boolean | null>;
  timestampMs: number;
};

// ── Constants ────────────────────────────────────────────────────────

const DEVICE_ID_KEY = 'analytics:device_id';
const SESSION_ID_KEY = 'analytics:session_id';
const MAX_QUEUE_SIZE = 80;
const EVENT_NAME_PATTERN = /^[a-z0-9_]+$/;

// ── Amplitude config (unchanged) ────────────────────────────────────

const analyticsConfig = envConfig.analytics;
const isAmplitude = analyticsConfig.provider === 'amplitude';
const amplitudeEnabled = isAmplitude && Boolean(analyticsConfig.apiKey);
const debugMode = analyticsConfig.debug;

/** Mutable flag — starts from env config, can be toggled by consent / settings. */
let collectionEnabled = analyticsConfig.collectionEnabledByDefault;

// ── Amplitude state ─────────────────────────────────────────────────

let initialized = false;
let initPromise: Promise<void> | null = null;
let flushInFlight = false;
let deviceId = `mystic-device-${Date.now().toString(36)}-${Math.round(Math.random() * 1_000_000).toString(36)}`;
let sessionId = Date.now();
const queue: QueuedEvent[] = [];
let analyticsUserId: string | null = null;
let analyticsUserProperties: Record<string, string | null> = {};
let debugBootstrapSent = false;

// ── Firebase Analytics (lazy, null-safe) ────────────────────────────
//
// RNFirebase analytics module is resolved once at first use via require().
// In environments where native modules are unavailable (Expo Go, web)
// the require throws and all Firebase calls become silent no-ops.

type FirebaseAnalyticsModule = {
  logEvent(name: string, params?: Record<string, any>): Promise<void>;
  logScreenView(params: { screen_name: string; screen_class?: string }): Promise<void>;
  logLogin(params: { method: string }): Promise<void>;
  logSignUp(params: { method: string }): Promise<void>;
  logSearch(params: { search_term: string }): Promise<void>;
  logShare(params: { content_type: string; item_id?: string; method?: string }): Promise<void>;
  logSelectContent(params: { content_type: string; item_id: string }): Promise<void>;
  logTutorialBegin(): Promise<void>;
  logTutorialComplete(): Promise<void>;
  logBeginCheckout(params?: { value?: number; currency?: string }): Promise<void>;
  logPurchase(params?: { value?: number; currency?: string; transaction_id?: string }): Promise<void>;
  setUserId(id: string | null): Promise<void>;
  setUserProperty(name: string, value: string | null): Promise<void>;
  setUserProperties(properties: Record<string, string | null>): Promise<void>;
  setAnalyticsCollectionEnabled(enabled: boolean): Promise<void>;
  setConsent(settings: Record<string, 'granted' | 'denied'>): Promise<void>;
  resetAnalyticsData(): Promise<void>;
};

let _firebase: FirebaseAnalyticsModule | null = null;
let _firebaseResolved = false;
let didWarnFirebaseUnavailable = false;

const FIREBASE_APP_NATIVE_MODULE = 'RNFBAppModule';
const FIREBASE_ANALYTICS_NATIVE_MODULE = 'RNFBAnalyticsModule';

function warnFirebaseUnavailable(reason: string, error?: unknown): void {
  if (!__DEV__ || didWarnFirebaseUnavailable) return;
  didWarnFirebaseUnavailable = true;

  const detail =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : 'unknown error';

  console.warn(
    `[analytics] Firebase Analytics unavailable during ${reason}. ` +
      'Expo Go or a stale native build will trigger this fallback. ' +
      'Rebuild the native app with expo run:* or EAS before expecting RNFirebase analytics.',
    detail,
  );
}

function hasFirebaseNativeModules(): boolean {
  if (Platform.OS === 'web') {
    return false;
  }

  if (Constants.executionEnvironment === 'storeClient') {
    return false;
  }

  const modules = NativeModules as Record<string, unknown>;
  const appModule =
    TurboModuleRegistry.get<unknown>(FIREBASE_APP_NATIVE_MODULE)
    ?? modules[FIREBASE_APP_NATIVE_MODULE];
  const analyticsModule =
    TurboModuleRegistry.get<unknown>(FIREBASE_ANALYTICS_NATIVE_MODULE)
    ?? modules[FIREBASE_ANALYTICS_NATIVE_MODULE];

  return Boolean(appModule && analyticsModule);
}

function getFirebase(): FirebaseAnalyticsModule | null {
  if (_firebaseResolved) return _firebase;
  _firebaseResolved = true;

  if (Platform.OS === 'web') {
    debugLog('Firebase Analytics skipped on web');
    return null;
  }

  if (!hasFirebaseNativeModules()) {
    debugLog('Firebase Analytics skipped because native modules are unavailable');
    warnFirebaseUnavailable('availability check', `${FIREBASE_APP_NATIVE_MODULE}/${FIREBASE_ANALYTICS_NATIVE_MODULE} missing`);
    return null;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('@react-native-firebase/analytics');
    const analytics = (mod.default ?? mod)();
    _firebase = analytics as FirebaseAnalyticsModule;
    debugLog('Firebase Analytics initialized');
  } catch (e) {
    debugLog('Firebase Analytics not available (expected in Expo Go)', e);
    warnFirebaseUnavailable('module require', e);
  }

  return _firebase;
}

/** Safe wrapper — runs a Firebase call and swallows errors. */
function firebaseSafe(fn: (fa: FirebaseAnalyticsModule) => Promise<void>): void {
  try {
    const fa = getFirebase();
    if (fa) {
      void fn(fa).catch((e) => {
        debugLog('Firebase call failed', e);
      });
    }
  } catch {
    // Swallow — never crash for analytics
  }
}

// ── Internal helpers ────────────────────────────────────────────────

function randomId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.round(Math.random() * 1_000_000_000).toString(36)}`;
}

function sanitizeParams(params?: AnalyticsParams): Record<string, string | number | boolean | null> {
  const normalized: Record<string, string | number | boolean | null> = {};
  if (!params) {
    return normalized;
  }

  for (const [key, value] of Object.entries(params)) {
    if (!key) {
      continue;
    }
    if (value === undefined) {
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
      normalized[key] = value;
      continue;
    }
    normalized[key] = String(value);
  }

  return normalized;
}

function debugLog(message: string, payload?: unknown) {
  if (!debugMode) {
    return;
  }
  if (payload === undefined) {
    console.info(`[analytics] ${message}`);
    return;
  }
  console.info(`[analytics] ${message}`, payload);
}

function hasFirebaseProvider(): boolean {
  return getFirebase() !== null;
}

function hasActiveAnalyticsProvider(): boolean {
  return amplitudeEnabled || hasFirebaseProvider();
}

function mirrorScreenView(screenName: string, screenClass?: string): void {
  if (!collectionEnabled || !envConfig.isApiConfigured) {
    return;
  }

  void api.post('/api/v1/analytics/screen-views', {
    screenKey: screenName,
    routePath: screenClass ?? screenName,
    platform: Platform.OS,
    sessionId: String(sessionId),
  }).catch((error) => {
    debugLog('Internal screen tracking failed', error);
  });
}

function validateEventName(name: string): boolean {
  if (!name || !EVENT_NAME_PATTERN.test(name)) {
    debugLog(`Invalid event name. Use snake_case: "${name}"`);
    return false;
  }
  return true;
}

// ── Amplitude initialization ────────────────────────────────────────

async function ensureInitialized(): Promise<void> {
  if (initialized) {
    return;
  }
  if (initPromise) {
    await initPromise;
    return;
  }

  initPromise = (async () => {
    try {
      const [storedDeviceId, storedSessionId] = await Promise.all([
        AsyncStorage.getItem(DEVICE_ID_KEY),
        AsyncStorage.getItem(SESSION_ID_KEY),
      ]);

      if (storedDeviceId?.trim()) {
        deviceId = storedDeviceId.trim();
      } else {
        const next = randomId('mystic-device');
        deviceId = next;
        await AsyncStorage.setItem(DEVICE_ID_KEY, next);
      }

      const parsedSession = Number.parseInt(storedSessionId ?? '', 10);
      if (Number.isFinite(parsedSession) && parsedSession > 0) {
        sessionId = parsedSession;
      } else {
        sessionId = Date.now();
        await AsyncStorage.setItem(SESSION_ID_KEY, String(sessionId));
      }
    } catch (error) {
      debugLog('Initialization failed, using in-memory identifiers.', error);
    } finally {
      initialized = true;
    }
  })();

  await initPromise;
}

// ── Amplitude queue ─────────────────────────────────────────────────

function enqueue(event: QueuedEvent) {
  if (queue.length >= MAX_QUEUE_SIZE) {
    queue.shift();
  }
  queue.push(event);
}

async function flushQueue(): Promise<void> {
  if (!collectionEnabled || !amplitudeEnabled || flushInFlight || queue.length === 0) {
    return;
  }

  const apiKey = analyticsConfig.apiKey;
  if (!apiKey) {
    return;
  }

  flushInFlight = true;
  const batched = queue.splice(0, queue.length);

  const payload = {
    api_key: apiKey,
    events: batched.map((event) => ({
      event_type: event.name,
      event_properties: event.params,
      user_id: analyticsUserId ?? undefined,
      user_properties: analyticsUserProperties,
      time: event.timestampMs,
      session_id: sessionId,
      device_id: deviceId,
      platform: Platform.OS,
      os_name: Platform.OS,
      app_version: '1.0.0',
    })),
  };

  try {
    const response = await fetch(analyticsConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP_${response.status}`);
    }

    debugLog(`Flushed ${batched.length} event(s)`, batched.map((event) => event.name));
  } catch (error) {
    debugLog('Flush failed, keeping events in queue.', error);
    for (const event of batched) {
      enqueue(event);
    }
  } finally {
    flushInFlight = false;
  }
}

// ── Public API: Event tracking ──────────────────────────────────────

/**
 * Log a custom analytics event to all active providers (Amplitude + Firebase GA4).
 * Event name must be snake_case (`/^[a-z0-9_]+$/`).
 */
export function trackEvent(name: string, params?: AnalyticsParams): void {
  if (!validateEventName(name)) {
    return;
  }

  const normalizedParams = sanitizeParams(params);
  const event = {
    name,
    params: normalizedParams,
    timestampMs: Date.now(),
  };

  debugLog(`${name}`, normalizedParams);

  if (!collectionEnabled || !hasActiveAnalyticsProvider()) {
    return;
  }

  // Amplitude (queue-based)
  if (amplitudeEnabled) {
    void (async () => {
      await ensureInitialized();
      enqueue(event);
      await flushQueue();
    })();
  }

  // Firebase GA4 (direct — Firebase handles its own batching)
  firebaseSafe((fa) => fa.logEvent(name, normalizedParams));
}

// ── Public API: Screen tracking ─────────────────────────────────────

/**
 * Log a screen view to Firebase GA4 (native screen_view) and as a
 * trackEvent to Amplitude.
 *
 * Called automatically by the centralized ScreenTracker in _layout.tsx.
 */
export function logScreen(screenName: string, screenClass?: string): void {
  if (!screenName) return;

  debugLog(`screen: ${screenName}`);

  if (!collectionEnabled) return;

  if (hasActiveAnalyticsProvider()) {
    // Firebase GA4 native screen_view (uses recommended logScreenView API)
    firebaseSafe((fa) =>
      fa.logScreenView({
        screen_name: screenName,
        screen_class: screenClass ?? screenName,
      }),
    );

    // Also send as Amplitude event for parity
    trackEvent('screen_view', {
      screen_name: screenName,
      screen_class: screenClass ?? screenName,
    });
  }

  mirrorScreenView(screenName, screenClass);
}

// ── Public API: GA4 recommended events ──────────────────────────────
//
// These call the typed Firebase SDK methods (logLogin, logSignUp, etc.)
// so GA4 recognizes them as standard events with proper attribution.
// They also fire a corresponding trackEvent for Amplitude parity.

/**
 * GA4 recommended: login event.
 * Call after successful authentication.
 */
export function logLogin(method: string): void {
  debugLog(`login: ${method}`);
  if (!collectionEnabled || !hasActiveAnalyticsProvider()) return;
  firebaseSafe((fa) => fa.logLogin({ method }));
  trackEvent('login', { method });
}

/**
 * GA4 recommended: sign_up event.
 * Call after successful registration.
 */
export function logSignUp(method: string): void {
  debugLog(`sign_up: ${method}`);
  if (!collectionEnabled || !hasActiveAnalyticsProvider()) return;
  firebaseSafe((fa) => fa.logSignUp({ method }));
  trackEvent('sign_up', { method });
}

/**
 * GA4 recommended: search event.
 */
export function logSearch(searchTerm: string): void {
  debugLog(`search: ${searchTerm}`);
  if (!collectionEnabled || !hasActiveAnalyticsProvider()) return;
  firebaseSafe((fa) => fa.logSearch({ search_term: searchTerm.slice(0, 100) }));
  trackEvent('search', { search_term: searchTerm.slice(0, 100) });
}

/**
 * GA4 recommended: share event.
 */
export function logShare(contentType: string, itemId?: string, method?: string): void {
  debugLog(`share: ${contentType}`);
  if (!collectionEnabled || !hasActiveAnalyticsProvider()) return;
  firebaseSafe((fa) => fa.logShare({ content_type: contentType, item_id: itemId, method }));
  trackEvent('share', { content_type: contentType, item_id: itemId, method });
}

/**
 * GA4 recommended: select_content event.
 */
export function logSelectContent(contentType: string, itemId: string): void {
  debugLog(`select_content: ${contentType}/${itemId}`);
  if (!collectionEnabled || !hasActiveAnalyticsProvider()) return;
  firebaseSafe((fa) => fa.logSelectContent({ content_type: contentType, item_id: itemId }));
  trackEvent('select_content', { content_type: contentType, item_id: itemId });
}

/**
 * GA4 recommended: tutorial_begin event.
 */
export function logTutorialBegin(): void {
  debugLog('tutorial_begin');
  if (!collectionEnabled || !hasActiveAnalyticsProvider()) return;
  firebaseSafe((fa) => fa.logTutorialBegin());
}

/**
 * GA4 recommended: tutorial_complete event.
 */
export function logTutorialComplete(): void {
  debugLog('tutorial_complete');
  if (!collectionEnabled || !hasActiveAnalyticsProvider()) return;
  firebaseSafe((fa) => fa.logTutorialComplete());
}

/**
 * GA4 recommended: begin_checkout event.
 */
export function logBeginCheckout(value?: number, currency?: string): void {
  debugLog(`begin_checkout: ${value} ${currency}`);
  if (!collectionEnabled || !hasActiveAnalyticsProvider()) return;
  firebaseSafe((fa) => fa.logBeginCheckout({ value, currency }));
  trackEvent('begin_checkout', { value, currency });
}

/**
 * GA4 recommended: purchase event.
 */
export function logPurchase(
  value?: number,
  currency?: string,
  transactionId?: string,
): void {
  debugLog(`purchase: ${value} ${currency} ${transactionId}`);
  if (!collectionEnabled || !hasActiveAnalyticsProvider()) return;
  firebaseSafe((fa) =>
    fa.logPurchase({ value, currency, transaction_id: transactionId }),
  );
  trackEvent('purchase', { value, currency, transaction_id: transactionId });
}

// ── Public API: User identity ───────────────────────────────────────

/**
 * Set the analytics user ID across all providers.
 * Call after login/register. Pass null to clear on logout.
 * Never pass email or PII — use the internal numeric/UUID user ID.
 */
export function setAnalyticsUserId(userId: string | null): void {
  analyticsUserId = userId;
  debugLog(`setUserId: ${userId ?? '(null)'}`);
  firebaseSafe((fa) => fa.setUserId(userId));
}

/**
 * Set user properties on Firebase Analytics (batch).
 * Use for non-PII dimensions like subscription_status, preferred_language, etc.
 */
export function setAnalyticsUserProperties(
  properties: Record<string, string | null>,
): void {
  analyticsUserProperties = {
    ...analyticsUserProperties,
    ...properties,
  };
  debugLog('setUserProperties', properties);
  firebaseSafe((fa) => fa.setUserProperties(properties));
}

// ── Public API: Consent / collection control ────────────────────────

/**
 * Enable or disable analytics collection at runtime.
 * When disabled, trackEvent / logScreen become no-ops.
 * Firebase collection is also toggled to stop network transmissions.
 */
export function setAnalyticsCollectionEnabled(enabled: boolean): void {
  collectionEnabled = enabled;
  debugLog(`Analytics collection ${enabled ? 'enabled' : 'disabled'}`);
  firebaseSafe((fa) => fa.setAnalyticsCollectionEnabled(enabled));
}

/**
 * Set Firebase Analytics consent signals (analytics_storage, ad_storage, etc.).
 * Useful for GDPR/KVKK compliance — call before or after collection toggle.
 *
 * Example:
 *   setAnalyticsConsent({ analytics_storage: 'granted', ad_storage: 'denied' });
 */
export function setAnalyticsConsent(
  settings: Record<string, 'granted' | 'denied'>,
): void {
  debugLog('setConsent', settings);
  firebaseSafe((fa) => fa.setConsent(settings));
}

/**
 * Reset analytics identity on logout.
 * Clears user ID and resets Firebase analytics data for a clean session.
 */
export function resetAnalyticsIdentity(): void {
  debugLog('resetAnalyticsIdentity');
  analyticsUserProperties = {};
  setAnalyticsUserId(null);
  firebaseSafe((fa) => fa.resetAnalyticsData());
}

export function getAnalyticsDebugState(): {
  collectionEnabled: boolean;
  amplitudeEnabled: boolean;
  firebaseEnabled: boolean;
} {
  return {
    collectionEnabled,
    amplitudeEnabled,
    firebaseEnabled: hasFirebaseProvider(),
  };
}

export function emitAnalyticsDebugBootstrap(params?: AnalyticsParams): void {
  if (!__DEV__ || debugBootstrapSent) {
    return;
  }

  debugBootstrapSent = true;
  trackEvent('analytics_debug_bootstrap', params);
}
