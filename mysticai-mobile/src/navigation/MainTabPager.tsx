import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import PagerView, {
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';
import { usePathname } from 'expo-router';

import HomeScreen from '../screens/HomeScreen';
import { DiscoverScreenContent } from '../app/(tabs)/discover';
import { CalendarScreenContent } from '../app/(tabs)/calendar';
import { NatalChartScreenContent } from '../app/(tabs)/natal-chart';
import { ProfileScreenContent } from '../app/(tabs)/profile';
import { MAIN_TAB_ORDER, type MainTabRoute } from './tabPagerConfig';

const PagerActivePageCtx = createContext<number>(0);

export function usePagerActivePage(): number {
  return useContext(PagerActivePageCtx);
}

/**
 * Returns `true` when the given tab is the active pager page AND the
 * current top-level route.  Becomes `false` when a stack screen is
 * pushed on top (e.g. settings, detail) and `true` again on return.
 *
 * Drop-in replacement for the old `useFocusEffect` pattern.
 */
export function usePagerPageFocused(tab: MainTabRoute): boolean {
  const activePage = useContext(PagerActivePageCtx);
  const pathname = usePathname();
  const idx = MAIN_TAB_ORDER.indexOf(tab);
  if (activePage !== idx) return false;

  const segs = pathname.replace(/\/+$/, '').split('/');
  const tabsIdx = segs.indexOf('(tabs)');
  return tabsIdx >= 0 && segs[tabsIdx + 1] === tab;
}

export type MainTabPagerHandle = {
  setPage: (index: number) => void;
  setPageWithoutAnimation: (index: number) => void;
};

type MainTabPagerProps = {
  initialPage: number;
  onPageSelected: (index: number) => void;
};

/**
 * Core pager that renders the 5 main tab screens inside a native
 * `PagerView`.  Adjacent pages are pre-rendered by the native pager
 * (`offscreenPageLimit={1}`), so during a swipe the *real* neighbouring
 * screen is visible — no screenshots, no gradient placeholders.
 */
export const MainTabPager = forwardRef<MainTabPagerHandle, MainTabPagerProps>(
  function MainTabPager({ initialPage, onPageSelected }, ref) {
    const pagerRef = useRef<PagerView>(null);
    const [activePage, setActivePage] = useState(initialPage);

    useImperativeHandle(ref, () => ({
      setPage(index: number) {
        pagerRef.current?.setPage(index);
      },
      setPageWithoutAnimation(index: number) {
        pagerRef.current?.setPageWithoutAnimation(index);
      },
    }));

    const handlePageSelected = useCallback(
      (e: PagerViewOnPageSelectedEvent) => {
        const idx = e.nativeEvent.position;
        setActivePage(idx);
        onPageSelected(idx);
      },
      [onPageSelected],
    );

    return (
      <PagerActivePageCtx.Provider value={activePage}>
        <PagerView
          ref={pagerRef}
          style={styles.pager}
          initialPage={initialPage}
          offscreenPageLimit={1}
          overdrag={false}
          onPageSelected={handlePageSelected}
        >
          {MAIN_TAB_ORDER.map((tab, idx) => (
            <View
              key={tab}
              style={styles.page}
              collapsable={false}
              accessibilityElementsHidden={activePage !== idx}
              {...(Platform.OS === 'android' && {
                importantForAccessibility:
                  activePage === idx ? 'auto' : 'no-hide-descendants',
              })}
            >
              <PageContent index={idx} />
            </View>
          ))}
        </PagerView>
      </PagerActivePageCtx.Provider>
    );
  },
);

const PageContent = React.memo(function PageContent({ index }: { index: number }) {
  switch (index) {
    case 0:
      return <HomeScreen />;
    case 1:
      return <DiscoverScreenContent />;
    case 2:
      return <CalendarScreenContent />;
    case 3:
      return <NatalChartScreenContent />;
    case 4:
      return <ProfileScreenContent />;
    default:
      return null;
  }
});

const styles = StyleSheet.create({
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
});
