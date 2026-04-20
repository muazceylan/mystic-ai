import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

const MAX_BROWSER_CHROME_INSET = 96;

function readWebViewportBottomInset(): number {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof document === 'undefined') {
    return 0;
  }

  const visualViewport = window.visualViewport;
  if (!visualViewport) return 0;

  const layoutViewportHeight = Math.max(
    window.innerHeight,
    document.documentElement?.clientHeight ?? 0,
  );
  const visibleViewportBottom = visualViewport.height + visualViewport.offsetTop;
  const obscuredBottomInset = layoutViewportHeight - visibleViewportBottom;

  return Math.max(0, Math.min(MAX_BROWSER_CHROME_INSET, Math.round(obscuredBottomInset)));
}

/**
 * Mobile browsers like iOS Safari can overlay bottom chrome on top of fixed UI.
 * This hook measures the hidden portion of the layout viewport so sticky/fixed
 * bottom bars can reserve enough space for labels and icons to stay visible.
 */
export function useWebViewportBottomInset(): number {
  const [bottomInset, setBottomInset] = useState(() => readWebViewportBottomInset());

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      return undefined;
    }

    const visualViewport = window.visualViewport;
    const updateInset = () => {
      setBottomInset(readWebViewportBottomInset());
    };

    updateInset();

    window.addEventListener('resize', updateInset);
    window.addEventListener('orientationchange', updateInset);
    visualViewport?.addEventListener('resize', updateInset);
    visualViewport?.addEventListener('scroll', updateInset);

    return () => {
      window.removeEventListener('resize', updateInset);
      window.removeEventListener('orientationchange', updateInset);
      visualViewport?.removeEventListener('resize', updateInset);
      visualViewport?.removeEventListener('scroll', updateInset);
    };
  }, []);

  return bottomInset;
}
