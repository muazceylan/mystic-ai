/**
 * SpiritualListItem — Generic list row for Esma, Dua, Sure modules
 * Layout: [order number] [name + subtitle] [Arabic calligraphy]
 */
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { TYPOGRAPHY, SPACING, ACCESSIBILITY } from '../../constants/tokens';

export interface SpiritualListItemProps {
  order?: number;
  title: string;
  subtitle: string;
  arabicText?: string;
  accentColor: string;
  textColor: string;
  subtextColor: string;
  borderColor: string;
  onPress: () => void;
  accessibilityLabel?: string;
}

export function SpiritualListItem({
  order,
  title,
  subtitle,
  arabicText,
  accentColor,
  textColor,
  subtextColor,
  borderColor,
  onPress,
  accessibilityLabel,
}: SpiritualListItemProps) {
  return (
    <Pressable
      style={[styles.container, { borderBottomColor: borderColor }]}
      onPress={onPress}
      accessibilityLabel={accessibilityLabel ?? `${title} - ${subtitle}`}
    >
      <View style={styles.left}>
        {order != null && (
          <Text style={[styles.order, { color: accentColor }]}>{order}.</Text>
        )}
        <View style={styles.textBody}>
          <Text
            style={[styles.title, { color: textColor }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {title}
          </Text>
          <Text
            style={[styles.subtitle, { color: subtextColor }]}
            numberOfLines={2}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {subtitle}
          </Text>
        </View>
      </View>
      {arabicText ? (
        <Text style={[styles.arabic, { color: accentColor + 'CC' }]}>
          {arabicText}
        </Text>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  left: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: SPACING.sm,
  },
  order: {
    ...TYPOGRAPHY.SmallBold,
    minWidth: 28,
    marginTop: 2,
  },
  textBody: {
    flex: 1,
    gap: 2,
  },
  title: {
    ...TYPOGRAPHY.BodyBold,
  },
  subtitle: {
    ...TYPOGRAPHY.Caption,
    lineHeight: 17,
  },
  arabic: {
    fontSize: 18,
    fontWeight: '700',
    marginLeft: SPACING.sm,
  },
});
