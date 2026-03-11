import React from 'react';
import { ScrollView, StyleSheet, ViewStyle } from 'react-native';
import { usePathname } from 'expo-router';
import { SafeAreaView, Edge } from 'react-native-safe-area-context';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { AppSurfaceBackground } from './AppSurfaceBackground';
import { isStandardSurfaceRoute } from './surfaceUtils';

interface ScreenProps {
  children: React.ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  style?: ViewStyle;
}

export function Screen({
  children,
  scroll = false,
  edges = ['top', 'left', 'right'],
  style,
}: ScreenProps) {
  const { colors } = useTheme();
  const pathname = usePathname();
  const s = createStyles(colors);
  const standardBackgroundEnabled = isStandardSurfaceRoute(pathname);

  if (scroll) {
    return (
      <SafeAreaView style={[s.container, style]} edges={edges}>
        {standardBackgroundEnabled ? <AppSurfaceBackground /> : null}
        <ScrollView
          contentContainerStyle={s.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[s.container, style]} edges={edges}>
      {standardBackgroundEnabled ? <AppSurfaceBackground /> : null}
      {children}
    </SafeAreaView>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'transparent',
    },
    scrollContent: {
      flexGrow: 1,
      padding: 16,
      gap: 12,
    },
  });
}
