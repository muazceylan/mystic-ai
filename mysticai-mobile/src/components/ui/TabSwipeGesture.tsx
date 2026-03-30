import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  InteractionManager,
  PanResponder,
  Platform,
  StyleSheet,
  View,
  type PanResponderGestureState,
} from 'react-native';
import { router } from 'expo-router';
import { TabActions, useNavigation } from '@react-navigation/native';
import { useIsFocused } from '@react-navigation/native';
import ViewShot, { releaseCapture } from 'react-native-view-shot';
import { useTheme } from '../../context/ThemeContext';
import { AppSurfaceBackground } from './AppSurfaceBackground';

const MAIN_TAB_ORDER = ['home', 'discover', 'calendar', 'natal-chart', 'profile'] as const;

export type MainTabRoute = (typeof MAIN_TAB_ORDER)[number];

type TabSwipeGestureProps = {
  tab: MainTabRoute;
  children: React.ReactNode;
};

type PreviewCacheEntry = {
  capturedAt: number;
  uri: string;
};

const previewCache = new Map<MainTabRoute, PreviewCacheEntry>();
const CAPTURE_OPTIONS = {
  format: 'jpg',
  quality: Platform.OS === 'android' ? 0.24 : 0.3,
  result: 'tmpfile',
} as const;

const SWIPE_CONFIG = Platform.select({
  ios: {
    activateHorizontalDelta: 26,
    minSwipeDistance: 84,
    minSwipeVelocity: 0.32,
    maxVerticalDrift: 72,
    horizontalDominanceRatio: 1.2,
    edgeActivationWidth: 28,
    previewRevealDistance: 42,
    exitDuration: 210,
  },
  android: {
    activateHorizontalDelta: 24,
    minSwipeDistance: 78,
    minSwipeVelocity: 0.3,
    maxVerticalDrift: 68,
    horizontalDominanceRatio: 1.16,
    edgeActivationWidth: 24,
    previewRevealDistance: 38,
    exitDuration: 180,
  },
  default: {
    activateHorizontalDelta: 24,
    minSwipeDistance: 78,
    minSwipeVelocity: 0.3,
    maxVerticalDrift: 68,
    horizontalDominanceRatio: 1.16,
    edgeActivationWidth: 24,
    previewRevealDistance: 38,
    exitDuration: 180,
  },
}) ?? {
  activateHorizontalDelta: 24,
  minSwipeDistance: 78,
  minSwipeVelocity: 0.3,
  maxVerticalDrift: 68,
  horizontalDominanceRatio: 1.16,
  edgeActivationWidth: 24,
  previewRevealDistance: 38,
  exitDuration: 180,
};

const ACTIVATE_HORIZONTAL_DELTA = SWIPE_CONFIG.activateHorizontalDelta;
const MIN_SWIPE_DISTANCE = SWIPE_CONFIG.minSwipeDistance;
const MIN_SWIPE_VELOCITY = SWIPE_CONFIG.minSwipeVelocity;
const MAX_VERTICAL_DRIFT = SWIPE_CONFIG.maxVerticalDrift;
const HORIZONTAL_DOMINANCE_RATIO = SWIPE_CONFIG.horizontalDominanceRatio;
const EDGE_ACTIVATION_WIDTH = SWIPE_CONFIG.edgeActivationWidth;
const PREVIEW_REVEAL_DISTANCE = SWIPE_CONFIG.previewRevealDistance;
const EXIT_DURATION_MS = SWIPE_CONFIG.exitDuration;
const PREVIEW_CAPTURE_DELAY_MS = Platform.OS === 'android' ? 420 : 260;
const PREVIEW_CAPTURE_COOLDOWN_MS = Platform.OS === 'android' ? 1600 : 1100;
const NAVIGATION_LOCK_MS = 380;
let globalLastNavigationAt = 0;

function getAdjacentTab(tab: MainTabRoute, direction: -1 | 1): MainTabRoute | null {
  const currentIndex = MAIN_TAB_ORDER.indexOf(tab);
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= MAIN_TAB_ORDER.length) return null;
  return MAIN_TAB_ORDER[targetIndex];
}

