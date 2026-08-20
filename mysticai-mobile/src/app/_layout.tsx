import 'react-native-gesture-handler';
import '../polyfills/textEncoding';
import { useEffect, useRef, useState, useCallback, type ReactNode } from 'react';
import {
  AppState,
  AppStateStatus,
  InteractionManager,
  View,
  ActivityIndicator,
  Dimensions,
  Platform,
  StatusBar as NativeStatusBar,
  ScrollView,
  FlatList,
  SectionList,
  useColorScheme,
} from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import Head from 'expo-router/head';
import * as WebBrowser from 'expo-web-browser';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaProvider,
  initialWindowMetrics,
  useSafeAreaInsets,
  type Metrics,
} from 'react-native-safe-area-context';
import Constants from 'expo-constants';
import { envConfig } from '../config/env';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useCompanionStore } from '../store/useCompanionStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAppConfigStore } from '../store/useAppConfigStore';
import { useNavigationHistoryStore } from '../store/useNavigationHistoryStore';
import {
  ThemeProvider,
  getThemeColors,
  resolveActiveTheme,
  useTheme,
} from '../context/ThemeContext';
import { createAppStackScreenOptions } from '../navigation/stackOptions';
import { TutorialProvider, TUTORIAL_SCREEN_KEYS, useTutorialTrigger } from '../features/tutorial';
import { initI18n } from '../i18n';
import { queryClient, syncPersistedQueryCacheScope } from '../lib/queryClient';
import { queryKeys } from '../lib/queryKeys';
import { needsOnboarding } from '../utils/authOnboarding';
import { isGuestUser } from '../store/useAuthStore';
import { resolveUserScopeKey } from '../store/userScopedPersist';
import {
  trackEvent,
  logScreen,
  initializeClientAnalytics,
  setAnalyticsConsent,
  setAnalyticsCollectionEnabled,
  setAnalyticsUserId,
  setAnalyticsUserProperties,
  resetAnalyticsIdentity,
  getAnalyticsDebugState,
  emitAnalyticsDebugBootstrap,
} from '../services/analytics';
import { resolveScreenName } from '../services/analyticsScreenNames';
import {
  updateCoreUserProperties,
  updateSubscriptionUserProperties,
} from '../services/productAnalytics';
import {
  ensureNotificationHandlerInstalled,
  maybeTriggerMorningDreamReminder,
  registerPushTokenIfNeeded,
  syncNotificationPreferencesWithDeviceState,
  setupNotificationResponseHandler,
  setupNotificationChannel,
} from '../utils/pushNotifications';
import { RevenueCatProvider, useMonetizationStore, useGuruWalletStore } from '../features/monetization';
import ScreenCaptureGuard from '../components/security/ScreenCaptureGuard';
import { initializeAdProvider } from '../features/monetization/providers/initProvider';
import { warmNativeGoogleSigninConfig } from '../services/googleSignIn';
import { getBuildInfo } from '../services/buildInfo';
import {
  checkAppVersion,
  dismissOptionalUpdate,
  isOptionalUpdateDismissed,
} from '../services/appVersionCheck';
import type { AppUpdateStatus, AppVersionResponse } from '../services/appVersionCheck';
import { AppUpdateModal } from '../components/ui/AppUpdateModal';
import {
  bootstrapTrackingConsent,
  type PrivacyBootstrapResult,
} from '../features/privacy';

