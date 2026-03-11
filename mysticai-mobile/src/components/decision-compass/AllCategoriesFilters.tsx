import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { getCompassTokens } from './tokens';

export type AllCategoriesFilter = 'ALL' | 'BEST' | 'CAUTION' | 'TODAY';

interface AllCategoriesFiltersProps {
  selectedFilter: AllCategoriesFilter;
  onSelectFilter: (filter: AllCategoriesFilter) => void;
  showLegend: boolean;
}

const FILTER_OPTIONS: Array<{
  key: AllCategoriesFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'ALL', label: 'Tümü', icon: 'checkmark-outline' },
  { key: 'BEST', label: 'En uygunlar', icon: 'sparkles-outline' },
  { key: 'CAUTION', label: 'Dikkat gerekenler', icon: 'shield-half-outline' },
  { key: 'TODAY', label: 'Bugün', icon: 'today-outline' },
];

const LEGEND_ITEMS = [
  { label: 'Güçlü fırsat', icon: 'sparkles-outline' as const, gradient: ['#F4EDFF', '#EEE3FF'] as [string, string], textColor: '#8A57D8' },
  { label: 'Destekleyici', icon: 'checkmark-circle-outline' as const, gradient: ['#EEE8FF', '#E5DFFF'] as [string, string], textColor: '#7B63C6' },
  { label: 'Dikkat', icon: 'alert-circle-outline' as const, gradient: ['#FFE7F0', '#FFEAF3'] as [string, string], textColor: '#B3537B' },
  { label: 'Beklet', icon: 'pause-circle-outline' as const, gradient: ['#F7ECFF', '#F2E4FF'] as [string, string], textColor: '#A066D0' },
];

export function AllCategoriesFilters({
  selectedFilter,
  onSelectFilter,
  showLegend,
}: AllCategoriesFiltersProps) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = styles(colors, isDark, T);

  return (
    <View style={S.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.row}>
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
      </ScrollView>

      {showLegend ? (
        <LinearGradient colors={T.gradients.section as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.legendShell}>
          <View pointerEvents="none" style={S.legendGlow} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.legendRow}>
            {LEGEND_ITEMS.map((item) => (
              <LinearGradient key={item.label} colors={item.gradient} start={{ x: 0, y: 0.2 }} end={{ x: 1, y: 0.8 }} style={S.legendPill}>
                <Ionicons name={item.icon} size={15} color={item.textColor} />
                <Text style={[S.legendText, { color: item.textColor }]}>{item.label}</Text>
              </LinearGradient>
            ))}
          </ScrollView>
        </LinearGradient>
      ) : null}
    </View>
  );
}

function styles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean, T: ReturnType<typeof getCompassTokens>) {
  return StyleSheet.create({
    wrap: {
      gap: 12,
      marginBottom: 18,
    },
    row: {
      paddingHorizontal: 20,
      gap: 10,
      alignItems: 'center',
    },
    chipShell: {
      minHeight: 50,
      borderRadius: T.radii.chip,
      borderWidth: 1,
      borderColor: T.border.soft,
      overflow: 'hidden',
      ...T.shadows.soft,
    },
    selectedChipShell: {
      borderColor: T.border.hero,
    },
    gradientFill: {
      position: 'relative',
      overflow: 'hidden',
    },
    innerHighlight: {
      position: 'absolute',
      top: 1,
      left: 10,
      right: 10,
      height: 16,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.56)',
    },
    selectedHighlight: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.44)',
    },
    chip: {
      minHeight: 50,
      borderRadius: T.radii.chip,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: T.surface.soft,
    },
    chipText: {
      color: T.text.subtitle,
      fontSize: 14.2,
      fontWeight: '800',
    },
    selectedChipText: {
      color: C.primary,
    },
    legendShell: {
      marginHorizontal: 20,
      borderRadius: 24,
      borderWidth: 1,
      borderColor: T.border.soft,
      paddingVertical: 10,
      overflow: 'hidden',
      position: 'relative',
      ...T.shadows.soft,
    },
    legendGlow: {
      position: 'absolute',
      top: -34,
      right: -24,
      width: 160,
      height: 80,
      borderRadius: 44,
      backgroundColor: isDark ? 'rgba(218,196,255,0.10)' : 'rgba(255,255,255,0.62)',
    },
    legendRow: {
      gap: 10,
      paddingHorizontal: 12,
      alignItems: 'center',
    },
    legendPill: {
      minHeight: 38,
      borderRadius: 999,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.66)',
    },
    legendText: {
      fontSize: 13.4,
      fontWeight: '700',
      letterSpacing: -0.1,
    },
    pressed: {
      opacity: 0.84,
    },
  });
}
