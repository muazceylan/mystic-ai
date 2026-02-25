import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronDown, ChevronUp } from 'lucide-react-native';
import { useTheme } from '../../context/ThemeContext';
import type { CategoryGroup } from '../../services/match.api';
import TraitBar from './TraitBar';

export interface TraitCategoryCardProps {
  category: CategoryGroup;
  previewCount?: number;
  initiallyExpanded?: boolean;
}

export default function TraitCategoryCard({
  category,
  previewCount = 3,
  initiallyExpanded = false,
}: TraitCategoryCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(initiallyExpanded);

  const items = useMemo(() => {
    if (expanded) return category.items;
    return category.items.slice(0, previewCount);
  }, [category.items, expanded, previewCount]);

  const canExpand = category.items.length > previewCount;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>{category.title}</Text>
        <View style={[styles.badge, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          <Text style={[styles.badgeText, { color: colors.subtext }]}>{category.items.length}</Text>
        </View>
      </View>

      <View style={styles.itemsCol}>
        {items.map((axis) => (
          <TraitBar key={axis.id} axis={axis} />
        ))}
      </View>

      {canExpand ? (
        <Pressable
          style={[styles.expandBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
          onPress={() => setExpanded((v) => !v)}
        >
          {expanded ? (
            <ChevronUp size={14} color={colors.subtext} />
          ) : (
            <ChevronDown size={14} color={colors.subtext} />
          )}
          <Text style={[styles.expandText, { color: colors.subtext }]}>
            {expanded ? 'Daha az göster' : 'Tümünü gör'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: 13,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    minWidth: 26,
    height: 22,
    borderRadius: 999,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  itemsCol: {
    gap: 10,
  },
  expandBtn: {
    borderWidth: 1,
    borderRadius: 10,
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  expandText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
