import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { radius, shadowSubtle, spacing, typography } from '../../theme';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';

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
  color,
}: SurfaceHeaderIconButtonProps) {
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const resolvedColor = color ?? colors.text;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={{ top: spacing.xs, bottom: spacing.xs, left: spacing.xs, right: spacing.xs }}
      style={({ pressed }) => [styles.headerIconBtn, pressed && styles.pressed]}
    >
      <Ionicons name={iconName} size={spacing.lg} color={resolvedColor} />
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
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const textColor = tintColor ?? colors.text;
  const subtextColor = tintColor ? `${tintColor}B3` : colors.subtext;
  const headerGradient = isDark
    ? (['rgba(24,22,40,0.97)', 'rgba(14,14,24,0.90)'] as const)
    : (['rgba(247,241,255,0.95)', 'rgba(255,255,255,0.86)'] as const);

  return (
    <LinearGradient
      colors={headerGradient}
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

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    headerShell: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: isDark ? C.surfaceGlassBorder : C.borderLight,
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
      backgroundColor: C.primarySoft,
    },
    avatarPlaceholder: {
      width: spacing.xxl * 2,
      height: spacing.xxl * 2,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: C.primarySoft,
      borderWidth: 1,
      borderColor: C.border,
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
      borderColor: isDark ? C.surfaceGlassBorder : C.border,
      backgroundColor: isDark ? 'rgba(36,34,54,0.88)' : 'rgba(255,255,255,0.92)',
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
      backgroundColor: C.danger,
      borderWidth: 1,
      borderColor: C.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      ...typography.Caption,
      color: C.white,
      fontWeight: '700',
      lineHeight: 14,
      fontSize: 11,
    },
    pressed: {
      opacity: 0.78,
    },
  });
}
