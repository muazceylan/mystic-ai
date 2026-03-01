import { Stack } from 'expo-router';

export default function HoroscopeLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="[sign]" />
    </Stack>
  );
}
