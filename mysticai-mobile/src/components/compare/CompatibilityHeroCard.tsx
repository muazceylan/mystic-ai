import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import type { CompareOverallDTO, RelationshipType } from '../../types/compare';
import { getRelationshipPalette } from '../../constants/compareDesignTokens';

interface CompatibilityHeroCardProps {
  relationshipType: RelationshipType;
  overall: CompareOverallDTO;
  moduleIntro: string;
}

export default function CompatibilityHeroCard({
  relationshipType,
  overall,
  moduleIntro,
}: CompatibilityHeroCardProps) {
  const palette = getRelationshipPalette(relationshipType);
  const safeScore = Number.isFinite(overall?.score) ? Math.max(0, Math.min(100, overall.score)) : 60;
  const safeLevelLabel = overall?.levelLabel?.trim() || 'Dengeli Uyum';
  const safeConfidenceLabel = overall?.confidenceLabel?.trim() || 'Orta';
  const safeModuleIntro =
    moduleIntro?.trim() || 'Bu modülde ilişki ritmi ve temel etkileşim başlıkları birlikte değerlendirilir.';

  return (
    <LinearGradient
      colors={[palette.surface, '#FFFFFF']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, { borderColor: palette.border }]}
    >
      <View style={styles.leftBlock}>
        <AccessibleText style={styles.title} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          Genel Uyum
        </AccessibleText>
        <AccessibleText style={[styles.score, { color: palette.accent }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          %{safeScore}
        </AccessibleText>
      </View>

      <View style={styles.rightBlock}>
        <View style={styles.badgesWrap}>
          <View style={[styles.badge, { borderColor: palette.border, backgroundColor: '#FFFFFF' }]}> 
            <AccessibleText style={styles.badgeText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {safeLevelLabel}
            </AccessibleText>
          </View>
          <View style={[styles.badge, { borderColor: palette.border, backgroundColor: '#FFFFFF' }]}> 
            <AccessibleText style={styles.badgeText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Veri Güveni: {safeConfidenceLabel}
            </AccessibleText>
          </View>
        </View>

        <AccessibleText style={styles.moduleIntro} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {safeModuleIntro}
        </AccessibleText>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
    shadowColor: '#2D0A5B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
  },
  leftBlock: {
    width: 110,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  rightBlock: {
    flex: 1,
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2A2140',
  },
  score: {
    fontSize: 45,
    lineHeight: 48,
    fontWeight: '900',
    letterSpacing: -1.2,
  },
  badgesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
  },
  badge: {
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 28,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3E3554',
  },
  moduleIntro: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4D4462',
    fontWeight: '600',
  },
});
