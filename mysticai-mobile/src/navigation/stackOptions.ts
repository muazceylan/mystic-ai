import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

type AppStackScreenOptionsInput = Omit<NativeStackNavigationOptions, 'contentStyle'> & {
  backgroundColor: string;
  contentStyle?: NativeStackNavigationOptions['contentStyle'];
};

export function createAppStackScreenOptions({
  backgroundColor,
  headerShown = false,
  contentStyle,
  ...overrides
}: AppStackScreenOptionsInput): NativeStackNavigationOptions {
  return {
    headerShown,
    presentation: 'card',
    contentStyle: [{ backgroundColor }, contentStyle],
    animation: Platform.select({
      ios: 'default',
      android: 'fade_from_bottom',
      default: 'default',
    }),
    animationDuration: Platform.select({ android: 200, default: undefined }),
    gestureEnabled: Platform.OS === 'ios',
    gestureDirection: 'horizontal',
    fullScreenGestureEnabled: Platform.OS === 'ios',
    animationMatchesGesture: Platform.OS === 'ios',
    freezeOnBlur: true,
    ...overrides,
  };
}
