import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AccessibleText } from '../../ui';
import { ACCESSIBILITY } from '../../../constants/tokens';
import { radius, spacing } from '../../../theme';
import { useTheme } from '../../../context/ThemeContext';
import type { IoniconName } from '../../../constants/icons';

interface CreatePanelField {
  key: string;
  label: string;
  value: string;
  iconName: IoniconName;
  onPress: () => void;
}

interface ShareCardCreatePanelProps {
  title: string;
  fields: CreatePanelField[];
  buttonLabel: string;
  onGenerate: () => void;
  disabled?: boolean;
  loading?: boolean;
}

export function ShareCardCreatePanel({
  title,
  fields,
  buttonLabel,
  onGenerate,
  disabled = false,
  loading = false,
}: ShareCardCreatePanelProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.panel, { borderColor: 'rgba(180, 165, 210, 0.24)' }]}>
      <AccessibleText
        style={[styles.title, { color: colors.text }]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {title}
      </AccessibleText>

      <View style={styles.grid}>
        {fields.map((field) => (
          <Pressable
            key={field.key}
            onPress={field.onPress}
            accessibilityRole="button"
            accessibilityLabel={`${field.label}: ${field.value}`}
            style={({ pressed }) => [
              styles.selectorCard,
              { borderColor: 'rgba(180, 165, 210, 0.26)' },
              pressed && styles.pressed,
            ]}
          >
            <View style={[styles.iconShell, { backgroundColor: 'rgba(160, 130, 220, 0.12)' }]}>
              <Ionicons name={field.iconName} size={17} color={colors.violet} />
            </View>

            <View style={styles.copyWrap}>
              <AccessibleText
                style={[styles.fieldLabel, { color: colors.subtext }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={2}
              >
                {field.label}
              </AccessibleText>
              <AccessibleText
                style={[styles.fieldValue, { color: colors.text }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {field.value}
              </AccessibleText>
            </View>

            <Ionicons name="chevron-forward" size={17} color={colors.textMuted} style={styles.chevron} />
          </Pressable>
        ))}

        <Pressable
          onPress={onGenerate}
          disabled={disabled || loading}
          accessibilityRole="button"
          accessibilityState={{ disabled: disabled || loading, busy: loading }}
          style={({ pressed }) => [
            styles.ctaWrap,
            { backgroundColor: disabled || loading ? 'rgba(160, 130, 220, 0.5)' : colors.violet },
            pressed && styles.pressed,
          ]}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="sparkles" size={17} color="#FFFFFF" />
          )}
          <AccessibleText
            style={styles.ctaLabel}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {buttonLabel}
          </AccessibleText>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderWidth: 1,
    borderRadius: radius.hero,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  title: {
    fontSize: 18,
    lineHeight: 23,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  grid: {
    gap: spacing.sm,
  },
  selectorCard: {
    width: '100%',
    minHeight: 72,
    backgroundColor: '#FFFFFF',
    borderRadius: radius.card,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconShell: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyWrap: {
    flex: 1,
    gap: 2,
    minWidth: 0,
  },
  fieldLabel: {
    fontSize: 11,
    lineHeight: 14,
    fontWeight: '600',
  },
  fieldValue: {
    fontSize: 17,
    lineHeight: 21,
    fontWeight: '700',
  },
  chevron: {
    marginLeft: spacing.xs,
  },
  ctaWrap: {
    width: '100%',
    minHeight: 60,
    borderRadius: radius.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaLabel: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  pressed: {
    opacity: 0.88,
  },
});
