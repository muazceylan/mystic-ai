import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { AccessibleText } from './ui';
import { ACCESSIBILITY } from '../constants/tokens';
import { COMPARE_TYPOGRAPHY } from '../constants/compareDesignTokens';
import type { ThemeGroup } from '../types/compare';

interface ThemeSectionHeaderProps {
  themeGroup: ThemeGroup;
  score: number;
  totalCount: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

export default function ThemeSectionHeader({
  themeGroup,
  score,
  totalCount,
  isExpanded,
  onToggleExpand,
}: ThemeSectionHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.leftSide}>
        <AccessibleText
          style={styles.title}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {themeGroup}
        </AccessibleText>
        <View style={styles.scorePill}>
          <AccessibleText
            style={styles.scoreText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            %{score}
          </AccessibleText>
        </View>
      </View>

      {totalCount > 7 ? (
        <Pressable
          onPress={onToggleExpand}
          style={styles.toggleBtn}
          accessibilityRole="button"
          accessibilityLabel={isExpanded ? 'Temayı daralt' : 'Tema kartlarının tümünü gör'}
        >
          <AccessibleText
            style={styles.toggleText}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {isExpanded ? 'Daralt' : 'Tümü'}
          </AccessibleText>
          {isExpanded ? (
            <ChevronUp size={14} color="#6D28D9" />
          ) : (
            <ChevronDown size={14} color="#6D28D9" />
          )}
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 16,
  },
  leftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 1,
  },
  title: {
    ...COMPARE_TYPOGRAPHY.groupHeader,
    color: '#241F35',
  },
  scorePill: {
    minHeight: 26,
    borderRadius: 13,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EFE8FF',
    borderWidth: 1,
    borderColor: '#D9C9FB',
  },
  scoreText: {
    ...COMPARE_TYPOGRAPHY.groupMeta,
    color: '#5B21B6',
  },
  toggleBtn: {
    minHeight: 44,
    borderRadius: 20,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: '#F6F1FF',
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6D28D9',
  },
});
