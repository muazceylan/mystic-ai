import React from 'react';
import {
  KeyboardTypeOptions,
  NativeSyntheticEvent,
  StyleSheet,
  Text,
  TextInput,
  TextInputFocusEventData,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

interface TextFieldProps {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  editable?: boolean;
  onBlur?: (e: NativeSyntheticEvent<TextInputFocusEventData>) => void;
  passwordToggle?: {
    visible: boolean;
    onToggle: () => void;
  };
}

export function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  error,
  keyboardType,
  autoCapitalize = 'none',
  autoCorrect = false,
  secureTextEntry,
  editable = true,
  onBlur,
  passwordToggle,
}: TextFieldProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputWrap, !!error && styles.inputWrapError, !editable && styles.inputWrapDisabled]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.disabledText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={secureTextEntry}
          editable={editable}
          onBlur={onBlur}
          accessibilityLabel={label}
        />

        {passwordToggle && (
          <TouchableOpacity
            onPress={passwordToggle.onToggle}
            accessibilityRole="button"
            accessibilityLabel={passwordToggle.visible ? 'Hide password' : 'Show password'}
            style={styles.eyeButton}
          >
            <Ionicons
              name={passwordToggle.visible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.subtext}
            />
          </TouchableOpacity>
        )}
      </View>
      {!!error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      gap: 6,
    },
    label: {
      color: C.subtext,
      fontSize: 13,
      fontWeight: '500',
    },
    inputWrap: {
      minHeight: 48,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.inputBg,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
    },
    inputWrapError: {
      borderColor: C.error,
    },
    inputWrapDisabled: {
      opacity: 0.7,
    },
    input: {
      flex: 1,
      color: C.text,
      fontSize: 15,
      paddingVertical: 12,
    },
    eyeButton: {
      padding: 6,
      marginLeft: 8,
    },
    errorText: {
      color: C.error,
      fontSize: 12,
      lineHeight: 16,
    },
  });
}
