import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

type EmptyStateProps = {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ title, description, actionLabel, onAction }: EmptyStateProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <View style={[styles.iconWrap, { backgroundColor: colors.surfaceAlt }]}>
        <Ionicons name="sparkles-outline" size={22} color={colors.primary} />
      </View>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      <Text style={[styles.description, { color: colors.subtext }]}>{description}</Text>
      {actionLabel && onAction ? (
        <Pressable style={[styles.button, { backgroundColor: colors.primary }]} onPress={onAction}>
          <Text style={[styles.buttonText, { color: colors.white }]}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderRadius: 18,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  description: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
  button: {
    marginTop: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
