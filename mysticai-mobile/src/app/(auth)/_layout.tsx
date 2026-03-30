import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { useTheme } from '../../context/ThemeContext';
import { createAppStackScreenOptions } from '../../navigation/stackOptions';

const ONBOARDING_STEPS = [
  'email-register',
  'birth-date',
  'birth-time',
  'birth-country',
  'birth-city',
  'gender',
  'marital-status',
  'notification-permission',
  'natal-chart',
];

export default function AuthLayout() {
  const { colors, activeTheme } = useTheme();
  const pathname = usePathname();

  const stepInfo = useMemo(() => {
    const screenName = pathname.split('/').pop() || '';
    const index = ONBOARDING_STEPS.indexOf(screenName);
    if (index === -1) return null;
    return { current: index + 1, total: ONBOARDING_STEPS.length };
  }, [pathname]);

  return (
    <>
      <StatusBar style={activeTheme === 'dark' ? 'light' : 'dark'} />
      {stepInfo && (
        <SafeAreaView edges={['top']} style={{ backgroundColor: colors.bg }}>
          <OnboardingProgressBar
            currentStep={stepInfo.current}
            totalSteps={stepInfo.total}
          />
        </SafeAreaView>
      )}
      <Stack
        screenOptions={createAppStackScreenOptions({
          backgroundColor: colors.bg,
          headerShown: false,
          animationDuration: 250,
        })}
      >
        <Stack.Screen name="welcome" />
        <Stack.Screen name="guest-name" options={{ gestureEnabled: false }} />
        <Stack.Screen name="forgot-password" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="verify-email-pending" />
        <Stack.Screen name="verify-email" />
        <Stack.Screen name="email-register" />
        <Stack.Screen name="birth-date" />
        <Stack.Screen name="birth-time" />
        <Stack.Screen name="birth-country" />
        <Stack.Screen name="birth-city" />
        <Stack.Screen name="gender" />
        <Stack.Screen name="marital-status" />
        <Stack.Screen name="notification-permission" />
        <Stack.Screen name="natal-chart" />
      </Stack>
    </>
  );
}
