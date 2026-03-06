import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, ViewStyle } from 'react-native';
import { useTheme } from '../../context/ThemeContext';

interface PrimaryButtonProps {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  accessibilityHint?: string;
}

export function PrimaryButton({
  title,
  onPress,
  disabled = false,
  loading = false,
  style,
  accessibilityHint,
}: PrimaryButtonProps) {
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
        <ActivityIndicator size="small" color={colors.white} />
      ) : (
        <Text style={styles.buttonText}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    button: {
      minHeight: 48,
      borderRadius: 999,
      backgroundColor: C.primary,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 20,
      shadowColor: C.shadow,
      shadowOpacity: 0.14,
      shadowOffset: { width: 0, height: 6 },
      shadowRadius: 14,
      elevation: 4,
    },
    buttonDisabled: {
      backgroundColor: C.disabled,
      shadowOpacity: 0,
      elevation: 0,
    },
    buttonText: {
      color: C.white,
      fontSize: 15,
      fontWeight: '700',
      letterSpacing: 0.2,
    },
  });
}