function resolveTargetTab(tab: MainTabRoute, gestureState: PanResponderGestureState): MainTabRoute | null {
  const absDx = Math.abs(gestureState.dx);
  const absDy = Math.abs(gestureState.dy);
  const absVx = Math.abs(gestureState.vx);

  const horizontalEnough = absDx >= MIN_SWIPE_DISTANCE || absVx >= MIN_SWIPE_VELOCITY;
  if (!horizontalEnough) return null;
  if (absDy > MAX_VERTICAL_DRIFT) return null;
  if (absDx < absDy * HORIZONTAL_DOMINANCE_RATIO) return null;

  const direction: -1 | 1 = gestureState.dx < 0 ? 1 : -1;
  const adjacentTab = getAdjacentTab(tab, direction);
  if (!adjacentTab) return null;

  return adjacentTab;
}

function shouldActivateFromEdge(locationX: number, containerWidth: number): boolean {
  if (containerWidth <= EDGE_ACTIVATION_WIDTH * 2) return true;
  return locationX <= EDGE_ACTIVATION_WIDTH || locationX >= containerWidth - EDGE_ACTIVATION_WIDTH;
}

function resolvePreviewTab(tab: MainTabRoute, deltaX: number): MainTabRoute | null {
  if (Math.abs(deltaX) < PREVIEW_REVEAL_DISTANCE) return null;
  const direction: -1 | 1 = deltaX < 0 ? 1 : -1;
  return getAdjacentTab(tab, direction);
}

function setCachedPreview(tab: MainTabRoute, uri: string) {
  const previous = previewCache.get(tab)?.uri;
  if (previous && previous !== uri) {
    try {
      releaseCapture(previous);
    } catch {
      // Ignore tmpfile cleanup failures.
    }
  }

  previewCache.set(tab, {
    uri,
    capturedAt: Date.now(),
  });
}

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

