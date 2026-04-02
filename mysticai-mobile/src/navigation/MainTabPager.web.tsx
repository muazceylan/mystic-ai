import React, {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';

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

function clampPage(index: number): number {
  if (!Number.isFinite(index)) return 0;
  return Math.min(MAIN_TAB_ORDER.length - 1, Math.max(0, Math.trunc(index)));
}

/**
 * Web fallback for MainTabPager.
 * Keeps the same external API as native PagerView but renders only
 * the active tab page with a lightweight view switch.
 */
export const MainTabPager = forwardRef<MainTabPagerHandle, MainTabPagerProps>(
  function MainTabPager({ initialPage, onPageSelected }, ref) {
    const [activePage, setActivePage] = useState(() => clampPage(initialPage));

    useEffect(() => {
      const next = clampPage(initialPage);
      setActivePage((prev) => (prev === next ? prev : next));
    }, [initialPage]);

    const goToPage = useCallback(
      (index: number) => {
        const next = clampPage(index);
        setActivePage((prev) => {
          if (prev === next) return prev;
          onPageSelected(next);
          return next;
        });
      },
      [onPageSelected],
    );

    useImperativeHandle(
      ref,
      () => ({
        setPage(index: number) {
          goToPage(index);
        },
        setPageWithoutAnimation(index: number) {
          goToPage(index);
        },
      }),
      [goToPage],
    );

    return (
      <PagerActivePageCtx.Provider value={activePage}>
        <View style={styles.pager}>
          {MAIN_TAB_ORDER.map((tab, idx) => (
            <View
              key={tab}
              style={[
                styles.page,
                idx === activePage ? styles.pageVisible : styles.pageHidden,
              ]}
              pointerEvents={idx === activePage ? 'auto' : 'none'}
            >
              <PageContent index={idx} />
            </View>
          ))}
        </View>
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
  pageVisible: {
    display: 'flex',
  },
  pageHidden: {
    display: 'none',
  },
});
