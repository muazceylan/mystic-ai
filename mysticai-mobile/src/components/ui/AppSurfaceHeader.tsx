import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { colors, radius, shadowSubtle, spacing, typography } from '../../theme';

type SurfaceHeaderVariant = 'home' | 'page';

interface AppSurfaceHeaderProps {
  title: string;
  subtitle?: string;
  variant?: SurfaceHeaderVariant;
  avatarUri?: string | null;
  showBackButton?: boolean;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  tintColor?: string;
}

interface SurfaceHeaderIconButtonProps {
  iconName: React.ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  accessibilityLabel: string;
  badgeText?: string | null;
  color?: string;
}

const MAX_FONT_SCALE = 1.15;

export function SurfaceHeaderIconButton({
  iconName,
  onPress,
  accessibilityLabel,
  badgeText,
  color = colors.textPrimary,
}: SurfaceHeaderIconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: spacing.xs, bottom: spacing.xs, left: spacing.xs, right: spacing.xs }}
      style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
    >
      <Ionicons name={iconName} size={spacing.lg} color={color} />
      {badgeText ? (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function AppSurfaceHeader({
  title,
  subtitle,
  variant = 'page',
  avatarUri,
  showBackButton = false,
  onBack,
  rightActions,
  tintColor,
}: AppSurfaceHeaderProps) {
  const { t } = useTranslation();
  const textColor = tintColor ?? colors.textPrimary;
  const subtextColor = tintColor ? `${tintColor}B3` : colors.textSecondary;

  return (
    <LinearGradient
      colors={[colors.headerGradA, colors.headerGradB]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerShell}
    >
      <View style={styles.headerRow}>
        <View style={styles.leftCluster}>
          {variant === 'home' ? (
            avatarUri ? (
              <Image
                source={{ uri: avatarUri }}
                style={styles.avatar}
                accessibilityIgnoresInvertColors
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={spacing.lg + spacing.xs} color={colors.primary} />
              </View>
            )
          ) : showBackButton && onBack ? (
            <SurfaceHeaderIconButton
              iconName="chevron-back"
              onPress={onBack}
              accessibilityLabel={t('common.back')}
              color={textColor}
            />
          ) : null}

          <View style={styles.titleWrap}>
            <Text
              maxFontSizeMultiplier={MAX_FONT_SCALE}
              numberOfLines={1}
              style={[
                styles.title,
                variant === 'home' ? styles.homeTitle : styles.pageTitle,
                { color: textColor },
              ]}
            >
              {title}
            </Text>
            {subtitle ? (
              <Text
                maxFontSizeMultiplier={MAX_FONT_SCALE}
                numberOfLines={1}
                style={[styles.subtitle, { color: subtextColor }]}
              >
                {subtitle}
              </Text>
            ) : null}
          </View>
        </View>

        {rightActions ? <View style={styles.headerActions}>{rightActions}</View> : null}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  headerShell: {
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.borderSoft,
    paddingHorizontal: spacing.cardPadding,
    paddingVertical: spacing.md,
    ...shadowSubtle,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  leftCluster: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minWidth: 0,
  },
  titleWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    flexShrink: 1,
  },
  homeTitle: {
    ...typography.H1,
    fontSize: 20,
    lineHeight: 26,
  },
  pageTitle: {
    ...typography.H2,
    fontSize: 18,
    lineHeight: 24,
  },
  subtitle: {
    ...typography.Caption,
    marginTop: 2,
  },
  avatar: {
    width: spacing.xxl * 2,
    height: spacing.xxl * 2,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
  },
  avatarPlaceholder: {
    width: spacing.xxl * 2,
    height: spacing.xxl * 2,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  headerIconBtn: {
    width: spacing.chevronHitArea,
    height: spacing.chevronHitArea,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.headerActionBorder,
    backgroundColor: colors.headerActionBg,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadowSubtle,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -4,
    minWidth: spacing.md + spacing.xxs,
    height: spacing.md + spacing.xxs,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.xxs,
    backgroundColor: colors.badgeBg,
    borderWidth: 1,
    borderColor: colors.surfaceCard,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...typography.Caption,
    color: colors.badgeText,
    fontWeight: '700',
    lineHeight: 14,
    fontSize: 11,
  },
  pressed: {
    opacity: 0.78,
  },
});