export function TabSwipeGesture({ tab, children }: TabSwipeGestureProps) {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();
  const isNavigatingRef = useRef(false);
  const viewShotRef = useRef<ViewShot | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const captureTaskRef = useRef<ReturnType<typeof InteractionManager.runAfterInteractions> | null>(null);
  const lastCaptureAtRef = useRef(0);
  const [previewTab, setPreviewTab] = useState<MainTabRoute | null>(null);
  const [containerWidth, setContainerWidth] = useState(1);
  const translateX = useRef(new Animated.Value(0)).current;

  const clearPendingCapture = useCallback(() => {
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current);
      captureTimerRef.current = null;
    }

    captureTaskRef.current?.cancel();
    captureTaskRef.current = null;
  }, []);

  const capturePreview = useCallback(async () => {
    if (Platform.OS === 'web' || !isFocused || isNavigatingRef.current) return;

    const now = Date.now();
    const cachedAt = previewCache.get(tab)?.capturedAt ?? 0;
    const latestCaptureAt = Math.max(lastCaptureAtRef.current, cachedAt);
    if (now - latestCaptureAt < PREVIEW_CAPTURE_COOLDOWN_MS) return;

    const viewShot = viewShotRef.current;
    if (!viewShot?.capture) return;

    try {
      const uri = await viewShot.capture();
      if (!uri) return;
      lastCaptureAtRef.current = Date.now();
      setCachedPreview(tab, uri);
    } catch {
      // Preview capture should never interrupt gestures.
    }
  }, [isFocused, tab]);

  const scheduleCapture = useCallback((delay = PREVIEW_CAPTURE_DELAY_MS) => {
    if (Platform.OS === 'web' || !isFocused) return;

    clearPendingCapture();
    captureTimerRef.current = setTimeout(() => {
      captureTaskRef.current = InteractionManager.runAfterInteractions(() => {
        void capturePreview();
      });
    }, delay);
  }, [capturePreview, clearPendingCapture, isFocused]);

  useEffect(() => {
    if (!isFocused) {
      clearPendingCapture();
      return undefined;
    }

    scheduleCapture();
    return clearPendingCapture;
  }, [clearPendingCapture, isFocused, scheduleCapture]);

  const animateBackToCenter = useCallback(() => {
    if (isNavigatingRef.current) return;
    Animated.spring(translateX, {
      toValue: 0,
      speed: 24,
      bounciness: 0,
      useNativeDriver: true,
    }).start(() => {
      setPreviewTab(null);
      scheduleCapture(180);
    });
  }, [scheduleCapture, translateX]);

  const currentIndex = MAIN_TAB_ORDER.indexOf(tab);
  const hasLeftTab = currentIndex > 0;
  const hasRightTab = currentIndex < MAIN_TAB_ORDER.length - 1;
  const navigateToTab = useCallback((targetTab: MainTabRoute) => {
    for (const nav of getNavigationCandidates(navigation)) {
      const routeNames: unknown = nav?.getState?.()?.routeNames;
      if (Array.isArray(routeNames) && routeNames.includes(targetTab)) {
        nav.dispatch(TabActions.jumpTo(targetTab));
        return;
      }
    }

    router.replace(`/(tabs)/${targetTab}`);
  }, [navigation]);

  const panResponder = useMemo(
    () => PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (event, gestureState) => {
        const absDx = Math.abs(gestureState.dx);
        const absDy = Math.abs(gestureState.dy);
        const locationX = Number(event.nativeEvent.locationX ?? 0);

        if (absDx < ACTIVATE_HORIZONTAL_DELTA) return false;
        if (absDx < absDy * HORIZONTAL_DOMINANCE_RATIO) return false;
        if (!shouldActivateFromEdge(locationX, containerWidth)) return false;
        if (!hasLeftTab && gestureState.dx > 0) return false;
        if (!hasRightTab && gestureState.dx < 0) return false;
        return true;
      },
      onPanResponderMove: (_, gestureState) => {
        if (isNavigatingRef.current) return;
        const clampedDx = Math.max(-containerWidth, Math.min(containerWidth, gestureState.dx));
        translateX.setValue(clampedDx);

        if (clampedDx === 0) {
          setPreviewTab(null);
          return;
        }

        setPreviewTab(resolvePreviewTab(tab, clampedDx));
      },
      onPanResponderRelease: (_, gestureState) => {
        const targetTab = resolveTargetTab(tab, gestureState);
        if (!targetTab) {
          animateBackToCenter();
          return;
        }

        const now = Date.now();
        if (now - globalLastNavigationAt < NAVIGATION_LOCK_MS) {
          animateBackToCenter();
          return;
        }
        globalLastNavigationAt = now;
        isNavigatingRef.current = true;
        clearPendingCapture();
        setPreviewTab(targetTab);

        const exitTo = gestureState.dx < 0 ? -containerWidth : containerWidth;
        Animated.timing(translateX, {
          toValue: exitTo,
          duration: EXIT_DURATION_MS,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start(() => {
          navigateToTab(targetTab);
          isNavigatingRef.current = false;
          translateX.setValue(0);
          setPreviewTab(null);
        });
      },
      onPanResponderTerminate: animateBackToCenter,
    }),
    [animateBackToCenter, clearPendingCapture, containerWidth, hasLeftTab, hasRightTab, navigateToTab, tab, translateX],
  );

  const previewUri = previewTab ? previewCache.get(previewTab)?.uri ?? null : null;
  const handleLayout = useCallback((event: any) => {
    const nextWidth = Math.max(1, Math.round(event?.nativeEvent?.layout?.width ?? 1));
    if (nextWidth !== containerWidth) {
      setContainerWidth(nextWidth);
      if (isFocused) {
        scheduleCapture(120);
      }
    }
  }, [containerWidth, isFocused, scheduleCapture]);

  return (
    <View style={styles.container} onLayout={handleLayout} {...panResponder.panHandlers}>
      {previewTab ? (
        <View pointerEvents="none" style={styles.previewLayer}>
          {previewUri ? (
            <>
              <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
              <View
                style={[
                  styles.previewOverlay,
                  { backgroundColor: isDark ? 'rgba(8,10,22,0.06)' : 'rgba(255,255,255,0.04)' },
                ]}
              />
            </>
          ) : (
            <>
              <AppSurfaceBackground />
              <View
                style={[
                  styles.previewOverlay,
                  { backgroundColor: isDark ? 'rgba(8,10,22,0.12)' : 'rgba(255,255,255,0.10)' },
                ]}
              />
            </>
          )}
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.currentLayer,
          previewTab ? styles.currentLayerRaised : null,
          { transform: [{ translateX }] },
        ]}
      >
        {Platform.OS === 'web' ? (
          children
        ) : (
          <View style={styles.currentLayer} collapsable={false}>
            <ViewShot
              ref={viewShotRef}
              options={CAPTURE_OPTIONS}
              style={styles.currentLayer}
            >
              {children}
            </ViewShot>
          </View>
        )}
      </Animated.View>
    </View>
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
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  currentLayer: {
    flex: 1,
  },
  currentLayerRaised: {
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
});
