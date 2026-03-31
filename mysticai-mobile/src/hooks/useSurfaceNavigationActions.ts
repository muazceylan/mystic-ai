import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'expo-router';

const NOTIFICATION_NAV_RESET_MS = 600;

export function useSurfaceNavigationActions() {
  const router = useRouter();
  const notifNavigatingRef = useRef(false);
  const notifResetTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (notifResetTimeoutRef.current) {
        clearTimeout(notifResetTimeoutRef.current);
      }
    };
  }, []);

  const onOpenProfile = useCallback(() => {
    router.push('/(tabs)/profile');
  }, [router]);

  const onOpenSettings = useCallback(() => {
    router.push('/(tabs)/theme-settings');
  }, [router]);

  const onOpenNotifications = useCallback(() => {
    if (notifNavigatingRef.current) return;

    notifNavigatingRef.current = true;
    router.navigate('/(tabs)/notifications');

    if (notifResetTimeoutRef.current) {
      clearTimeout(notifResetTimeoutRef.current);
    }

    notifResetTimeoutRef.current = setTimeout(() => {
      notifNavigatingRef.current = false;
      notifResetTimeoutRef.current = null;
    }, NOTIFICATION_NAV_RESET_MS);
  }, [router]);

  return {
    onOpenProfile,
    onOpenSettings,
    onOpenNotifications,
  };
}
