import React from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';
import { SPACING, TYPOGRAPHY } from '../../../constants/tokens';
import { AccessibleText } from '../../../components/ui/AccessibleText';

interface Props {
  title: string;
}

export function SectionHeader({ title }: Props) {
  const { colors } = useTheme();

  return (
    <AccessibleText
      style={[styles.title, { color: colors.text }]}
      accessibilityRole="header"
    >
      {title}
    </AccessibleText>
  );
}

const styles = StyleSheet.create({
  title: {
    ...TYPOGRAPHY.H3,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.sm,
  },
});
