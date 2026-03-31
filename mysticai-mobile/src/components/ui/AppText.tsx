import React from 'react';
import { StyleSheet, TextStyle } from 'react-native';
import { AccessibleText } from './AccessibleText';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY } from '../../constants/tokens';

export type TypographyVariant = keyof typeof TYPOGRAPHY;

type SemanticColor =
  | 'primary'
  | 'secondary'
  | 'muted'
  | 'error'
  | 'success'
  | 'warning'
  | 'accent'
  | 'inverse';

const SEMANTIC_MAP: Record<SemanticColor, (c: ThemeColors) => string> = {
  primary: (c) => c.text,
  secondary: (c) => c.subtext,
  muted: (c) => c.textMuted,
  error: (c) => c.error,
  success: (c) => c.success,
  warning: (c) => c.warning,
  accent: (c) => c.primary,
  inverse: (c) => c.white,
};

const DEFAULT_COLOR_MAP: Record<string, SemanticColor> = {
  H1: 'primary',
  H2: 'primary',
  H3: 'primary',
  Display: 'primary',
  Lead: 'primary',
  BodyLarge: 'primary',
  Body: 'primary',
  BodyBold: 'primary',
  BodyMid: 'secondary',
  Small: 'secondary',
  SmallBold: 'secondary',
  SmallAlt: 'secondary',
  Caption: 'muted',
  CaptionBold: 'muted',
  CaptionSmall: 'muted',
  CaptionXS: 'muted',
};

export interface AppTextProps extends Omit<React.ComponentProps<typeof AccessibleText>, 'maxFontSizeMultiplier'> {
  variant?: TypographyVariant;
  color?: SemanticColor | string;
  align?: 'left' | 'center' | 'right';
  weight?: TextStyle['fontWeight'];
  maxFontSizeMultiplier?: number;
}

export function AppText({
  variant = 'Body',
  color,
  align,
  weight,
  style,
  children,
  ...rest
}: AppTextProps) {
  const { colors } = useTheme();
  const typo = TYPOGRAPHY[variant];

  let resolvedColor: string;
  if (!color) {
    const semantic = DEFAULT_COLOR_MAP[variant] ?? 'primary';
    resolvedColor = SEMANTIC_MAP[semantic](colors);
  } else if (color in SEMANTIC_MAP) {
    resolvedColor = SEMANTIC_MAP[color as SemanticColor](colors);
  } else {
    resolvedColor = color;
  }

  const merged: TextStyle[] = [
    typo as TextStyle,
    { color: resolvedColor },
    align ? { textAlign: align } : undefined,
    weight ? { fontWeight: weight } : undefined,
    style as TextStyle,
  ].filter(Boolean) as TextStyle[];

  return (
    <AccessibleText style={StyleSheet.flatten(merged)} {...rest}>
      {children}
    </AccessibleText>
  );
}
