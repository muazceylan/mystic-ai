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
      android: 'slide_from_right',
      default: 'default',
    }),
    gestureEnabled: Platform.OS === 'ios',
    gestureDirection: 'horizontal',
    fullScreenGestureEnabled: false,
    animationMatchesGesture: false,
    ...overrides,
  };
}
