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
