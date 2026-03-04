import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AccessibleText } from '../ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';
import type { AspectDTO } from '../../types/match';
import { localizeAspectName, localizeAspectType, localizeAstroText } from '../../utils/matchAstroLabels';

interface AspectItemProps {
  aspect: AspectDTO;
}

export default function AspectItem({ aspect }: AspectItemProps) {
  const { colors } = useTheme();
  const supportive = aspect.tone === 'DESTEKLEYICI';

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <View style={styles.rowTop}>
        <AccessibleText style={[styles.name, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {localizeAspectName(aspect.name, aspect.name)}
        </AccessibleText>
        <View
          style={[
            styles.toneBadge,
            {
              backgroundColor: supportive ? '#ECFDF3' : '#FFF1F2',
              borderColor: supportive ? '#BBF7D0' : '#FECDD3',
            },
          ]}
        >
          <AccessibleText
            style={[styles.toneBadgeText, { color: supportive ? '#166534' : '#9F1239' }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {supportive ? 'Destekleyici' : 'Zorlayıcı'}
          </AccessibleText>
        </View>
      </View>

      <AccessibleText style={[styles.theme, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        {localizeAstroText(aspect.theme, aspect.theme)}
      </AccessibleText>

      <View style={styles.metaRow}>
        <AccessibleText style={[styles.metaText, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          Orb: {aspect.orb.toFixed(1)}°
        </AccessibleText>
        {aspect.aspectType ? (
          <AccessibleText style={[styles.metaText, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Tür: {localizeAspectType(aspect.aspectType)}
          </AccessibleText>
        ) : null}
        {aspect.house ? (
          <AccessibleText style={[styles.metaText, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Ev: {aspect.house}
          </AccessibleText>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 8,
  },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  name: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  toneBadge: {
    minHeight: 24,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toneBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  theme: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
