import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AccessibleText } from './ui';
import { ACCESSIBILITY } from '../constants/tokens';
import { COMPARE_TYPOGRAPHY, getCompareBadgePalette } from '../constants/compareDesignTokens';
import type { ComparisonCardDTO } from '../types/compare';

interface ComparisonCardProps {
  card: ComparisonCardDTO;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '•';
  if (parts.length === 1) return parts[0][0]?.toUpperCase() ?? '•';
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function ComparisonCard({ card }: ComparisonCardProps) {
  const badge = getCompareBadgePalette(card.label);

  const { leftValue, rightValue } = useMemo(() => {
    const left = clamp(card.leftValue ?? 50, 0, 100);
    const right = clamp(card.rightValue ?? 100 - left, 0, 100);
    const normalizedTotal = left + right || 100;
    return {
      leftValue: Math.round((left / normalizedTotal) * 100),
      rightValue: Math.round((right / normalizedTotal) * 100),
    };
  }, [card.leftValue, card.rightValue]);

  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <AccessibleText
          style={styles.cardTitle}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {card.title}
        </AccessibleText>

        <View
          style={[
            styles.badge,
            {
              backgroundColor: badge.bg,
              borderColor: badge.border,
            },
          ]}
        >
          <AccessibleText
            style={[styles.badgeText, { color: badge.text }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {card.label}
          </AccessibleText>
        </View>
      </View>

      <View style={styles.columnsRow}>
        <View style={styles.sideColumn}>
          <View style={styles.nameRow}>
            <View style={styles.initialBubble}>
              <AccessibleText
                style={styles.initialText}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {initials(card.leftPerson.name)}
              </AccessibleText>
            </View>
            <AccessibleText
              style={styles.personName}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {card.leftPerson.name}
            </AccessibleText>
          </View>
          <AccessibleText
            style={styles.traitText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {card.leftPerson.trait}
          </AccessibleText>
        </View>

        <View
          style={[
            styles.centerBubble,
            {
              backgroundColor: badge.soft,
              borderColor: badge.border,
            },
          ]}
        >
          <AccessibleText
            style={styles.intersectionText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {card.intersection.plain}
          </AccessibleText>
        </View>

        <View style={styles.sideColumn}>
          <View style={[styles.nameRow, styles.rightNameRow]}>
            <AccessibleText
              style={styles.personName}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {card.rightPerson.name}
            </AccessibleText>
            <View style={styles.initialBubble}>
              <AccessibleText
                style={styles.initialText}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {initials(card.rightPerson.name)}
              </AccessibleText>
            </View>
          </View>
          <AccessibleText
            style={[styles.traitText, styles.rightTraitText]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {card.rightPerson.trait}
          </AccessibleText>
        </View>
      </View>

      <View style={styles.barWrap}>
        <View style={styles.barTrack}>
          <View style={[styles.leftBar, { flex: leftValue, backgroundColor: '#A78BFA' }]} />
          <View style={[styles.rightBar, { flex: rightValue, backgroundColor: '#DDD6FE' }]} />
        </View>
        <View style={styles.barLabels}>
          <AccessibleText
            style={styles.barLabelText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {card.leftPerson.name} %{leftValue}
          </AccessibleText>
          <AccessibleText
            style={styles.barLabelText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {card.rightPerson.name} %{rightValue}
          </AccessibleText>
        </View>
      </View>

      <AccessibleText
        style={styles.adviceText}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {card.advicePlain}
      </AccessibleText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E7E0F1',
    padding: 12,
    shadowColor: '#2D0A5B',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    gap: 10,
  },
  cardHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: {
    ...COMPARE_TYPOGRAPHY.cardTitle,
    color: '#1F1A2E',
    flex: 1,
  },
  badge: {
    minHeight: 28,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  columnsRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  sideColumn: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  centerBubble: {
    flex: 1.2,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  rightNameRow: {
    justifyContent: 'flex-end',
  },
  initialBubble: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EFE8FF',
    borderWidth: 1,
    borderColor: '#DCCBFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#5B21B6',
  },
  personName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#2E2642',
  },
  traitText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#443A5C',
    fontWeight: '600',
  },
  rightTraitText: {
    textAlign: 'right',
  },
  intersectionText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#2E2642',
    fontWeight: '700',
  },
  barWrap: {
    gap: 4,
  },
  barTrack: {
    minHeight: 8,
    borderRadius: 999,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#DDD1F8',
    flexDirection: 'row',
  },
  leftBar: {
    height: 8,
  },
  rightBar: {
    height: 8,
  },
  barLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  barLabelText: {
    fontSize: 11,
    color: '#6A6280',
    fontWeight: '700',
  },
  adviceText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#372F4B',
    fontWeight: '700',
  },
});
