import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { CompassFilter, CompassFilterOption } from './model';
import { DecisionCompassFilterPill } from './DecisionCompassFilterPill';

function resolveFilterTone(
  filter: CompassFilter,
): NonNullable<React.ComponentProps<typeof DecisionCompassFilterPill>['tone']> {
  switch (filter) {
    case 'STRONG':
      return 'hero';
    case 'SUPPORTIVE':
      return 'supportive';
    case 'BALANCED':
      return 'balanced';
    case 'CAUTION':
    case 'HOLD':
      return 'caution';
    case 'ALL':
    default:
      return 'cosmic';
  }
}

interface DecisionCompassFiltersProps {
  dateLabel: string;
  selectedFilter: CompassFilter;
  options: Array<CompassFilterOption<CompassFilter>>;
  onSelectFilter: (filter: CompassFilter) => void;
  onOpenCategories: () => void;
}

export function DecisionCompassFilters({
  dateLabel,
  selectedFilter,
  options,
  onSelectFilter,
  onOpenCategories,
}: DecisionCompassFiltersProps) {
  const S = styles();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={S.row}
      style={S.wrap}
    >
      <DecisionCompassFilterPill
        label={dateLabel}
        meta="Takvim"
        iconName="calendar-outline"
        tone="cosmic"
        variant="date"
        minWidth={138}
      />

      {options.map((option) => {
        const selected = selectedFilter === option.key;
        return (
          <DecisionCompassFilterPill
            key={option.key}
            label={option.label}
            iconName={option.icon}
            tone={resolveFilterTone(option.key)}
            selected={selected}
            onPress={() => onSelectFilter(option.key)}
          />
        );
      })}

      <DecisionCompassFilterPill
        label="Kategoriler"
        meta="Görünürlük"
        iconName="options-outline"
        tone="cosmic"
        variant="action"
        onPress={onOpenCategories}
      />
    </ScrollView>
  );
}

function styles() {
  return StyleSheet.create({
    wrap: {
      minHeight: 58,
      marginTop: 8,
    },
    row: {
      paddingHorizontal: 16,
      paddingBottom: 12,
      gap: 10,
      alignItems: 'center',
    },
  });
}
