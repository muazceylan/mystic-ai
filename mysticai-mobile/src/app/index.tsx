import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';
import { needsOnboarding } from '../utils/authOnboarding';
import BrandHomeWebScreen from '../screens/BrandHomeWebScreen';

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const [isHydrated, setIsHydrated] = useState(useAuthStore.persist.hasHydrated());

  useEffect(() => {
    const unsubscribe = useAuthStore.persist.onFinishHydration(() => {
      setIsHydrated(true);
    });
    return unsubscribe;
  }, []);

  if (Platform.OS === 'web') {
    return <BrandHomeWebScreen />;
  }

  if (!isHydrated) {
    return null;
  }

  const redirectHref = !isAuthenticated
    ? '/(auth)/welcome'
    : needsOnboarding(user)
      ? '/(auth)/birth-date'
      : '/(tabs)/home';

  return (
    <Redirect href={redirectHref} />
  );
}
