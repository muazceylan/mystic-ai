import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { AllCategoriesFilter, CompassFilterOption } from './model';
import { DecisionCompassFilterPill } from './DecisionCompassFilterPill';

interface AllCategoriesFiltersProps {
  selectedFilter: AllCategoriesFilter;
  options: Array<CompassFilterOption<AllCategoriesFilter>>;
  onSelectFilter: (filter: AllCategoriesFilter) => void;
}

function resolveFilterTone(
  filter: AllCategoriesFilter,
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

export function AllCategoriesFilters({
  selectedFilter,
  options,
  onSelectFilter,
}: AllCategoriesFiltersProps) {
  const S = styles();

  return (
    <View style={S.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.row}>
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
      </ScrollView>
    </View>
  );
}

function styles() {
  return StyleSheet.create({
    wrap: {
      marginTop: 8,
      marginBottom: 18,
    },
    row: {
      paddingHorizontal: 20,
      paddingBottom: 2,
      gap: 10,
      alignItems: 'center',
    },
  });
}
