import { useRouter } from 'expo-router';

export function useTabHeaderActions() {
  const router = useRouter();
  return {
    onOpenProfile: () => router.push('/(tabs)/profile'),
    onOpenSettings: () => router.push('/theme-settings'),
    onOpenNotifications: () => router.push('/notifications-settings'),
  };
}
