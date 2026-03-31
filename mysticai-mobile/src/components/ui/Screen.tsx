import React from 'react';
import type { ViewStyle } from 'react-native';
import type { Edge } from 'react-native-safe-area-context';
import { SafeScreen } from './SafeScreen';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  style?: ViewStyle;
}

/**
 * @deprecated SafeScreen ile degistirin. SafeScreen ayni API'yi sunar,
 * ek olarak showStandardBackground, tab bar offset ve web layout destegi saglar.
 *
 * Migration: `<Screen ...>` -> `<SafeScreen ...>`
 */
export function Screen({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  style,
}: ScreenProps) {
  return (
    <SafeScreen
      scroll={scroll}
      edges={edges}
      style={style}
    >
      {children}
    </SafeScreen>
  );
}
