import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface SecondaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function SecondaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  accessibilityHint,
}: SecondaryButtonProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const isDisabled = disabled || loading;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      style={[styles.button, isDisabled && styles.buttonDisabled, style]}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
    >
      {loading ? (
        <ActivityIndicator size="small" color={colors.primary} />
      ) : (
        <Text style={[styles.buttonText, isDisabled && styles.buttonTextDisabled]}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    button: {
      minHeight: 46,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    buttonDisabled: {
      borderColor: C.disabled,
      backgroundColor: C.surfaceAlt,
    },
    buttonText: {
      color: C.text,
      fontSize: 14,
      fontWeight: '600',
    },
    buttonTextDisabled: {
      color: C.disabledText,
    },
  });
}
