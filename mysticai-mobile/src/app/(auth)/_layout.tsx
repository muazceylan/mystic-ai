import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AuthLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: {
            backgroundColor: '#F9F7FB',
          },
          animation: 'slide_from_right',
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