const ADSENSE_CLIENT = 'ca-pub-2868466577339325';
const ADSENSE_SCRIPT_SRC = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`;

// Expo Go + expo-router native sitemap bug guard:
// Some generated routes read window.location.origin on native where location can be undefined.
if (Platform.OS !== 'web') {
  const nativeWindow = (globalThis as any).window as
    | { location?: { origin?: string; [key: string]: unknown } }
    | undefined;

  if (nativeWindow && typeof nativeWindow.location?.origin !== 'string') {
    try {
      nativeWindow.location = {
        ...(nativeWindow.location ?? {}),
        origin: '',
      };
    } catch {
      // Ignore if runtime prevents overriding window.location.
    }
  }
}

if (typeof window !== 'undefined') {
  WebBrowser.maybeCompleteAuthSession();
}

const ONBOARDING_AUTH_ROUTES = new Set([
  'guest-name',
  'birth-date',
  'birth-time',
  'birth-country',
  'birth-city',
  'gender',
  'marital-status',
  'notification-permission',
  'natal-chart',
]);

const AUTH_ROUTES = new Set([
  'welcome',
  'guest-name',
  'forgot-password',
  'signup',
  'verify-email-pending',
  'verify-email',
  'email-register',
  'oauth2',
  ...ONBOARDING_AUTH_ROUTES,
]);

const PUBLIC_INFO_PATHS = new Set([
  '/privacy',
  '/terms',
  '/account-deletion',
  '/en/account-deletion',
]);

const DEV_PREVIEW_PATHS = new Set([
  '/dev/compare-card-preview',
]);

/**
 * App-level default:
 * We manage top spacing via SafeAreaProvider + SafeScreen, so iOS auto inset
 * on scrollables must stay disabled to avoid first-frame header jumps.
 */
if (Platform.OS === 'ios') {
  const applyScrollableInsetDefaults = (Component: any) => {
    const defaults = Component.defaultProps ?? {};
    Component.defaultProps = {
      ...defaults,
      contentInsetAdjustmentBehavior: 'never',
      automaticallyAdjustContentInsets: false,
    };
  };

  applyScrollableInsetDefaults(ScrollView);
  applyScrollableInsetDefaults(FlatList);
  applyScrollableInsetDefaults(SectionList);
}

/**
 * Stabilize safe-area metrics for first frame.
 * On some cold starts, initialWindowMetrics can transiently report top inset as 0,
 * which causes headers to render under status bar and then "jump" down on re-measure.
 */
const SAFE_AREA_INITIAL_METRICS: Metrics | null = (() => {
  const nativeStatusBarTop = NativeStatusBar.currentHeight ?? 0;
  const expoStatusBarTop = Math.round(Constants.statusBarHeight ?? 0);
  const fallbackTopInset = Platform.OS === 'android'
    ? Math.max(nativeStatusBarTop, expoStatusBarTop)
    : expoStatusBarTop;

  if (initialWindowMetrics) {
    if (fallbackTopInset <= 0) return initialWindowMetrics;
    const correctedTopInset = Math.max(initialWindowMetrics.insets.top, fallbackTopInset);
    if (correctedTopInset === initialWindowMetrics.insets.top) return initialWindowMetrics;
    return {
      ...initialWindowMetrics,
      insets: {
        ...initialWindowMetrics.insets,
        top: correctedTopInset,
      },
    };
  }

  if (fallbackTopInset <= 0) {
    return null;
  }

  const window = Dimensions.get('window');
  return {
    frame: {
      x: 0,
      y: 0,
      width: window.width,
      height: window.height,
    },
    insets: {
      top: fallbackTopInset,
      right: 0,
      bottom: 0,
      left: 0,
    },
  };
})();

function topLevelRoute(pathname: string): string {
  const normalized = pathname.replace(/^\/+|\/+$/g, '');
  if (!normalized) return '';
  return normalized.split('/')[0] ?? '';
}

/**
 * Protected route guard.
 * Waits for BOTH auth hydration AND i18n initialization before navigating.
 * This prevents "navigate before Root Layout mounted" errors.
 */
function useProtectedRoute(i18nReady: boolean) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Must wait for both conditions before attempting any navigation
    if (!isHydrated || !i18nReady) return;

    const isWebMarketingHome = Platform.OS === 'web' && pathname === '/';
    if (isWebMarketingHome) {
      return;
    }

    const currentRoute = topLevelRoute(pathname);
    const inAuthRoute = AUTH_ROUTES.has(currentRoute);
    const inPublicInfoRoute = PUBLIC_INFO_PATHS.has(pathname);
    const inDevPreviewRoute = __DEV__ && DEV_PREVIEW_PATHS.has(pathname);
    const inOnboardingFlow = ONBOARDING_AUTH_ROUTES.has(currentRoute);
    const onboardingRequired = needsOnboarding(user);

    if (!isAuthenticated) {
      if (!inAuthRoute && !inPublicInfoRoute && !inDevPreviewRoute) {
        router.replace('/(auth)/welcome');
      }
      return;
    }

    if (onboardingRequired) {
      if (!inOnboardingFlow && !inDevPreviewRoute) {
        router.replace('/(auth)/birth-date');
      }
      return;
    }

    if (inAuthRoute && !inOnboardingFlow) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isHydrated, i18nReady, pathname, user]);
}

function AppNavigator({ i18nReady }: { i18nReady: boolean }) {
  const { colors, activeTheme } = useTheme();
  const pathname = usePathname();
  const [appUpdate, setAppUpdate] = useState<{
    status: Exclude<AppUpdateStatus, 'UP_TO_DATE'>;
    versionInfo: AppVersionResponse;
  } | null>(null);
  const [privacyResult, setPrivacyResult] = useState<PrivacyBootstrapResult | null>(null);
  const handlePrivacyComplete = useCallback((result: PrivacyBootstrapResult) => {
    setPrivacyResult(result);
  }, []);

  // Run the route guard inside AppNavigator so the Stack is already mounted
  useProtectedRoute(i18nReady);

  useEffect(() => {
    useNavigationHistoryStore.getState().updatePath(pathname);
  }, [pathname]);

  return (
    <>
      <RevenueCatProvider>
        {Platform.OS === 'web' ? (
          <Head>
            <meta name="google-adsense-account" content={ADSENSE_CLIENT} />
            <script async src={ADSENSE_SCRIPT_SRC} crossOrigin="anonymous" />
          </Head>
        ) : null}
        <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
        <QueryCacheScopeBootstrap />
        <CompanionBootstrap />
        <NotificationBootstrap />
        <AppConfigBootstrap />
        <PrivacyBootstrap onComplete={handlePrivacyComplete} />
        <MonetizationBootstrap privacyResult={privacyResult} />
        {privacyResult ? <AmplitudeBootstrap privacyResult={privacyResult} /> : null}
        <BuildInfoBootstrap />
        {privacyResult ? <TutorialBootstrap /> : null}
        {privacyResult ? <GuestSessionBootstrap /> : null}
        {privacyResult ? (
          <AppVersionBootstrap onUpdateAvailable={setAppUpdate} />
        ) : null}
        {privacyResult ? <ScreenTracker /> : null}
        {privacyResult ? <AnalyticsDebugBootstrap /> : null}
        {privacyResult ? <AnalyticsIdentityBootstrap /> : null}
        {privacyResult ? <AnalyticsSubscriptionBootstrap /> : null}
        <Stack
          screenOptions={createAppStackScreenOptions({
            backgroundColor: colors.bg,
            headerShown: false,
          })}
        />
      </RevenueCatProvider>
      {appUpdate && Platform.OS !== 'web' && (
        <AppUpdateModal
          visible={true}
          versionInfo={appUpdate.versionInfo}
          mode={appUpdate.status === 'FORCE_UPDATE' ? 'force' : 'optional'}
          onDismiss={() => {
            void dismissOptionalUpdate(appUpdate.versionInfo.latestBuild);
            setAppUpdate(null);
          }}
        />
      )}
    </>
  );
}

function AmplitudeBootstrap({
  privacyResult,
}: {
  privacyResult: PrivacyBootstrapResult;
}) {
  useEffect(() => {
    const adConsent = privacyResult.personalizedAdvertisingAllowed ? 'granted' : 'denied';
    const analyticsCollectionEnabled = envConfig.analytics.collectionEnabledByDefault;
    setAnalyticsConsent({
      analytics_storage: analyticsCollectionEnabled ? 'granted' : 'denied',
      ad_storage: adConsent,
      ad_user_data: adConsent,
      ad_personalization: adConsent,
    });
    setAnalyticsCollectionEnabled(analyticsCollectionEnabled);
    initializeClientAnalytics();
  }, [privacyResult]);

  return null;
}

function PrivacyBootstrap({
  onComplete,
}: {
  onComplete: (result: PrivacyBootstrapResult) => void;
}) {
  const completedRef = useRef(false);
  const scheduledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const schedule = useCallback(() => {
    if (completedRef.current || scheduledRef.current || AppState.currentState !== 'active') {
      return;
    }

    scheduledRef.current = true;
    // Do not wait for InteractionManager here. Looping launch animations can
    // keep its interaction queue busy indefinitely and prevent ATT from ever
    // being requested. Apple requires the app to be active; a short timer is
    // sufficient to let the first native frame become visible.
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      if (AppState.currentState !== 'active') {
        scheduledRef.current = false;
        return;
      }

      void bootstrapTrackingConsent().then((result) => {
        completedRef.current = true;
        scheduledRef.current = false;
        onComplete(result);
      });
    }, 600);
  }, [onComplete]);

  useEffect(() => {
    schedule();
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && !completedRef.current) {
        schedule();
      }
    });

    return () => {
      subscription.remove();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = null;
      scheduledRef.current = false;
    };
  }, [schedule]);

  return null;
}

function BuildInfoBootstrap() {
  useEffect(() => {
    const info = getBuildInfo();
    console.info('[BuildInfo]', {
      appVersion: info.appVersion,
      buildNumber: info.buildNumber,
      applicationId: info.applicationId,
      platform: info.platform,
      environment: info.environment,
      updateChannel: info.updateChannel,
      runtimeVersion: info.runtimeVersion,
    });
  }, []);

  return null;
}

/**
 * Asks the backend what to do about the installed build, on startup and on every
 * background → active return. The installed version/build come from the native package;
 * the policy behind the decision is managed entirely from the admin panel.
 *
 * A FORCE_UPDATE never clears itself — the modal stays until the user actually updates and
 * a later check returns UP_TO_DATE, so no restart is needed after returning from the store.
 * An OPTIONAL_UPDATE the user dismissed is not shown again for that release.
 *
 * Concurrent checks are prevented via the isCheckingRef guard.
 */
function AppVersionBootstrap({
  onUpdateAvailable,
}: {
  onUpdateAvailable: (
    update: {
      status: Exclude<AppUpdateStatus, 'UP_TO_DATE'>;
      versionInfo: AppVersionResponse;
    } | null,
  ) => void;
}) {
  const isCheckingRef = useRef(false);

  const runCheck = useCallback(async () => {
    if (isCheckingRef.current) return;
    isCheckingRef.current = true;
    try {
      const { status, versionInfo } = await checkAppVersion();

      // No policy match, or the check failed — never block on an unknown answer.
      if (!versionInfo || status === 'UP_TO_DATE') {
        onUpdateAvailable(null);
        return;
      }

      if (status === 'FORCE_UPDATE') {
        onUpdateAvailable({ status, versionInfo });
        return;
      }

      const dismissed = await isOptionalUpdateDismissed(versionInfo.latestBuild);
      onUpdateAvailable(dismissed ? null : { status, versionInfo });
    } finally {
      isCheckingRef.current = false;
    }
  }, [onUpdateAvailable]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const task = InteractionManager.runAfterInteractions(() => {
      void runCheck();
    });
    return () => task.cancel();
  }, [runCheck]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const appState = { current: AppState.currentState };
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current === 'background' && next === 'active') {
        void runCheck();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [runCheck]);

  return null;
}

function CompanionBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const initializeForUser = useCompanionStore((s) => s.initializeForUser);
  const syncSavedPeople = useCompanionStore((s) => s.syncSavedPeople);
  const clearCompanions = useCompanionStore((s) => s.clear);

  useEffect(() => {
    if (!isHydrated) return;

    if (!isAuthenticated || !user?.id) {
      initializeForUser(null);
      clearCompanions();
      return;
    }

    initializeForUser(user);
    void syncSavedPeople(user.id);
  }, [isHydrated, isAuthenticated, user?.id]);

  useEffect(() => {
    initializeForUser(user ?? null);
  }, [user]);

  return null;
}

function QueryCacheScopeBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const lastAppliedScopeRef = useRef<string | null>(null);
  const scopeKey = isAuthenticated ? resolveUserScopeKey(user) : 'anonymous';

  useEffect(() => {
    if (!isHydrated) return;
    if (lastAppliedScopeRef.current === scopeKey) return;

    lastAppliedScopeRef.current = scopeKey;
    void syncPersistedQueryCacheScope(scopeKey);
  }, [isHydrated, scopeKey]);

  return null;
}

function NotificationBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const userId = useAuthStore((s) => s.user?.id);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const resetNotifications = useNotificationStore((s) => s.reset);
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!isHydrated) return;
    if (!isAuthenticated) {
      resetNotifications();
      return;
    }

    void ensureNotificationHandlerInstalled();

    // Push altyapısını ve unread count'u home render'ını bloklamayacak şekilde
    // geçiş animasyonları tamamlandıktan sonra başlat.
    let pushCleanup: (() => void) | null = null;
    const deferredTask = InteractionManager.runAfterInteractions(() => {
      void (async () => {
        await setupNotificationChannel();
        await syncNotificationPreferencesWithDeviceState();
        await registerPushTokenIfNeeded({ respectStoredPreference: true });
        await maybeTriggerMorningDreamReminder(userId);
        await fetchUnreadCount();
        pushCleanup = await setupNotificationResponseHandler(isAuthenticated);
      })();
    });

    // AppState listener: refresh on foreground return (background → active)
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current === 'background' && nextState === 'active') {
        void fetchUnreadCount();
        void maybeTriggerMorningDreamReminder(userId);
      }
      appState.current = nextState;
    });

    // Fallback polling every 5 minutes (reduced from 60s)
    const interval = setInterval(() => {
      void fetchUnreadCount();
    }, 5 * 60_000);

    return () => {
      deferredTask.cancel();
      appStateSub.remove();
      clearInterval(interval);
      pushCleanup?.();
    };
  }, [isHydrated, isAuthenticated, userId]);

  return null;
}

/** Fetches app config (module visibility, tab config) on startup and after foreground resume. */
function AppConfigBootstrap() {
  const loadConfig = useAppConfigStore((s) => s.loadConfig);
  const isHydrated = useAuthStore((s) => s.isHydrated);

  useEffect(() => {
    // App config'i geçiş animasyonları bittikten sonra yükle;
    // home render'ını bloklamasın. Config zaten local fallback ile çalışır.
    const task = InteractionManager.runAfterInteractions(() => {
      void loadConfig();
    });
    return () => task.cancel();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    const appState = { current: AppState.currentState };
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      // Only refresh on background → active transition, not active → active
      if (appState.current === 'background' && next === 'active') {
        void loadConfig();
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [isHydrated]);

  return null;
}

/** Loads monetization config on startup; wallet only if config is enabled and user is authenticated.
 *  Also initializes the ad provider (AdMob in native builds, stub in Expo Go/web). */
function MonetizationBootstrap({
  privacyResult,
}: {
  privacyResult: PrivacyBootstrapResult | null;
}) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const userId = useAuthStore((s) => s.user?.id);

  useEffect(() => {
    if (!isHydrated) return;

    const task = InteractionManager.runAfterInteractions(async () => {
      await useMonetizationStore.getState().loadConfig();

      // Only load wallet if monetization is enabled and user is authenticated
      if (isAuthenticated && useMonetizationStore.getState().isMonetizationEnabled()) {
        void useGuruWalletStore.getState().loadWallet();
      }
    });
    return () => task.cancel();
  }, [isHydrated, isAuthenticated]);

  useEffect(() => {
    if (!privacyResult || !isHydrated) return;

    const task = InteractionManager.runAfterInteractions(async () => {
      await useMonetizationStore.getState().loadConfig();
      const adsEnabled = useMonetizationStore.getState().config?.adsEnabled ?? false;
      await initializeAdProvider(adsEnabled, {
        trackingConsentStatus: privacyResult.trackingConsentStatus,
        personalizedAdvertisingAllowed: privacyResult.personalizedAdvertisingAllowed,
        tagForChildDirectedTreatment: false,
      }, userId);
    });

    return () => task.cancel();
  }, [isHydrated, privacyResult, userId]);

  useEffect(() => {
    if (!isHydrated) return;
    const appState = { current: AppState.currentState };
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current === 'background' && next === 'active') {
        void useMonetizationStore.getState().loadConfig().then(() => {
          if (useAuthStore.getState().isAuthenticated && useMonetizationStore.getState().isMonetizationEnabled()) {
            void useGuruWalletStore.getState().loadWallet();
          }
        });
        if (userId) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.monetizationEntitlements(userId) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.monetizationPaywall(userId) });
          void queryClient.invalidateQueries({ queryKey: queryKeys.monetizationOfferings(userId) });
        }
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [isHydrated, userId]);

  return null;
}

function TutorialBootstrap() {
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const userId = useAuthStore((s) => s.user?.id);
  const { trigger } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.GLOBAL_ONBOARDING);
  const bootstrapRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || !userId) {
      bootstrapRef.current = null;
      return;
    }

    if (!pathname.startsWith('/(tabs)')) {
      return;
    }

    const scope = String(userId);
    if (bootstrapRef.current === scope) {
      return;
    }

    bootstrapRef.current = scope;
    // Run sequentially: first_app_open acquires startLockRef while it runs.
    // Firing version_changed concurrently (void, no await) always loses the race
    // and returns false because startLockRef is still held (regression from fdcae5e).
    void (async () => {
      const opened = await trigger('first_app_open');
      if (!opened) {
        // first_app_open was already handled for this user; try version_changed.
        await trigger('version_changed');
      }
    })();
  }, [isAuthenticated, isHydrated, pathname, trigger, userId]);

  return null;
}

/**
 * Centralized screen tracking.
 * Logs a screen_view event on every route change via the analytics facade.
 * Deduplicates consecutive identical paths.
 */
function ScreenTracker() {
  const pathname = usePathname();
  const lastPathRef = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname || pathname === lastPathRef.current) return;
    lastPathRef.current = pathname;

    const screenName = resolveScreenName(pathname);
    if (screenName) {
      logScreen(screenName, pathname);
    }
  }, [pathname]);

  return null;
}

/**
 * Syncs analytics user identity with auth state.
 * Sets userId + user properties on login; clears on logout.
 */
function AnalyticsIdentityBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const prevUserIdRef = useRef<number | null | undefined>(undefined);

  useEffect(() => {
    if (!isHydrated) return;

    const userId = user?.id ?? null;

    // Avoid re-setting if the user hasn't changed
    if (userId === prevUserIdRef.current) return;
    prevUserIdRef.current = userId;

    if (isAuthenticated && userId) {
      setAnalyticsUserId(String(userId));
      setAnalyticsUserProperties({
        account_type: isGuestUser(user) ? 'guest' : 'registered',
        preferred_language: user?.preferredLanguage ?? null,
        zodiac_sign: user?.zodiacSign ?? null,
      });
      updateCoreUserProperties(user);
    } else {
      resetAnalyticsIdentity();
    }
  }, [isHydrated, isAuthenticated, user?.id]);

  return null;
}

function AnalyticsSubscriptionBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const entitlements = useMonetizationStore((s) => s.entitlements);
  const paywall = useMonetizationStore((s) => s.paywall);
  const subscription = useMonetizationStore((s) => s.subscription);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    updateSubscriptionUserProperties(entitlements, paywall, subscription);
  }, [entitlements, isAuthenticated, paywall, subscription]);

  return null;
}

function AnalyticsDebugBootstrap() {
  const pathname = usePathname();
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  useEffect(() => {
    if (!__DEV__ || !pathname || !isHydrated) {
      return;
    }

    const debugState = getAnalyticsDebugState();
    emitAnalyticsDebugBootstrap({
      entry_path: pathname,
      collection_enabled: debugState.collectionEnabled,
      firebase_enabled: debugState.firebaseEnabled,
      amplitude_enabled: debugState.amplitudeEnabled,
      gtm_web_container_id: debugState.gtmWebContainerId,
      gtm_ios_container_id: debugState.gtmIosContainerId,
      gtm_android_container_id: debugState.gtmAndroidContainerId,
      auth_state: isAuthenticated ? 'authenticated' : 'anonymous',
      platform: Platform.OS,
    });
  }, [pathname, isHydrated, isAuthenticated]);

  return null;
}

/**
 * Fires a single `quick_session_restored` analytics event when a guest session
 * is found in persistent storage on cold start (once per hydration).
 */
function GuestSessionBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);
  const firedRef = useRef(false);

  useEffect(() => {
    if (!isHydrated || !isAuthenticated || firedRef.current) return;
    if (isGuestUser(user)) {
      firedRef.current = true;
      trackEvent('quick_session_restored', {
        user_type: 'GUEST',
        user_id: user?.id ?? null,
      });
    }
  }, [isHydrated, isAuthenticated, user]);

  return null;
}

function SafeAreaBootstrapGate({
  children,
  backgroundColor,
  spinnerColor,
  statusBarStyle,
}: {
  children: ReactNode;
  backgroundColor: string;
  spinnerColor: string;
  statusBarStyle: 'light' | 'dark';
}) {
  const insets = useSafeAreaInsets();
  const [ready, setReady] = useState(Platform.OS !== 'ios');
  const latestTopRef = useRef(insets.top);
  const bootstrappedRef = useRef(Platform.OS !== 'ios');
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  latestTopRef.current = insets.top;

  useEffect(() => {
    if (bootstrappedRef.current) return;

    if (Platform.OS !== 'ios') {
      bootstrappedRef.current = true;
      setReady(true);
      return;
    }

    const minExpectedTopInset = Math.max(1, Math.round(Constants.statusBarHeight ?? 0));
    if (insets.top < minExpectedTopInset) {
      return;
    }

    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }

    const expectedTop = insets.top;
    settleTimerRef.current = setTimeout(() => {
      if (bootstrappedRef.current) return;
      if (latestTopRef.current !== expectedTop) return;
      bootstrappedRef.current = true;
      setReady(true);
    }, 420);

    return () => {
      if (settleTimerRef.current) {
        clearTimeout(settleTimerRef.current);
        settleTimerRef.current = null;
      }
    };
  }, [insets.top]);

  if (!ready) {
    return (
      <>
        <StatusBar style={statusBarStyle} />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor }}>
          <ActivityIndicator size="large" color={spinnerColor} />
        </View>
      </>
    );
  }

  return <>{children}</>;
}

export default function Layout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [i18nReady, setI18nReady] = useState(false);
  const systemScheme = useColorScheme();
  const [fontsLoaded, fontLoadError] = useFonts({
    'MysticInter-Regular': require('../../assets/fonts/MysticInter-Regular.otf'),
    'MysticInter-SemiBold': require('../../assets/fonts/MysticInter-SemiBold.otf'),
  });

  useEffect(() => {
    hydrate();
    warmNativeGoogleSigninConfig();
    initI18n().then(() => setI18nReady(true));
  }, []);

  const startupReady = i18nReady && (fontsLoaded || Boolean(fontLoadError));
  const startupTheme = resolveActiveTheme('system', systemScheme);
  const startupColors = getThemeColors(startupTheme);
  const startupStatusBarStyle = startupTheme === 'dark' ? 'light' : 'dark';

  // Block rendering navigator until i18n is ready — prevents "NO_I18NEXT_INSTANCE" when
  // useTranslation runs in TabsLayout/other screens before init completes.
  return (
    <QueryClientProvider client={queryClient}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <ScreenCaptureGuard />
        <SafeAreaProvider initialMetrics={SAFE_AREA_INITIAL_METRICS}>
          <SafeAreaBootstrapGate
            backgroundColor={startupColors.background}
            spinnerColor={startupColors.primary}
            statusBarStyle={startupStatusBarStyle}
          >
            <ThemeProvider>
              <TutorialProvider>
                {startupReady ? (
                  <AppNavigator i18nReady={i18nReady} />
                ) : (
                  <>
                    <StatusBar style={startupStatusBarStyle} />
                    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: startupColors.background }}>
                      <ActivityIndicator size="large" color={startupColors.primary} />
                    </View>
                  </>
                )}
              </TutorialProvider>
            </ThemeProvider>
          </SafeAreaBootstrapGate>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </QueryClientProvider>
  );
}
