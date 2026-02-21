import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import OnboardingProgressBar from '../../components/OnboardingProgressBar';
import { COLORS } from '../../constants/colors';

const ONBOARDING_STEPS = [
  'email-register',
  'birth-date',
  'birth-time',
  'birth-country',
  'birth-city',
  'gender',
  'marital-status',
  'focus-point',
  'natal-chart',
];

export default function AuthLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  const stepInfo = useMemo(() => {
    const screenName = pathname.split('/').pop() || '';
    const index = ONBOARDING_STEPS.indexOf(screenName);
    if (index === -1) return null;
    return { current: index + 1, total: ONBOARDING_STEPS.length };
  }, [pathname]);

  return (
    <>
      <StatusBar style="dark" />
      {stepInfo && (
        <View style={{ paddingTop: insets.top, backgroundColor: COLORS.background }}>
          <OnboardingProgressBar
            currentStep={stepInfo.current}
            totalSteps={stepInfo.total}
          />
        </View>
      )}
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: COLORS.background,
          },
          animation: 'slide_from_right',
          animationDuration: 250,
        }}
      >
        <Stack.Screen name="welcome" />
        <Stack.Screen name="login" />
        <Stack.Screen name="email-register" />
        <Stack.Screen name="birth-date" />
        <Stack.Screen name="birth-time" />
        <Stack.Screen name="birth-country" />
        <Stack.Screen name="birth-city" />
        <Stack.Screen name="gender" />
        <Stack.Screen name="marital-status" />
        <Stack.Screen name="focus-point" />
        <Stack.Screen name="natal-chart" />
      </Stack>
    </>
  );
}
