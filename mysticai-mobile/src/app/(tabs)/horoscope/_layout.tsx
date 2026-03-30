import { Stack } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { createAppStackScreenOptions } from '../../../navigation/stackOptions';

export default function HoroscopeLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={createAppStackScreenOptions({
        backgroundColor: colors.bg,
        headerShown: false,
      })}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="[sign]" />
    </Stack>
  );
}
