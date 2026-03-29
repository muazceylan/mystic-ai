import { useRef } from 'react';
import { useRouter } from 'expo-router';

export function useTabHeaderActions() {
  const router = useRouter();
  const notifNavigatingRef = useRef(false);
  return {
    onOpenProfile: () => router.push('/(tabs)/profile'),
    onOpenSettings: () => router.push('/theme-settings'),
    onOpenNotifications: () => {
      if (notifNavigatingRef.current) return;
      notifNavigatingRef.current = true;
      router.navigate('/notifications');
      setTimeout(() => { notifNavigatingRef.current = false; }, 600);
    },
  };
}
