import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import type { DailyTransitsDTO } from '../../types/daily.types';

interface RetroListProps {
  items: DailyTransitsDTO['retrogrades'];
}

function riskColor(level: DailyTransitsDTO['retrogrades'][number]['riskLevel']) {
  if (level === 'High') return { text: '#B42318', bg: '#FEE4E2' };
  if (level === 'Med') return { text: '#B54708', bg: '#FEF0C7' };
  return { text: '#027A48', bg: '#D1FADF' };
}

export function RetroList({ items }: RetroListProps) {
  const { colors, isDark } = useTheme();

  if (!items.length) {
    return (
      <View style={[styles.empty, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
        <Text style={[styles.emptyText, { color: colors.subtext }]}>Bugün retro baskısı düşük görünüyor.</Text>
      </View>
    );
  }

  return (
    <View style={styles.listWrap}>
      {items.map((item) => {
        const risk = riskColor(item.riskLevel);
        return (
          <View
            key={`${item.planet}-${item.riskLevel}`}
            style={[
              styles.item,
              {
                borderColor: isDark ? 'rgba(255,255,255,0.12)' : '#EDE6FA',
                backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF',
              },
            ]}
          >
            <View style={styles.titleRow}>
              <View style={[styles.iconWrap, { backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : '#F2EBFF' }]}>
                <Ionicons name="repeat" size={14} color={colors.primary} />
              </View>
              <Text style={[styles.planet, { color: colors.text }]}>{item.planet}</Text>
              <View style={[styles.riskBadge, { backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : risk.bg }]}>
                <Text style={[styles.riskText, { color: isDark ? '#FFF' : risk.text }]}>{item.riskLevel}</Text>
              </View>
            </View>
            <Text style={[styles.meaning, { color: colors.subtext }]}>{item.meaningPlain}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  listWrap: {
    gap: SPACING.sm,
  },
  item: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.xsSm,
  },
  titleRow: {
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
  planet: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 14,
    flex: 1,
  },
  riskBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 3,
  },
  riskText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 11,
  },
  meaning: {
    ...TYPOGRAPHY.Small,
    fontSize: 14,
    lineHeight: 21,
  },
  empty: {
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  emptyText: {
    ...TYPOGRAPHY.Small,
    fontSize: 14,
  },
});

export default RetroList;
