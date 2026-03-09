import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../../context/ThemeContext';

interface TutorialToggleRowProps {
  dontShowAgain: boolean;
  onToggleDontShowAgain: (value: boolean) => void;
  onReplay?: () => void;
}

export function TutorialToggleRow({ dontShowAgain, onToggleDontShowAgain, onReplay }: TutorialToggleRowProps) {
  const { colors, isDark } = useTheme();

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Rehberi tekrar göster"
        onPress={onReplay}
        disabled={!onReplay}
        style={({ pressed }) => [styles.item, !onReplay && styles.disabled, pressed && styles.pressed]}
      >
        <Ionicons name="refresh-circle-outline" size={20} color={isDark ? '#D9CCFF' : '#6F5DA0'} />
        <Text style={[styles.text, { color: colors.text }]}>Tekrar göster</Text>
      </Pressable>

      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: dontShowAgain }}
        accessibilityLabel="Bir daha gösterme"
        onPress={() => onToggleDontShowAgain(!dontShowAgain)}
        style={({ pressed }) => [styles.item, pressed && styles.pressed]}
      >
        <Ionicons
          name={dontShowAgain ? 'checkbox-outline' : 'square-outline'}
          size={20}
          color={dontShowAgain ? (isDark ? '#F8D989' : '#7B4DFF') : colors.textMuted}
        />
        <Text style={[styles.text, { color: colors.text }]}>Bir daha gösterme</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.18)',
    paddingTop: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  item: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.75,
  },
  disabled: {
    opacity: 0.45,
  },
});
