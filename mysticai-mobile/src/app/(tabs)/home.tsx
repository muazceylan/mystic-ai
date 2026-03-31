/**
 * Route shell — content is rendered by MainTabPager (PagerView).
 * Returning null prevents double-mount; the real HomeScreen lives
 * inside the pager at page index 0.
 */
export default function HomeRoute() {
  return null;
}
