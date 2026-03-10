import { Platform } from 'react-native';

/**
 * Shared spacing baseline for inner/detail page headers.
 * Safe area is handled by SafeScreen, so we keep top spacing compact and consistent.
 */
export function useInnerHeaderSpacing() {
  return {
    headerPaddingTop: Platform.OS === 'web' ? 20 : 8,
    headerPaddingBottom: 10,
    headerHorizontalPadding: 16,
  };
}

