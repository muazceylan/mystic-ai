import React, { ReactNode, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type SectionCardProps = {
  title: string;
  children: ReactNode;
  rightAction?: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
};

export function SectionCard({
  title,
  children,
  rightAction,
  collapsible,
  defaultExpanded = true,
}: SectionCardProps) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(defaultExpanded);

  const header = (
    <View style={styles.header}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <View style={styles.headerRight}>
        {rightAction}
        {collapsible ? (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={colors.subtext}
          />
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      {collapsible ? (
        <Pressable onPress={() => setExpanded((prev) => !prev)}>{header}</Pressable>
      ) : header}
      {expanded ? <View style={styles.body}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '800',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  body: {
    gap: 10,
  },
});
