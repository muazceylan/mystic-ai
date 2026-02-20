import { useEffect, useState } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useAuthStore } from '../store/useAuthStore';
import { ThemeProvider, useTheme } from '../context/ThemeContext';
import { initI18n } from '../i18n';

/**
 * Protected route guard.
 * Waits for BOTH auth hydration AND i18n initialization before navigating.
 * This prevents "navigate before Root Layout mounted" errors.
 */
function useProtectedRoute(i18nReady: boolean) {
  const segments = useSegments();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    // Must wait for both conditions before attempting any navigation
    if (!isHydrated || !i18nReady) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!isAuthenticated && !inAuthGroup) {
      router.replace('/(auth)/welcome');
    } else if (isAuthenticated && inAuthGroup) {
      if (user?.birthDate) {
        router.replace('/(tabs)/home');
      }
    }
  }, [isAuthenticated, isHydrated, i18nReady, segments]);
}

function AppNavigator({ i18nReady }: { i18nReady: boolean }) {
  const { colors, activeTheme } = useTheme();

  // Run the route guard inside AppNavigator so the Stack is already mounted
  useProtectedRoute(i18nReady);

  return (
    <>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.bg },
          animation: 'slide_from_right',
        }}
      />
    </>
  );
}

export default function Layout() {
  const hydrate = useAuthStore((s) => s.hydrate);
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    hydrate();
    initI18n().then(() => setI18nReady(true));
  }, []);

  // IMPORTANT: never return null — the root layout must always render its navigator.
  // The Stack mounts immediately; navigation waits for i18nReady inside AppNavigator.
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppNavigator i18nReady={i18nReady} />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
