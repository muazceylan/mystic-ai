/**
 * Tasarım tokenları — tipografi, spacing, radius
 * UI tutarlılığı için merkezi değerler.
 * Bileşenlerde hardcoded fontSize/margin/padding yerine bu tokenları kullanın.
 */

export const TYPOGRAPHY = {
  H1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  H2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  H3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  Display: { fontSize: 26, fontWeight: '700' as const, lineHeight: 32 },
  Lead: { fontSize: 21, fontWeight: '800' as const, lineHeight: 30 },
  BodyLarge: { fontSize: 17, fontWeight: '800' as const, lineHeight: 24 },
  Body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  BodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  BodyMid: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  Small: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  SmallBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  SmallAlt: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  Caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
  CaptionBold: { fontSize: 12, fontWeight: '700' as const, lineHeight: 18 },
  CaptionSmall: { fontSize: 11, fontWeight: '600' as const, lineHeight: 16 },
  CaptionXS: { fontSize: 10, fontWeight: '400' as const, lineHeight: 14 },
};

/** 4pt grid — xs, sm, md, lg, xl */
export const SPACING = {
  xs: 4,
  xsSm: 6,
  sm: 8,
  smMd: 10,
  md: 12,
  mdLg: 14,
  lg: 16,
  lgXl: 20,
  xl: 24,
  xxl: 32,
};

/** Border radius tokenları */
export const RADIUS = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 999,
};

/** Gölge tokenları — sm, md, lg */
export const SHADOW = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 6,
  },
} as const;

/**
 * Erişilebilirlik — Dynamic Type, screen reader
 * maxFontSizeMultiplier: Sistem font ölçeğinde üst sınır (2.0 önerilir — layout kırılmadan erişilebilirlik)
 */
export const ACCESSIBILITY = {
  /** Metin bileşenlerinde maxFontSizeMultiplier — iOS/Android Larger Text desteği */
  maxFontSizeMultiplier: 2.0,
  /** Minimum dokunma hedefi (px) */
  minTouchTarget: 44,
  /** Canlı bölge tipleri — dinamik içerik güncellemelerinde screen reader bildirimi */
  liveRegion: {
    polite: 'polite' as const,
    assertive: 'assertive' as const,
  },
};
