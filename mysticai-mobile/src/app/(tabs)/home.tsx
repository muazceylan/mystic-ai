import HomeScreen from '../../screens/HomeScreen';
import { usePagerReady } from '../../navigation/pagerContext';

/**
 * When PagerView is active, the real HomeScreen is rendered inside
 * MainTabPager.  This shell returns null to avoid double-mount.
 * Before PagerView is ready, renders HomeScreen as a fallback.
 */
export default function HomeRoute() {
  const pagerReady = usePagerReady();
  if (pagerReady) return null;
  return <HomeScreen />;
}
