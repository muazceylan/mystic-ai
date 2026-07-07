import type React from 'react';

export type MainTabPagerHandle = {
  setPage: (index: number) => void;
  setPageWithoutAnimation: (index: number) => void;
};

type MainTabPagerProps = {
  initialPage: number;
  onPageSelected: (index: number) => void;
};

export declare function usePagerActivePage(): number;

export declare const MainTabPager: React.ForwardRefExoticComponent<
  MainTabPagerProps & React.RefAttributes<MainTabPagerHandle>
>;
