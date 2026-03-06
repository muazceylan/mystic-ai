import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import type { CompareDriverDTO, CompareTopDriversDTO } from '../../types/compare';

interface TopDriversPanelProps {
  drivers: CompareTopDriversDTO;
  onExpandDriver?: (type: 'supportive' | 'challenging' | 'growth', item: CompareDriverDTO) => void;
}

interface DriverBlockProps {
  title: string;
  item: CompareDriverDTO;
  type: 'supportive' | 'challenging' | 'growth';
  onExpand?: (type: 'supportive' | 'challenging' | 'growth', item: CompareDriverDTO) => void;
}

function styleByType(type: DriverBlockProps['type']) {
  if (type === 'supportive') {
    return { bg: '#ECFDF3', border: '#B7E7C8', title: '#166534' };
  }
  if (type === 'challenging') {
    return { bg: '#FFF1F2', border: '#F8C5CB', title: '#9F1239' };
  }
  return { bg: '#F4F2FF', border: '#D9CEFF', title: '#6D28D9' };
}

function DriverBlock({ title, item, type, onExpand }: DriverBlockProps) {
  const palette = styleByType(type);
  const safeTitle = item?.title?.trim() || 'Belirleyici Alan';
  const safeWhy = item?.why?.trim() || 'Bu başlıkta etki oluşturan belirgin bir sinyal görülüyor.';
  const safeHint = item?.hint?.trim() || 'Kısa ve düzenli rutinlerle bu başlıkta dengeyi koruyun.';
  const safeImpact = Number.isFinite(item?.impact) ? item.impact : 0;

  return (
    <Pressable
      style={[styles.block, { backgroundColor: palette.bg, borderColor: palette.border }]}
      onPress={() => onExpand?.(type, item)}
      accessibilityRole="button"
      accessibilityLabel={`${title}: ${safeTitle}`}
    >
      <AccessibleText style={[styles.blockTitle, { color: palette.title }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        {title}
      </AccessibleText>
      <AccessibleText style={styles.itemTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        {safeTitle}
      </AccessibleText>
      <AccessibleText style={styles.itemWhy} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        {safeWhy}
      </AccessibleText>
      <AccessibleText style={styles.itemHint} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        {safeHint}
      </AccessibleText>
      <AccessibleText style={styles.impact} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        Etki: {safeImpact}
      </AccessibleText>
    </Pressable>
  );
}

export default function TopDriversPanel({ drivers, onExpandDriver }: TopDriversPanelProps) {
  const supportive = drivers?.supportive?.[0];
  const challenging = drivers?.challenging?.[0];
  const growth = drivers?.growth?.[0];

  if (!supportive && !challenging && !growth) return null;

  return (
    <View style={styles.wrap}>
      <AccessibleText style={styles.sectionTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        Skoru Etkileyen 3 Nokta
      </AccessibleText>

      {supportive ? (
        <DriverBlock title="En Büyük Güç" item={supportive} type="supportive" onExpand={onExpandDriver} />
      ) : null}
      {challenging ? (
        <DriverBlock title="En Büyük Gerilim" item={challenging} type="challenging" onExpand={onExpandDriver} />
      ) : null}
      {growth ? (
        <DriverBlock title="En Çok Gelişecek Alan" item={growth} type="growth" onExpand={onExpandDriver} />
      ) : null}
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
  block: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    gap: 5,
  },
  blockTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#251E39',
  },
  itemWhy: {
    fontSize: 13,
    lineHeight: 18,
    color: '#40365A',
    fontWeight: '600',
  },
  itemHint: {
    fontSize: 12,
    lineHeight: 16,
    color: '#5A5171',
    fontWeight: '600',
  },
  impact: {
    fontSize: 11,
    color: '#6A6181',
    fontWeight: '700',
  },
});
