import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
  const scrollRef = React.useRef<ScrollView>(null);

  React.useEffect(() => {
    requestAnimationFrame(() => {
      if (selectedTab === 'numerology') {
        scrollRef.current?.scrollToEnd({ animated: true });
        return;
      }

      if (selectedTab === 'compatibility') {
        scrollRef.current?.scrollTo({ x: 0, animated: true });
      }
    });
  }, [selectedTab]);

  return (
    <ScrollView
      ref={scrollRef}
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
              styles.tabShell,
              active ? styles.activeTabShadow : undefined,
              pressed && styles.pressed,
            ]}
          >
            {active ? (
              <LinearGradient
                colors={['#8B4DFF', '#5F24D6']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.tab, styles.activeTab]}
              >
                <TabContent
                  iconName={tab.iconName}
                  label={tab.label}
                  iconColor="#FFFFFF"
                  labelColor="#FFFFFF"
                />
              </LinearGradient>
            ) : (
              <View
                style={[
                  styles.tab,
                  styles.inactiveTab,
                  { borderColor: 'rgba(180, 165, 210, 0.40)' },
                ]}
              >
                <TabContent
                  iconName={tab.iconName}
                  label={tab.label}
                  iconColor={colors.violet}
                  labelColor={colors.text}
                />
              </View>
            )}
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

interface TabContentProps {
  iconName: ShareableCardsTabItem['iconName'];
  label: string;
  iconColor: string;
  labelColor: string;
}

function TabContent({ iconName, label, iconColor, labelColor }: TabContentProps) {
  return (
    <>
      <Ionicons
        name={iconName}
        size={15}
        color={iconColor}
      />
      <AccessibleText
        style={[styles.tabLabel, { color: labelColor }]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {label}
      </AccessibleText>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginHorizontal: 0,
    overflow: 'visible',
  },
  content: {
    gap: spacing.sm,
    paddingLeft: spacing.xs,
    paddingRight: spacing.screenPadding + spacing.md,
    paddingVertical: spacing.xs,
  },
  tabShell: {
    borderRadius: radius.pill,
  },
  activeTabShadow: {
    shadowColor: '#5F24D6',
    shadowOpacity: 0.26,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 14,
    elevation: 5,
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
  activeTab: {
    borderColor: 'rgba(255,255,255,0.26)',
  },
  inactiveTab: {
    backgroundColor: 'rgba(255,255,255,0.86)',
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
