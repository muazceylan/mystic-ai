import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { AccessibleText } from './ui';
import { ACCESSIBILITY } from '../constants/tokens';
import { getRelationshipPalette } from '../constants/compareDesignTokens';
import type { RelationshipType } from '../types/compare';
import { RELATIONSHIP_TYPE_LABELS } from '../types/compare';

interface RelationshipTypeChipsProps {
  value: RelationshipType;
  onChange: (type: RelationshipType) => void;
}

const TYPES: RelationshipType[] = ['love', 'work', 'friend', 'family', 'rival'];

export default function RelationshipTypeChips({ value, onChange }: RelationshipTypeChipsProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      keyboardShouldPersistTaps="handled"
    >
      {TYPES.map((type) => {
        const selected = type === value;
        const palette = getRelationshipPalette(type);

        return (
          <Pressable
            key={`relationship-chip-${type}`}
            onPress={() => {
              if (!selected) onChange(type);
            }}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? palette.surface : '#FFFFFF',
                borderColor: selected ? palette.border : '#E5DEEF',
              },
            ]}
            accessibilityRole="button"
            accessibilityLabel={`${RELATIONSHIP_TYPE_LABELS[type]} türünü seç`}
          >
            <View style={[styles.iconWrap, { backgroundColor: selected ? palette.accentSoft : '#F4F0FB' }]}>
              <AccessibleText
                style={styles.iconText}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {palette.icon}
              </AccessibleText>
            </View>

            <AccessibleText
              style={[styles.label, { color: selected ? palette.accent : '#3F3753' }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {RELATIONSHIP_TYPE_LABELS[type]}
            </AccessibleText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingVertical: 2,
    gap: 8,
  },
  chip: {
    minHeight: 44,
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
  },
  iconWrap: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 12,
    fontWeight: '700',
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});
