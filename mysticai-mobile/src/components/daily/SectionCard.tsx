import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';

interface SectionCardProps {
  title: string;
  icon?: keyof typeof Ionicons.glyphMap;
  children: React.ReactNode;
}

export function SectionCard({ title, icon = 'sparkles', children }: SectionCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
          borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#EBE5F8',
          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#F3ECFF' }]}>
          <Ionicons name={icon} size={14} color={colors.primary} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.md,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    ...TYPOGRAPHY.BodyBold,
    fontSize: 21,
    lineHeight: 28,
  },
});

export default SectionCard;
