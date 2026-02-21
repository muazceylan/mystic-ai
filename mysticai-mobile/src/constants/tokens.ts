/**
 * Tasarım tokenları — tipografi, spacing, radius
 * UI tutarlılığı için merkezi değerler.
 */

export const TYPOGRAPHY = {
  H1: { fontSize: 28, fontWeight: '700' as const, lineHeight: 34 },
  H2: { fontSize: 22, fontWeight: '700' as const, lineHeight: 28 },
  H3: { fontSize: 18, fontWeight: '600' as const, lineHeight: 24 },
  Body: { fontSize: 16, fontWeight: '400' as const, lineHeight: 24 },
  BodyBold: { fontSize: 16, fontWeight: '600' as const, lineHeight: 24 },
  Small: { fontSize: 14, fontWeight: '400' as const, lineHeight: 20 },
  SmallBold: { fontSize: 14, fontWeight: '600' as const, lineHeight: 20 },
  Caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
};

/** 4pt grid — xs, sm, md, lg */
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
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
