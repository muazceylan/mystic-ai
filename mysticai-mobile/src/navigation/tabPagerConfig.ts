import { Platform } from 'react-native';

/**
 * Ordered list of main tab routes shown in the bottom tab bar.
 * PagerView renders one page per tab in this order.
 */
export const MAIN_TAB_ORDER = [
  'home',
  'discover',
  'calendar',
  'natal-chart',
  'profile',
] as const;

export type MainTabRoute = (typeof MAIN_TAB_ORDER)[number];

export function isMainTab(routeName: string): boolean {
  return (MAIN_TAB_ORDER as readonly string[]).includes(routeName);
}

export function mainTabIndex(routeName: string): number {
  return (MAIN_TAB_ORDER as readonly string[]).indexOf(routeName);
}

export function mainTabAtIndex(index: number): MainTabRoute | undefined {
  return MAIN_TAB_ORDER[index];
}

/**
 * Gesture thresholds tuned per-platform.
 * Android needs slightly lower thresholds because PanResponder/GestureHandler
 * event frequency is lower on some devices.
 */
export const SWIPE_THRESHOLDS = Platform.select({
  ios: {
    /** Minimum horizontal delta to activate the pan gesture. */
    activateOffset: 20,
    /** Vertical delta that aborts the horizontal gesture (direction lock). */
    failOffset: 12,
    /** Fraction of screen width required to complete the page change. */
    progressThreshold: 0.3,
    /** Velocity (px/s) at which a flick completes the page regardless of distance. */
    velocityThreshold: 600,
    /** Minimum drag distance before velocity-based completion is considered. */
    minDragForVelocity: 40,
  },
  default: {
    activateOffset: 18,
    failOffset: 14,
    progressThreshold: 0.28,
    velocityThreshold: 500,
    minDragForVelocity: 35,
  },
})!;

/**
 * Spring configuration for the settle (snap-back / completion) animation.
 * Tuned for a natural, non-bouncy feel similar to Instagram.
 */
export const SETTLE_SPRING = {
  damping: 24,
  stiffness: 260,
  mass: 0.7,
  overshootClamping: false,
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 2,
} as const;

/**
 * Timing config for the fast completion animation when velocity is very high.
 */
export const FAST_SETTLE_DURATION_MS = Platform.select({
  ios: 180,
  default: 200,
})!;

/**
 * Rubber-band damping factor when dragging past the first/last tab.
 */
export const OVERSCROLL_RESISTANCE = 0.15;

/**
 * Duration after which the navigation lock resets (prevents double-navigation).
 */
export const NAVIGATION_LOCK_MS = 350;
