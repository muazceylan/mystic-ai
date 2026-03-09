import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

type CharacterInsightCardProps = {
  characterTraitsText?: string | null;
  letterAnalysisText?: string | null;
};

export function CharacterInsightCard({ characterTraitsText, letterAnalysisText }: CharacterInsightCardProps) {
  const { colors } = useTheme();
  if (!characterTraitsText && !letterAnalysisText) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      {characterTraitsText ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.subtext }]}>Karakter Analizi</Text>
          <Text style={[styles.value, { color: colors.text }]}>{characterTraitsText}</Text>
        </View>
      ) : null}
      {letterAnalysisText ? (
        <View style={styles.section}>
          <Text style={[styles.label, { color: colors.subtext }]}>Harf Analizi</Text>
          <Text style={[styles.value, { color: colors.text }]}>{letterAnalysisText}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    gap: 12,
  },
  section: {
    gap: 4,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  value: {
    fontSize: 14,
    lineHeight: 20,
  },
});
