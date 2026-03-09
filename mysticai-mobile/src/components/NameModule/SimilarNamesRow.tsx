import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import type { NameListItem } from '../../services/name.service';

type SimilarNamesRowProps = {
  items: NameListItem[];
  onItemPress: (item: NameListItem, index: number) => void;
};

export function SimilarNamesRow({ items, onItemPress }: SimilarNamesRowProps) {
  const { colors } = useTheme();
  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {items.map((item, index) => (
          <TouchableOpacity
            key={item.id}
            onPress={() => onItemPress(item, index)}
            style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            activeOpacity={0.85}
          >
            <Text style={[styles.name, { color: colors.text }]}>{item.name}</Text>
            {item.meaningShort ? (
              <Text style={[styles.meaning, { color: colors.subtext }]} numberOfLines={2}>
                {item.meaningShort}
              </Text>
            ) : null}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  row: {
    gap: 10,
    paddingRight: 6,
  },
  card: {
    borderWidth: 1,
    borderRadius: 12,
    width: 170,
    padding: 10,
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: '800',
  },
  meaning: {
    fontSize: 12,
    lineHeight: 17,
  },
});
