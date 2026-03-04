export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 28,
  screenPadding: 16,
  sectionGap: 20,
  cardGap: 12,
  cardPadding: 16,
  pillPaddingX: 14,
  pillPaddingY: 10,
  iconWrap: 42,
  chevronHitArea: 44,
} as const;

export type AppSpacing = typeof spacing;
