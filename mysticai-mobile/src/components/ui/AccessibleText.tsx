/**
 * Dynamic Type destekli erişilebilir Text bileşeni
 * maxFontSizeMultiplier ile layout kırılmasını önler, sistem font ayarlarını yansıtır
 */

import React from 'react';
import { Text, TextProps } from 'react-native';
import { ACCESSIBILITY } from '../../constants/tokens';

interface AccessibleTextProps extends TextProps {
  /** Özel maxFontSizeMultiplier (varsayılan: ACCESSIBILITY.maxFontSizeMultiplier) */
  maxFontSizeMultiplier?: number;
}

export function AccessibleText({
  maxFontSizeMultiplier = ACCESSIBILITY.maxFontSizeMultiplier,
  allowFontScaling = true,
  ...props
}: AccessibleTextProps) {
  return (
    <Text
      allowFontScaling={allowFontScaling}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      {...props}
    />
  );
}
