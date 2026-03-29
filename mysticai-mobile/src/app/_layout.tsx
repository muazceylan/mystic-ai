import 'react-native-gesture-handler';
import '../polyfills/textEncoding';
import { useEffect, useRef, useState, type ReactNode } from 'react';
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
} from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
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
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useCompanionStore } from '../store/useCompanionStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAppConfigStore } from '../store/useAppConfigStore';
import { useNavigationHistoryStore } from '../store/useNavigationHistoryStore';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { TutorialProvider, TUTORIAL_SCREEN_KEYS, useTutorialTrigger } from '../features/tutorial';
import { initI18n } from '../i18n';
import { COLORS } from '../constants/colors';
import { queryClient } from '../lib/queryClient';
import { needsOnboarding } from '../utils/authOnboarding';
import { isGuestUser } from '../store/useAuthStore';
import {
  trackEvent,
  logScreen,
  setAnalyticsUserId,
  setAnalyticsUserProperties,
  resetAnalyticsIdentity,
  getAnalyticsDebugState,
  emitAnalyticsDebugBootstrap,
} from '../services/analytics';
import { resolveScreenName } from '../services/analyticsScreenNames';
import {
  ensureNotificationHandlerInstalled,
  registerPushTokenIfNeeded,
  setupNotificationResponseHandler,
  setupNotificationChannel,
} from '../utils/pushNotifications';
import { useMonetizationStore, useGuruWalletStore } from '../features/monetization';
import { initializeAdProvider } from '../features/monetization/providers/initProvider';

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

const PUBLIC_INFO_ROUTES = new Set([
  'privacy',
  'terms',
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

    const currentRoute = topLevelRoute(pathname);
    const inAuthRoute = AUTH_ROUTES.has(currentRoute);
    const inPublicInfoRoute = PUBLIC_INFO_ROUTES.has(currentRoute);
    const inOnboardingFlow = ONBOARDING_AUTH_ROUTES.has(currentRoute);
    const onboardingRequired = needsOnboarding(user);

    if (!isAuthenticated) {
      if (!inAuthRoute && !inPublicInfoRoute) {
        router.replace('/(auth)/welcome');
      }
      return;
    }

    if (onboardingRequired) {
      if (!inOnboardingFlow) {
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

  // Run the route guard inside AppNavigator so the Stack is already mounted
  useProtectedRoute(i18nReady);

  useEffect(() => {
    useNavigationHistoryStore.getState().updatePath(pathname);
  }, [pathname]);

  return (
    <>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <CompanionBootstrap />
      <NotificationBootstrap />
      <AppConfigBootstrap />
      <MonetizationBootstrap />
      <TutorialBootstrap />
      <GuestSessionBootstrap />
      <ScreenTracker />
      <AnalyticsDebugBootstrap />
      <AnalyticsIdentityBootstrap />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      />
    </>
  );
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

function NotificationBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
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
      void setupNotificationChannel();
      void registerPushTokenIfNeeded();
      void fetchUnreadCount();
      setupNotificationResponseHandler(isAuthenticated).then((unsub) => {
        pushCleanup = unsub;
      });
    });

    // AppState listener: refresh on foreground return (background → active)
    const appStateSub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (appState.current === 'background' && nextState === 'active') {
        void fetchUnreadCount();
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
  }, [isHydrated, isAuthenticated]);

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
function MonetizationBootstrap() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const adProviderInitRef = useRef(false);

  useEffect(() => {
    if (!isHydrated) return;

    const task = InteractionManager.runAfterInteractions(async () => {
      await useMonetizationStore.getState().loadConfig();

      // Initialize the ad provider once (AdMob or stub depending on environment)
      if (!adProviderInitRef.current) {
        adProviderInitRef.current = true;
        const adsEnabled = useMonetizationStore.getState().config?.adsEnabled ?? false;
        await initializeAdProvider(adsEnabled);
      }

      // Only load wallet if monetization is enabled and user is authenticated
      if (isAuthenticated && useMonetizationStore.getState().isMonetizationEnabled()) {
        void useGuruWalletStore.getState().loadWallet();
      }
    });
    return () => task.cancel();
  }, [isHydrated, isAuthenticated]);

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
      }
      appState.current = next;
    });
    return () => sub.remove();
  }, [isHydrated]);

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
    void trigger('first_app_open');
    void trigger('version_changed');
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
    } else {
      resetAnalyticsIdentity();
    }
  }, [isHydrated, isAuthenticated, user?.id]);

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

function SafeAreaBootstrapGate({ children }: { children: ReactNode }) {
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
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return <>{children}</>;
}

export default function Layout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [i18nReady, setI18nReady] = useState(false);
  const [fontsLoaded, fontLoadError] = useFonts({
    'MysticInter-Regular': require('../../assets/fonts/MysticInter-Regular.otf'),
    'MysticInter-SemiBold': require('../../assets/fonts/MysticInter-SemiBold.otf'),
  });

  useEffect(() => {
    hydrate();
    initI18n().then(() => setI18nReady(true));
  }, []);

  const startupReady = i18nReady && (fontsLoaded || Boolean(fontLoadError));

  // Block rendering navigator until i18n is ready — prevents "NO_I18NEXT_INSTANCE" when
  // useTranslation runs in TabsLayout/other screens before init completes.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider initialMetrics={SAFE_AREA_INITIAL_METRICS}>
        <SafeAreaBootstrapGate>
          <QueryClientProvider client={queryClient}>
            <ThemeProvider>
              <TutorialProvider>
                {startupReady ? (
                  <AppNavigator i18nReady={i18nReady} />
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                  </View>
                )}
              </TutorialProvider>
            </ThemeProvider>
          </QueryClientProvider>
        </SafeAreaBootstrapGate>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
