import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { SPACING } from '../../constants/tokens';
import { AppText } from './AppText';

export interface SectionProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  contentStyle?: ViewStyle;
  spacing?: 'compact' | 'default' | 'relaxed';
}

const GAP: Record<NonNullable<SectionProps['spacing']>, number> = {
  compact: SPACING.sm,
  default: SPACING.md,
  relaxed: SPACING.lgXl,
};

export function Section({
  title,
  subtitle,
  children,
  rightAction,
  style,
  contentStyle,
  spacing = 'default',
}: SectionProps) {
  const { colors } = useTheme();

  const hasHeader = !!(title || rightAction);

  return (
    <View style={[styles.container, { gap: GAP[spacing] }, style]}>
      {hasHeader ? (
        <View style={styles.header}>
          <View style={styles.headerText}>
            {title ? (
              <AppText variant="H3" color="primary">
                {title}
              </AppText>
            ) : null}
            {subtitle ? (
              <AppText variant="Small" color="secondary">
                {subtitle}
              </AppText>
            ) : null}
          </View>
          {rightAction}
        </View>
      ) : null}

      <View style={contentStyle}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: SPACING.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
});
