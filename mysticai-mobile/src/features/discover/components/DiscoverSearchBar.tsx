import React from 'react';
import { StyleSheet, TextInput, View, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../../constants/tokens';
import { useTranslation } from 'react-i18next';

interface Props {
  value: string;
  onChangeText: (text: string) => void;
}

export function DiscoverSearchBar({ value, onChangeText }: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const S = makeStyles(colors, isDark);

  return (
    <View style={S.container}>
      <Ionicons name="search" size={18} color={colors.muted} style={S.icon} />
      <TextInput
        style={S.input}
        placeholder={t('discover.searchPlaceholder')}
        placeholderTextColor={colors.muted}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <Ionicons name="close-circle" size={18} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

function makeStyles(colors: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.inputBg,
      borderRadius: RADIUS.md,
      marginHorizontal: SPACING.lg,
      marginTop: SPACING.sm,
      marginBottom: SPACING.md,
      paddingHorizontal: SPACING.md,
      height: 42,
      borderWidth: 1,
      borderColor: colors.border,
    },
    icon: {
      marginRight: SPACING.sm,
    },
    input: {
      flex: 1,
      ...TYPOGRAPHY.Small,
      color: colors.text,
      padding: 0,
    },
  });
}
