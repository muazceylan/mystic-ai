import React, { forwardRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, ACCESSIBILITY } from '../../constants/tokens';
import { AppText } from './AppText';

export interface TextFieldProps {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string | null;
  helperText?: string;
  keyboardType?: TextInputProps['keyboardType'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  secureTextEntry?: boolean;
  editable?: boolean;
  multiline?: boolean;
  numberOfLines?: number;
  onBlur?: TextInputProps['onBlur'];
  onFocus?: TextInputProps['onFocus'];
  onSubmitEditing?: () => void;
  returnKeyType?: TextInputProps['returnKeyType'];
  leftIcon?: keyof typeof Ionicons.glyphMap;
  passwordToggle?: boolean;
  style?: ViewStyle;
  inputStyle?: TextInputProps['style'];
  accessibilityLabel?: string;
  accessibilityHint?: string;
  testID?: string;
}

export const TextField = forwardRef<TextInput, TextFieldProps>(function TextField(
  {
    label,
    value,
    onChangeText,
    placeholder,
    error,
    helperText,
    keyboardType,
    autoCapitalize = 'none',
    autoCorrect = false,
    secureTextEntry,
    editable = true,
    multiline = false,
    numberOfLines,
    onBlur,
    onFocus,
    onSubmitEditing,
    returnKeyType,
    leftIcon,
    passwordToggle = false,
    style,
    inputStyle,
    accessibilityLabel,
    accessibilityHint,
    testID,
  },
  ref,
) {
  const { colors } = useTheme();
  const s = createStyles(colors);
  const [focused, setFocused] = useState(false);
  const [passVisible, setPassVisible] = useState(false);

  const isSecure = secureTextEntry ?? passwordToggle;
  const showText = passwordToggle ? passVisible : false;

  const handleFocus: TextInputProps['onFocus'] = (e) => {
    setFocused(true);
    onFocus?.(e);
  };

  const handleBlur: TextInputProps['onBlur'] = (e) => {
    setFocused(false);
    onBlur?.(e);
  };

  return (
    <View style={[s.container, style]}>
      {label ? (
        <AppText variant="SmallAlt" color="secondary" style={s.label}>
          {label}
        </AppText>
      ) : null}

      <View
        style={[
          s.inputWrap,
          focused && s.inputWrapFocused,
          !!error && s.inputWrapError,
          !editable && s.inputWrapDisabled,
          multiline && s.inputWrapMultiline,
        ]}
      >
        {leftIcon ? (
          <Ionicons
            name={leftIcon}
            size={18}
            color={colors.textMuted}
            style={s.leftIcon}
          />
        ) : null}

        <TextInput
          ref={ref}
          style={[s.input, multiline && s.inputMultiline, inputStyle]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.disabledText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          secureTextEntry={isSecure && !showText}
          editable={editable}
          multiline={multiline}
          numberOfLines={numberOfLines}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={accessibilityHint}
          testID={testID}
        />

        {passwordToggle ? (
          <TouchableOpacity
            onPress={() => setPassVisible((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel={passVisible ? 'Hide password' : 'Show password'}
            style={s.trailingAction}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={passVisible ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.subtext}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <AppText variant="Caption" color="error">
          {error}
        </AppText>
      ) : null}

      {!error && helperText ? (
        <AppText variant="Caption" color="muted">
          {helperText}
        </AppText>
      ) : null}
    </View>
  );
});

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    container: {
      gap: SPACING.xsSm,
    },
    label: {
      marginBottom: SPACING.xs - 2,
    },
    inputWrap: {
      minHeight: ACCESSIBILITY.minTouchTarget + 4,
      borderRadius: RADIUS.md,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.inputBg,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.md,
    },
    inputWrapFocused: {
      borderColor: C.primary,
    },
    inputWrapError: {
      borderColor: C.error,
    },
    inputWrapDisabled: {
      opacity: 0.6,
    },
    inputWrapMultiline: {
      alignItems: 'flex-start',
      minHeight: 96,
    },
    leftIcon: {
      marginRight: SPACING.sm,
    },
    input: {
      flex: 1,
      color: C.text,
      fontSize: TYPOGRAPHY.BodyMid.fontSize,
      lineHeight: TYPOGRAPHY.BodyMid.lineHeight,
      paddingVertical: SPACING.md,
    },
    inputMultiline: {
      textAlignVertical: 'top',
      paddingTop: SPACING.md,
    },
    trailingAction: {
      padding: SPACING.xsSm,
      marginLeft: SPACING.sm,
    },
  });
}
