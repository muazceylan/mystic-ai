import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import type { CompareThemeSectionV3DTO } from '../../types/compare';

interface ThemeSectionListProps {
  sections: CompareThemeSectionV3DTO[];
}

export default function ThemeSectionList({ sections }: ThemeSectionListProps) {
  const safeSections = Array.isArray(sections)
    ? sections.filter(
        (section) =>
          Boolean(section?.theme?.trim()) &&
          ((Array.isArray(section.cards) && section.cards.length > 0) || Boolean(section?.miniInsight?.trim())),
      )
    : [];

  if (!safeSections.length) return null;

  return (
    <View style={styles.wrap}>
      <AccessibleText style={styles.sectionTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        Tema Kartları
      </AccessibleText>

      {safeSections.map((section) => (
        <View key={`${section.theme}-${section.score}`} style={styles.sectionCard}>
          <View style={styles.sectionHead}>
            <AccessibleText style={styles.themeTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {section.theme || 'Tema'}
            </AccessibleText>
            <AccessibleText style={styles.themeScore} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              %{section.score}
            </AccessibleText>
          </View>

          <AccessibleText style={styles.miniInsight} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {section.miniInsight || 'Bu tema başlığında dengeyi koruyan bir akış görülüyor.'}
          </AccessibleText>

          {(section.cards ?? []).filter((card) => Boolean(card?.title?.trim())).map((card, index) => (
            <View key={`${section.theme}-card-${index}`} style={styles.innerCard}>
              <AccessibleText style={styles.innerTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {card.title || 'Tema Kartı'}
              </AccessibleText>
              <AccessibleText style={styles.innerBody} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {card.description || 'Bu başlıkta davranış ritmini netleştirmek ilişki akışını destekler.'}
              </AccessibleText>
              <AccessibleText style={styles.innerHint} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Öneri: {card.actionHint || 'Kısa bir rutinle beklentiyi netleştirin.'}
              </AccessibleText>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#231C37',
    letterSpacing: -0.2,
  },
  sectionCard: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E0F1',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  themeTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#271F3B',
  },
  themeScore: {
    fontSize: 16,
    fontWeight: '900',
    color: '#5B21B6',
  },
  miniInsight: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4F4666',
    fontWeight: '600',
  },
  innerCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEE6FA',
    backgroundColor: '#FBF9FF',
    padding: 9,
    gap: 4,
  },
  innerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2C2342',
  },
  innerBody: {
    fontSize: 12,
    lineHeight: 17,
    color: '#544A6D',
    fontWeight: '600',
  },
  innerHint: {
    fontSize: 12,
    lineHeight: 16,
    color: '#433A5A',
    fontWeight: '700',
  },
});
