import 'react-native-gesture-handler';
import '../polyfills/textEncoding';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus, View, ActivityIndicator } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useCompanionStore } from '../store/useCompanionStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { useAppConfigStore } from '../store/useAppConfigStore';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { TutorialProvider, TUTORIAL_SCREEN_KEYS, useTutorialTrigger } from '../features/tutorial';
import { initI18n } from '../i18n';
import { COLORS } from '../constants/colors';
import { queryClient } from '../lib/queryClient';
import {
  registerPushTokenIfNeeded,
  setupNotificationResponseHandler,
  setupNotificationChannel,
} from '../utils/pushNotifications';

if (typeof window !== 'undefined') {
  WebBrowser.maybeCompleteAuthSession();
}

const ONBOARDING_AUTH_ROUTES = new Set([
  'birth-date',
  'birth-time',
  'birth-country',
  'birth-city',
  'gender',
  'marital-status',
  'focus-point',
  'notification-permission',
  'natal-chart',
]);

const AUTH_ROUTES = new Set([
  'welcome',
  'forgot-password',
  'signup',
  'verify-email-pending',
  'verify-email',
  'email-register',
  'oauth2',
  ...ONBOARDING_AUTH_ROUTES,
]);

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

  useEffect(() => {
    // Must wait for both conditions before attempting any navigation
    if (!isHydrated || !i18nReady) return;

    const currentRoute = topLevelRoute(pathname);
    const inAuthRoute = AUTH_ROUTES.has(currentRoute);
    const inOnboardingFlow = ONBOARDING_AUTH_ROUTES.has(currentRoute);

    if (!isAuthenticated) {
      if (!inAuthRoute) {
        router.replace('/(auth)/welcome');
      }
      return;
    }

    if (inAuthRoute && !inOnboardingFlow) {
      router.replace('/(tabs)/home');
    }
  }, [isAuthenticated, isHydrated, i18nReady, pathname]);
}

function AppNavigator({ i18nReady }: { i18nReady: boolean }) {
  const { colors, activeTheme } = useTheme();

  // Run the route guard inside AppNavigator so the Stack is already mounted
  useProtectedRoute(i18nReady);

  return (
    <>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <CompanionBootstrap />
      <NotificationBootstrap />
      <AppConfigBootstrap />
      <TutorialBootstrap />
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

    // Setup push infrastructure
    void setupNotificationChannel();
    void registerPushTokenIfNeeded();
    void fetchUnreadCount();

    let pushCleanup: (() => void) | null = null;
    setupNotificationResponseHandler(isAuthenticated).then((unsub) => {
      pushCleanup = unsub;
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
    // Load config on startup (no auth required — public endpoint)
    void loadConfig();
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

export default function Layout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    hydrate();
    initI18n().then(() => setI18nReady(true));
  }, []);

  // Block rendering navigator until i18n is ready — prevents "NO_I18NEXT_INSTANCE" when
  // useTranslation runs in TabsLayout/other screens before init completes.
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <TutorialProvider>
              {i18nReady ? (
                <AppNavigator i18nReady={i18nReady} />
              ) : (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
                  <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
              )}
            </TutorialProvider>
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
