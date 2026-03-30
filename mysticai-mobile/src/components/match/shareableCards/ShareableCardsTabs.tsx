import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleText } from '../../ui';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { radius, spacing } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import type { ShareableCardsTabItem, ShareableCardsTabKey } from './types';

interface ShareableCardsTabsProps {
  tabs: ShareableCardsTabItem[];
  selectedTab: ShareableCardsTabKey;
  onSelect: (tab: ShareableCardsTabKey) => void;
}

export function ShareableCardsTabs({
  tabs,
  selectedTab,
  onSelect,
}: ShareableCardsTabsProps) {
  const { colors } = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.content}
      style={styles.scroll}
    >
      {tabs.map((tab) => {
        const active = tab.key === selectedTab;

        return (
          <Pressable
            key={tab.key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={tab.label}
            onPress={() => onSelect(tab.key)}
            style={({ pressed }) => [
              styles.tab,
              active
                ? { backgroundColor: colors.violet, borderColor: colors.violet }
                : { backgroundColor: '#FFFFFF', borderColor: 'rgba(180, 165, 210, 0.40)' },
              pressed && styles.pressed,
            ]}
          >
            <Ionicons
              name={tab.iconName}
              size={15}
              color={active ? '#FFFFFF' : colors.violet}
            />
            <AccessibleText
              style={[
                styles.tabLabel,
                { color: active ? '#FFFFFF' : colors.text },
              ]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {tab.label}
            </AccessibleText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: -spacing.xs,
  },
  content: {
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  tab: {
    minHeight: 40,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
});
