import 'react-native-gesture-handler';
import '../polyfills/textEncoding';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../store/useAuthStore';
import { useCompanionStore } from '../store/useCompanionStore';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { initI18n } from '../i18n';
import { COLORS } from '../constants/colors';
import { queryClient } from '../lib/queryClient';

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
            {i18nReady ? (
              <AppNavigator i18nReady={i18nReady} />
            ) : (
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background }}>
                <ActivityIndicator size="large" color={COLORS.primary} />
              </View>
            )}
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
