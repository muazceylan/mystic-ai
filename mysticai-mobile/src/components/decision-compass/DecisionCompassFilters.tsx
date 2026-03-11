import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import type { CompassFilter } from './model';
import { getCompassTokens } from './tokens';

interface DecisionCompassFiltersProps {
  dateLabel: string;
  selectedFilter: CompassFilter;
  onSelectFilter: (filter: CompassFilter) => void;
  onOpenCategories: () => void;
}

const FILTER_OPTIONS: Array<{ key: CompassFilter; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'ALL', label: 'Tümü', icon: 'apps-outline' },
  { key: 'BEST', label: 'En uygunlar', icon: 'checkmark-outline' },
  { key: 'CAUTION', label: 'Dikkat gerekenler', icon: 'alert-circle-outline' },
];

export function DecisionCompassFilters({
  dateLabel,
  selectedFilter,
  onSelectFilter,
  onOpenCategories,
}: DecisionCompassFiltersProps) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = styles(colors, isDark, T);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={S.row}
      style={S.wrap}
    >
      <LinearGradient colors={T.chip.defaultGradient} start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.8 }} style={[S.chipShell, S.dateShell]}>
        <View style={S.innerHighlight} />
        <View style={S.chip}>
          <Ionicons name="calendar-outline" size={16} color={T.text.subtitle} />
          <Text style={S.dateText}>{dateLabel}</Text>
        </View>
      </LinearGradient>

      {FILTER_OPTIONS.map((option) => {
        const selected = selectedFilter === option.key;
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelectFilter(option.key)}
            style={({ pressed }) => [S.chipShell, selected && S.selectedChipShell, pressed && S.pressed]}
          >
            <LinearGradient
              colors={selected ? T.chip.selectedGradient : T.chip.defaultGradient}
              start={{ x: 0, y: 0.3 }}
              end={{ x: 1, y: 0.8 }}
              style={S.gradientFill}
            >
              <View style={[S.innerHighlight, selected && S.selectedHighlight]} />
              <View style={S.chip}>
                <Ionicons name={option.icon} size={16} color={selected ? colors.primary : T.text.subtitle} />
                <Text style={[S.chipText, selected && S.selectedChipText]}>{option.label}</Text>
              </View>
            </LinearGradient>
          </Pressable>
        );
      })}

      <Pressable onPress={onOpenCategories} style={({ pressed }) => [S.chipShell, pressed && S.pressed]}>
        <LinearGradient colors={T.chip.actionGradient} start={{ x: 0, y: 0.3 }} end={{ x: 1, y: 0.8 }} style={S.gradientFill}>
          <View style={S.innerHighlight} />
          <View style={S.chip}>
            <Ionicons name="options-outline" size={15} color={colors.primary} />
            <Text style={S.manageText}>Kategoriler</Text>
          </View>
        </LinearGradient>
      </Pressable>
    </ScrollView>
  );
}

function styles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean, T: ReturnType<typeof getCompassTokens>) {
  return StyleSheet.create({
    wrap: {
      minHeight: 54,
    },
    row: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
      alignItems: 'center',
    },
    chipShell: {
      minHeight: 44,
      borderRadius: T.radii.chip,
      borderWidth: 1,
      borderColor: T.border.soft,
      overflow: 'hidden',
      ...T.shadows.soft,
    },
    gradientFill: {
      position: 'relative',
      overflow: 'hidden',
    },
    innerHighlight: {
      position: 'absolute',
      top: 1,
      left: 8,
      right: 8,
      height: 14,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.56)',
    },
    selectedHighlight: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.42)',
    },
    chip: {
      minHeight: 44,
      borderRadius: T.radii.chip,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: T.surface.soft,
    },
    dateShell: {
      minWidth: 132,
      justifyContent: 'center',
      position: 'relative',
    },
    selectedChipShell: {
      borderColor: T.border.hero,
    },
    dateText: {
      color: T.text.subtitle,
      fontSize: 14,
      fontWeight: '800',
    },
    chipText: {
      color: T.text.subtitle,
      fontSize: 13.8,
      fontWeight: '800',
    },
    selectedChipText: {
      color: C.primary,
    },
    manageText: {
      color: C.primary,
      fontSize: 13.8,
      fontWeight: '800',
    },
    pressed: {
      opacity: 0.84,
    },
  });
}
