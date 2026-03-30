import React, { memo } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Mood } from '../types';

const MOODS: Array<{ key: Mood; labelKey: string; emoji: string }> = [
  { key: 'SAKIN', labelKey: 'moodSelector.sakin', emoji: '😌' },
  { key: 'SUKURLU', labelKey: 'moodSelector.sukurlu', emoji: '🤲' },
  { key: 'MUTLU', labelKey: 'moodSelector.mutlu', emoji: '😊' },
  { key: 'ODAKLI', labelKey: 'moodSelector.odakli', emoji: '🎯' },
  { key: 'YORGUN', labelKey: 'moodSelector.yorgun', emoji: '😮‍💨' },
  { key: 'GERGIN', labelKey: 'moodSelector.gergin', emoji: '😤' },
  { key: 'DIGER', labelKey: 'moodSelector.diger', emoji: '🌀' },
];

interface Props {
  selected?: Mood;
  onSelect: (mood: Mood) => void;
  accentColor?: string;
  textColor?: string;
}

export const MoodSelector = memo(function MoodSelector({
  selected,
  onSelect,
  accentColor = '#4CAF50',
  textColor = '#111',
}: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {MOODS.map((m) => {
        const isSelected = selected === m.key;
        return (
          <Pressable
            key={m.key}
            onPress={() => onSelect(m.key)}
            style={[
              styles.chip,
              isSelected && { backgroundColor: accentColor + '22', borderColor: accentColor },
            ]}
          >
            <Text style={styles.emoji}>{m.emoji}</Text>
            <Text style={[styles.label, { color: isSelected ? accentColor : textColor }]}>
              {t(m.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});

const styles = StyleSheet.create({
  container: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  emoji: { fontSize: 14 },
  label: { fontSize: 12, fontWeight: '600' },
});
