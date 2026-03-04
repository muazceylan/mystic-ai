import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, typography } from '../../theme';

interface PersonalSnapshotRowProps {
  sign?: string;
  moonSign?: string;
  asc?: string;
}

export function PersonalSnapshotRow({ sign, moonSign, asc }: PersonalSnapshotRowProps) {
  if (!sign || !moonSign || !asc) {
    return null;
  }

  return (
    <View
      style={styles.container}
      accessibilityLabel={`Kişisel özet. Güneş ${sign}, Ay ${moonSign}, Yükselen ${asc}`}
    >
      <View style={styles.item}>
        <Ionicons name="sunny-outline" size={13} color={colors.primary} />
        <Text numberOfLines={1} style={styles.text}>{`Güneş: ${sign}`}</Text>
      </View>

      <Text style={styles.separator}>•</Text>

      <View style={styles.item}>
        <Ionicons name="moon-outline" size={13} color={colors.primary} />
        <Text numberOfLines={1} style={styles.text}>{`Ay: ${moonSign}`}</Text>
      </View>

      <Text style={styles.separator}>•</Text>

      <View style={styles.item}>
        <Ionicons name="arrow-up-circle-outline" size={13} color={colors.primary} />
        <Text numberOfLines={1} style={styles.text}>{`Yükselen: ${asc}`}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: spacing.xl,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(255,255,255,0.82)',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  separator: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 16,
    marginHorizontal: 2,
  },
  text: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
});
