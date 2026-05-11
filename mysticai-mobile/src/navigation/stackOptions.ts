import type { ComponentProps } from 'react';
import { Stack } from 'expo-router';
import { Platform } from 'react-native';

// pnpm can hoist @react-navigation/native-stack twice (once for our direct dep,
// once nested under expo-router). Deriving both input and output types from
// expo-router's <Stack> keeps us on the same resolution path and avoids
// duplicate-package incompatibilities in global typecheck.
type StackScreenOptionsProp = NonNullable<ComponentProps<typeof Stack>['screenOptions']>;
type StackScreenOptionsObject = Exclude<StackScreenOptionsProp, (...args: never[]) => unknown>;

type AppStackScreenOptionsInput = Omit<StackScreenOptionsObject, 'contentStyle'> & {
  backgroundColor: string;
  contentStyle?: StackScreenOptionsObject['contentStyle'];
};

export function createAppStackScreenOptions({
  backgroundColor,
  headerShown = false,
  contentStyle,
  ...overrides
}: AppStackScreenOptionsInput): StackScreenOptionsObject {
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
    // Keep iOS back-swipe edge-only. Full-screen back gestures were too easy to
    // trigger while vertically scrolling long screens in Expo/device testing.
    fullScreenGestureEnabled: false,
    animationMatchesGesture: Platform.OS === 'ios',
    freezeOnBlur: true,
    ...overrides,
  } as StackScreenOptionsObject;
}
