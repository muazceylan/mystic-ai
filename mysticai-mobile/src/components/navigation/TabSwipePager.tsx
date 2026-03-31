import React, { useCallback, useMemo, useRef } from 'react';
import { Dimensions, Platform, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Extrapolation,
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  Easing as REasing,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { TabActions, useNavigation } from '@react-navigation/native';
import { useTheme } from '../../context/ThemeContext';
import { AppSurfaceBackground } from '../ui/AppSurfaceBackground';
import {
  type MainTabRoute,
  MAIN_TAB_ORDER,
  SWIPE_THRESHOLDS,
  SETTLE_SPRING,
  FAST_SETTLE_DURATION_MS,
  OVERSCROLL_RESISTANCE,
  NAVIGATION_LOCK_MS,
} from '../../navigation/tabPagerConfig';

const SCREEN_WIDTH = Dimensions.get('window').width;

let globalLastNavigationAt = 0;

function getNavigationCandidates(navigation: any): any[] {
  const candidates: any[] = [];
  const seen = new Set<any>();
  let current = navigation;
  while (current && !seen.has(current)) {
    candidates.push(current);
    seen.add(current);
    current = current.getParent?.();
  }
  return candidates;
}

type TabSwipePagerProps = {
  tab: MainTabRoute;
  children: React.ReactNode;
};

/**
 * Wraps a main-tab screen and provides an Instagram-style horizontal swipe
 * gesture to navigate between sibling tabs.
 *
 * Key improvements over the legacy tab-swipe wrapper:
 *
 * - **Native-thread gesture** via `Gesture.Pan()` from react-native-gesture-handler.
 * - **UI-thread animation** via Reanimated `useSharedValue` + `useAnimatedStyle`.
 * - **Spring physics** for natural snap-back and completion.
 * - **Full-width gesture area** — no edge-activation required.
 * - **Direction locking** — the gesture is dismissed if the initial movement is
 *   vertical, so inner ScrollView / FlatList scrolling is unaffected.
 * - **No ViewShot** — the adjacent-tab preview is a lightweight themed gradient,
 *   shown with a parallax offset.  The current screen slides over it for a
 *   layered, page-turning feel.
 * - **Rubber-band overscroll** past the first/last tab instead of hard-stopping.
 */
export function TabSwipePager({ tab, children }: TabSwipePagerProps) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();

  const translateX = useSharedValue(0);
  const isNavigatingRef = useRef(false);

  const currentIndex = MAIN_TAB_ORDER.indexOf(tab);
  const hasLeft = currentIndex > 0;
  const hasRight = currentIndex < MAIN_TAB_ORDER.length - 1;

  const navigateToTab = useCallback(
    (targetTab: MainTabRoute) => {
      if (isNavigatingRef.current) return;
      isNavigatingRef.current = true;

      for (const nav of getNavigationCandidates(navigation)) {
        const routeNames: unknown = nav?.getState?.()?.routeNames;
        if (Array.isArray(routeNames) && routeNames.includes(targetTab)) {
          nav.dispatch(TabActions.jumpTo(targetTab));
          isNavigatingRef.current = false;
          return;
        }
      }

      router.replace(`/(tabs)/${targetTab}` as any);
      isNavigatingRef.current = false;
    },
    [navigation],
  );

  const handleSwipeComplete = useCallback(
    (direction: -1 | 1) => {
      const targetIndex = currentIndex + direction;
      if (targetIndex < 0 || targetIndex >= MAIN_TAB_ORDER.length) return;
      navigateToTab(MAIN_TAB_ORDER[targetIndex]);
    },
    [currentIndex, navigateToTab],
  );

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([
          -SWIPE_THRESHOLDS.activateOffset,
          SWIPE_THRESHOLDS.activateOffset,
        ])
        .failOffsetY([
          -SWIPE_THRESHOLDS.failOffset,
          SWIPE_THRESHOLDS.failOffset,
        ])
        .minPointers(1)
        .maxPointers(1)
        .onUpdate((event) => {
          'worklet';
          let dx = event.translationX;

          if (!hasLeft && dx > 0) {
            dx = dx * OVERSCROLL_RESISTANCE;
          }
          if (!hasRight && dx < 0) {
            dx = dx * OVERSCROLL_RESISTANCE;
          }

          translateX.value = dx;
        })
        .onEnd((event) => {
          'worklet';
          const dx = event.translationX;
          const vx = event.velocityX;
          const absDx = Math.abs(dx);
          const absVx = Math.abs(vx);

          const progressComplete =
            absDx > SCREEN_WIDTH * SWIPE_THRESHOLDS.progressThreshold;
          const velocityComplete =
            absVx > SWIPE_THRESHOLDS.velocityThreshold &&
            absDx > SWIPE_THRESHOLDS.minDragForVelocity;
          const shouldComplete = progressComplete || velocityComplete;

          if (shouldComplete) {
            const direction: -1 | 1 = dx > 0 ? -1 : 1;
            const targetIndex = currentIndex + direction;

            if (
              targetIndex >= 0 &&
              targetIndex < MAIN_TAB_ORDER.length
            ) {
              const now = Date.now();
              if (now - globalLastNavigationAt < NAVIGATION_LOCK_MS) {
                translateX.value = withSpring(0, SETTLE_SPRING);
                return;
              }
              globalLastNavigationAt = now;

              const exitTarget = dx > 0 ? SCREEN_WIDTH : -SCREEN_WIDTH;

              if (absVx > 1200) {
                translateX.value = withTiming(
                  exitTarget,
                  {
                    duration: FAST_SETTLE_DURATION_MS,
                    easing: REasing.out(REasing.cubic),
                  },
                  (finished) => {
                    'worklet';
                    if (finished) {
                      runOnJS(handleSwipeComplete)(direction);
                      translateX.value = 0;
                    }
                  },
                );
              } else {
                translateX.value = withSpring(
                  exitTarget,
                  { ...SETTLE_SPRING, velocity: vx },
                  (finished) => {
                    'worklet';
                    if (finished) {
                      runOnJS(handleSwipeComplete)(direction);
                      translateX.value = 0;
                    }
                  },
                );
              }
              return;
            }
          }

          translateX.value = withSpring(0, SETTLE_SPRING);
        }),
    [currentIndex, hasLeft, hasRight, handleSwipeComplete, translateX],
  );

  const contentAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  const leftPreviewAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(
        translateX.value,
        [0, SCREEN_WIDTH * 0.15, SCREEN_WIDTH * 0.5],
        [0, 0.4, 1],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            translateX.value,
            [0, SCREEN_WIDTH],
            [-SCREEN_WIDTH * 0.25, 0],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const rightPreviewAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    return {
      opacity: interpolate(
        translateX.value,
        [-SCREEN_WIDTH * 0.5, -SCREEN_WIDTH * 0.15, 0],
        [1, 0.4, 0],
        Extrapolation.CLAMP,
      ),
      transform: [
        {
          translateX: interpolate(
            translateX.value,
            [-SCREEN_WIDTH, 0],
            [0, SCREEN_WIDTH * 0.25],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const shadowAnimatedStyle = useAnimatedStyle(() => {
    'worklet';
    const absTranslate = Math.abs(translateX.value);
    return {
      shadowOpacity: interpolate(
        absTranslate,
        [0, SCREEN_WIDTH * 0.3],
        [0, 0.12],
        Extrapolation.CLAMP,
      ),
      elevation: interpolate(
        absTranslate,
        [0, SCREEN_WIDTH * 0.15],
        [0, 12],
        Extrapolation.CLAMP,
      ),
    };
  });

  const previewOverlayColor = isDark
    ? 'rgba(8,10,22,0.10)'
    : 'rgba(255,255,255,0.06)';

  return (
    <GestureDetector gesture={panGesture}>
      <View style={styles.container}>
        {hasLeft && (
          <Animated.View
            style={[styles.previewLayer, leftPreviewAnimatedStyle]}
            pointerEvents="none"
          >
            <AppSurfaceBackground />
            <View
              style={[
                styles.previewOverlay,
                { backgroundColor: previewOverlayColor },
              ]}
            />
          </Animated.View>
        )}

        {hasRight && (
          <Animated.View
            style={[styles.previewLayer, rightPreviewAnimatedStyle]}
            pointerEvents="none"
          >
            <AppSurfaceBackground />
            <View
              style={[
                styles.previewOverlay,
                { backgroundColor: previewOverlayColor },
              ]}
            />
          </Animated.View>
        )}

        <Animated.View
          style={[
            styles.currentLayer,
            contentAnimatedStyle,
            Platform.OS === 'ios' ? shadowAnimatedStyle : undefined,
          ]}
        >
          {children}
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  previewLayer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  currentLayer: {
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 16,
  },
});
