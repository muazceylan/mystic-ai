import React from 'react';
import { StyleProp, StyleSheet, Text, TouchableOpacity, View, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';

interface AuthLegalNoticeProps {
  style?: StyleProp<ViewStyle>;
  variant?: 'default' | 'inline';
}

export function AuthLegalNotice({ style, variant = 'default' }: AuthLegalNoticeProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const termsLabel = t('terms.title');
  const privacyLabel = t('profile.menu.privacy');
  const isInline = variant === 'inline';

  return (
    <View style={[isInline ? styles.inlineContainer : styles.container, style]}>
      <Text style={[styles.copy, isInline && styles.inlineCopy]}>{t('auth.legal.description')}</Text>

      <View style={[styles.linkRow, isInline && styles.inlineLinkRow]}>
        <TouchableOpacity
          style={[styles.linkButton, isInline && styles.inlineLinkButton]}
          onPress={() => router.push('/terms')}
          accessibilityRole="link"
          accessibilityLabel={termsLabel}
          activeOpacity={0.85}
        >
          {!isInline ? <Ionicons name="document-text-outline" size={16} color={colors.primary} /> : null}
          <Text style={[styles.linkText, isInline && styles.inlineLinkText]}>{termsLabel}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkButton, isInline && styles.inlineLinkButton]}
          onPress={() => router.push('/privacy')}
          accessibilityRole="link"
          accessibilityLabel={privacyLabel}
          activeOpacity={0.85}
        >
          {!isInline ? <Ionicons name="shield-checkmark-outline" size={16} color={colors.primary} /> : null}
          <Text style={[styles.linkText, isInline && styles.inlineLinkText]}>{privacyLabel}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.surfaceGlassBorder,
      backgroundColor: C.surfaceGlass,
      padding: 12,
      gap: 10,
      alignItems: 'center',
    },
    copy: {
      fontSize: 12.5,
      lineHeight: 18,
      color: C.subtext,
      textAlign: 'center',
    },
    inlineContainer: {
      gap: 4,
      alignItems: 'center',
    },
    inlineCopy: {
      fontSize: 11.5,
      lineHeight: 16,
    },
    linkRow: {
      width: '100%',
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 8,
    },
    inlineLinkRow: {
      width: 'auto',
      gap: 12,
    },
    linkButton: {
      minHeight: 44,
      paddingHorizontal: 12,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: C.primary,
      backgroundColor: C.primarySoft,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    inlineLinkButton: {
      minHeight: 28,
      paddingHorizontal: 0,
      borderRadius: 0,
      borderWidth: 0,
      backgroundColor: 'transparent',
    },
    linkText: {
      fontSize: 12.5,
      fontWeight: '700',
      color: C.primary,
    },
    inlineLinkText: {
      fontSize: 12,
      textDecorationLine: 'underline',
    },
  });
}
