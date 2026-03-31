import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView, {
  type PagerViewOnPageSelectedEvent,
} from 'react-native-pager-view';

import HomeScreen from '../screens/HomeScreen';

/**
 * Named-export screen content components.
 * Each route file keeps its full implementation and exports it as a named
 * function; the default export returns `null` (content is rendered here).
 */
import { DiscoverScreenContent } from '../app/(tabs)/discover';
import { CalendarScreenContent } from '../app/(tabs)/calendar';
import { NatalChartScreenContent } from '../app/(tabs)/natal-chart';
import { ProfileScreenContent } from '../app/(tabs)/profile';
import { MAIN_TAB_ORDER } from './tabPagerConfig';

const PagerActivePageCtx = createContext<number>(0);

/**
 * Returns the currently active page index inside the MainTabPager.
 * Useful for replacing `useFocusEffect` in screens rendered by the pager.
 */
export function usePagerActivePage(): number {
  return useContext(PagerActivePageCtx);
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
            <View key={tab} style={styles.page} collapsable={false}>
              <PageContent index={idx} />
            </View>
          ))}
        </PagerView>
      </PagerActivePageCtx.Provider>
    );
  },
);

/**
 * Resolves the screen component for a given pager index.
 * Wrapped in React.memo so a page re-renders only when its own props change,
 * not when a sibling page updates state.
 */
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
