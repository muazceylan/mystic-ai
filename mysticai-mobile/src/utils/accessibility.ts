/**
 * Erişilebilirlik yardımcı fonksiyonları
 * - Screen reader bildirimleri
 * - Dynamic type (font scale) desteği
 */

import { AccessibilityInfo, PixelRatio, Platform } from 'react-native';

/** Sistem font ölçeği — Dynamic Type için (1.0 = varsayılan) */
export const getFontScale = (): number => {
  try {
    return PixelRatio.getFontScale?.() ?? 1;
  } catch {
    return 1;
  }
};

/** Ekran okuyucu için anons — değişen içeriklerde kullanılır */
export async function announceForAccessibility(message: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return;
    await AccessibilityInfo.announceForAccessibility(message);
  } catch {
    // Eski React Native sürümlerinde desteklenmeyebilir
  }
}

/** Screen reader aktif mi? */
export async function isScreenReaderEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isScreenReaderEnabled();
  } catch {
    return false;
  }
}

/** Reduce motion tercihi — animasyonları sadeleştirmek için */
export async function isReduceMotionEnabled(): Promise<boolean> {
  try {
    return await AccessibilityInfo.isReduceMotionEnabled();
  } catch {
    return false;
  }
}
