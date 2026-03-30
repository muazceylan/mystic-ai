import { Stack } from 'expo-router';
import { useTheme } from '../../../context/ThemeContext';
import { createAppStackScreenOptions } from '../../../navigation/stackOptions';

export default function CompareLayout() {
  const { colors } = useTheme();

  return (
    <Stack
      screenOptions={createAppStackScreenOptions({
        backgroundColor: colors.bg,
        headerShown: false,
      })}
    />
  );
}
