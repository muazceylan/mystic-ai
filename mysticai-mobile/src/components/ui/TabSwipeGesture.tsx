import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  View,
  type PanResponderGestureState,
} from 'react-native';
import { router } from 'expo-router';
import { TabActions, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import ViewShot, { releaseCapture } from 'react-native-view-shot';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

const MAIN_TAB_ORDER = ['home', 'discover', 'calendar', 'natal-chart', 'profile'] as const;

export type MainTabRoute = (typeof MAIN_TAB_ORDER)[number];

type TabSwipeGestureProps = {
  tab: MainTabRoute;
  children: React.ReactNode;
};

type TabMeta = {
  icon: keyof typeof Ionicons.glyphMap;
  labelKey: string;
};

const TAB_META: Record<MainTabRoute, TabMeta> = {
  home: { icon: 'home', labelKey: 'tabs.home' },
  discover: { icon: 'compass', labelKey: 'tabs.discover' },
  calendar: { icon: 'calendar', labelKey: 'tabs.calendar' },
  'natal-chart': { icon: 'planet', labelKey: 'tabs.natalChart' },
  profile: { icon: 'person', labelKey: 'tabs.profile' },
};

const CAPTURE_OPTIONS = {
  format: 'jpg',
  quality: 0.36,
  result: 'tmpfile',
} as const;

const previewCache = new Map<MainTabRoute, { uri: string; capturedAt: number }>();
const PREVIEW_STALE_MS = 10_000; // Previews older than 10s are considered stale

const ACTIVATE_HORIZONTAL_DELTA = 18;
const MIN_SWIPE_DISTANCE = 50;
const MIN_SWIPE_VELOCITY = 0.3;
const MAX_VERTICAL_DRIFT = 80;
const HORIZONTAL_DOMINANCE_RATIO = 1.1;
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

function setCachedPreview(tab: MainTabRoute, uri: string) {
  const previous = previewCache.get(tab);
  if (previous && previous.uri !== uri) {
    try {
      releaseCapture(previous.uri);
    } catch {
      // Ignore release failures; stale tmp files are tolerable in development.
    }
  }
  previewCache.set(tab, { uri, capturedAt: Date.now() });
}

function getFreshPreview(tab: MainTabRoute): string | null {
  const entry = previewCache.get(tab);
  if (!entry) return null;
  if (Date.now() - entry.capturedAt > PREVIEW_STALE_MS) return null;
  return entry.uri;
}

export function TabSwipeGesture({ tab, children }: TabSwipeGestureProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const isNavigatingRef = useRef(false);
  const viewShotRef = useRef<ViewShot | null>(null);
  const captureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [previewTab, setPreviewTab] = useState<MainTabRoute | null>(null);
  const [containerWidth, setContainerWidth] = useState(1);
  const translateX = useRef(new Animated.Value(0)).current;

  const scheduleCapture = useCallback((delay = 220) => {
    if (Platform.OS === 'web') return;
    if (captureTimerRef.current) {
      clearTimeout(captureTimerRef.current);
    }

    captureTimerRef.current = setTimeout(async () => {
      const viewShot = viewShotRef.current;
      if (!viewShot) return;
      try {
        const uri = await viewShot.capture?.();
        if (uri) {
          setCachedPreview(tab, uri);
        }
      } catch {
        // Snapshot failures should never block swipe navigation.
      }
    }, delay);
  }, [tab]);

  useEffect(() => {
    scheduleCapture(420);
    return () => {
      if (captureTimerRef.current) {
        clearTimeout(captureTimerRef.current);
        captureTimerRef.current = null;
      }
    };
  }, [scheduleCapture]);

  const animateBackToCenter = useCallback(() => {
    if (isNavigatingRef.current) return;
    Animated.spring(translateX, {
      toValue: 0,
      speed: 24,
      bounciness: 0,
      useNativeDriver: true,
    }).start(() => {
      setPreviewTab(null);
      scheduleCapture(160);
    });
  }, [scheduleCapture, translateX]);

  const currentIndex = MAIN_TAB_ORDER.indexOf(tab);
  const hasLeftTab = currentIndex > 0;
  const hasRightTab = currentIndex < MAIN_TAB_ORDER.length - 1;
  const navigateToTab = useCallback((targetTab: MainTabRoute) => {
    const parent = navigation.getParent?.();
    const candidates = [navigation, parent].filter(Boolean) as any[];

    for (const nav of candidates) {
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
      // No edge detection. React Native's ScrollView.onResponderTerminationRequest
      // already handles conflicts: it rejects transfer when actively scrolling and
      // allows transfer when at a scroll boundary (can't scroll further).
      onMoveShouldSetPanResponder: (_, gestureState) => {
        const absDx = Math.abs(gestureState.dx);
        const absDy = Math.abs(gestureState.dy);

        if (absDx < ACTIVATE_HORIZONTAL_DELTA) return false;
        if (absDx < absDy * HORIZONTAL_DOMINANCE_RATIO) return false;
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

        const direction: -1 | 1 = clampedDx < 0 ? 1 : -1;
        setPreviewTab(getAdjacentTab(tab, direction));
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

        const exitTo = gestureState.dx < 0 ? -containerWidth : containerWidth;
        // Clear stale preview for target tab so it gets recaptured on arrival.
        previewCache.delete(targetTab);

        Animated.timing(translateX, {
          toValue: exitTo,
          duration: 180,
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
    [animateBackToCenter, containerWidth, hasLeftTab, hasRightTab, navigateToTab, tab, translateX],
  );

  const previewUri = previewTab ? getFreshPreview(previewTab) : null;
  const previewMeta = previewTab ? TAB_META[previewTab] : null;

  const handleLayout = useCallback((event: any) => {
    const nextWidth = Math.max(1, Math.round(event?.nativeEvent?.layout?.width ?? 1));
    if (nextWidth !== containerWidth) {
      setContainerWidth(nextWidth);
    }
    scheduleCapture(220);
  }, [containerWidth, scheduleCapture]);

  return (
    <View style={styles.container} onLayout={handleLayout} {...panResponder.panHandlers}>
      {previewTab ? (
        <View pointerEvents="none" style={styles.previewLayer}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={styles.previewImage} resizeMode="cover" />
          ) : (
            <View
              style={[
                styles.previewFallback,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                },
              ]}
            >
              {previewMeta ? (
                <>
                  <Ionicons name={previewMeta.icon} size={40} color={colors.primary} />
                  <Text style={[styles.previewFallbackText, { color: colors.text }]}>
                    {t(previewMeta.labelKey)}
                  </Text>
                </>
              ) : null}
            </View>
          )}
          <View
            style={[
              styles.previewOverlay,
              { backgroundColor: isDark ? 'rgba(8,10,22,0.14)' : 'rgba(255,255,255,0.12)' },
            ]}
          />
        </View>
      ) : null}

      <Animated.View style={[styles.currentLayer, { transform: [{ translateX }] }]}>
        {Platform.OS === 'web' ? (
          children
        ) : (
          <ViewShot ref={viewShotRef} options={CAPTURE_OPTIONS} style={styles.currentLayer}>
            {children}
          </ViewShot>
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
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  previewFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
  },
  previewFallbackText: {
    fontSize: 17,
    fontWeight: '700',
  },
  currentLayer: {
    flex: 1,
  },
});
