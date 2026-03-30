import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
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
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { AppSurfaceBackground } from './AppSurfaceBackground';

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

export function TabSwipeGesture({ tab, children }: TabSwipeGestureProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const isNavigatingRef = useRef(false);
  const [previewTab, setPreviewTab] = useState<MainTabRoute | null>(null);
  const [containerWidth, setContainerWidth] = useState(1);
  const translateX = useRef(new Animated.Value(0)).current;

  const animateBackToCenter = useCallback(() => {
    if (isNavigatingRef.current) return;
    Animated.spring(translateX, {
      toValue: 0,
      speed: 24,
      bounciness: 0,
      useNativeDriver: true,
    }).start(() => {
      setPreviewTab(null);
    });
  }, [translateX]);

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
    [animateBackToCenter, containerWidth, hasLeftTab, hasRightTab, navigateToTab, tab, translateX],
  );

  const previewMeta = previewTab ? TAB_META[previewTab] : null;

  const handleLayout = useCallback((event: any) => {
    const nextWidth = Math.max(1, Math.round(event?.nativeEvent?.layout?.width ?? 1));
    if (nextWidth !== containerWidth) {
      setContainerWidth(nextWidth);
    }
  }, [containerWidth]);

  return (
    <View style={styles.container} onLayout={handleLayout} {...panResponder.panHandlers}>
      {previewTab ? (
        <View pointerEvents="none" style={styles.previewLayer}>
          <AppSurfaceBackground />
          <View
            style={[
              styles.previewOverlay,
              { backgroundColor: isDark ? 'rgba(8,10,22,0.12)' : 'rgba(255,255,255,0.10)' },
            ]}
          />
          {previewMeta ? (
            <View style={styles.previewContent}>
              <View
                style={[
                  styles.previewFallback,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={[styles.previewIconWrap, { backgroundColor: colors.primarySoft }]}>
                  <Ionicons name={previewMeta.icon} size={28} color={colors.primary} />
                </View>
                <Text style={[styles.previewFallbackText, { color: colors.text }]}>
                  {t(previewMeta.labelKey)}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.currentLayer,
          previewTab ? styles.currentLayerRaised : null,
          { transform: [{ translateX }] },
        ]}
      >
        {children}
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
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  previewContent: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  previewFallback: {
    minWidth: 180,
    maxWidth: 280,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: 24,
    paddingVertical: 20,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  previewIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewFallbackText: {
    fontSize: 17,
    fontWeight: '700',
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
