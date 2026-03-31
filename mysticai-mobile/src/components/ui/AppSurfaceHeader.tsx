import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { isAndroid, platformColor, radius, shadowSubtle, spacing, typography } from '../../theme';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { AppText } from './AppText';

type SurfaceHeaderVariant = 'home' | 'page';

interface AppSurfaceHeaderProps {
  title: string;
  subtitle?: string;
  variant?: SurfaceHeaderVariant;
  avatarUri?: string | null;
  showBackButton?: boolean;
  onBack?: () => void;
  leftActions?: React.ReactNode;
  rightActions?: React.ReactNode;
  tintColor?: string;
  allowTitleAutoShrink?: boolean;
  titleMinimumScale?: number;
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
          <AppText variant="Caption" color={colors.white} weight="700" style={styles.badgeText}>
            {badgeText}
          </AppText>
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
  leftActions,
  rightActions,
  tintColor,
  allowTitleAutoShrink = false,
  titleMinimumScale = 0.9,
}: AppSurfaceHeaderProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = React.useMemo(() => makeStyles(colors, isDark), [colors, isDark]);
  const [contentWidth, setContentWidth] = React.useState(0);
  const [leadingWidth, setLeadingWidth] = React.useState(0);
  const [rightActionsWidth, setRightActionsWidth] = React.useState(0);
  const [titleWidth, setTitleWidth] = React.useState(0);
  const textColor = tintColor ?? colors.text;
  const subtextColor = tintColor ? `${tintColor}B3` : colors.subtext;
  const headerGradient: readonly [string, string, ...string[]] = isDark
    ? (isAndroid ? ['#181626', '#0F1320'] : ['rgba(24,22,40,0.97)', 'rgba(14,14,24,0.90)'])
    : (isAndroid ? ['#FBF8FF', '#FFFFFF'] : ['rgba(247,241,255,0.95)', 'rgba(255,255,255,0.86)']);
  const hasLeadingNode = Boolean(leftActions || (variant !== 'home' && showBackButton && onBack));
  const inlineLeadingGap = variant === 'page' ? spacing.xs : spacing.sm;
  const inlineOuterGap = rightActions ? spacing.md : 0;
  const inlineTitleAvailableWidth = Math.max(
    0,
    contentWidth
      - rightActionsWidth
      - inlineOuterGap
      - leadingWidth
      - (hasLeadingNode ? inlineLeadingGap : 0)
      - (variant === 'page' ? spacing.xxs : 0),
  );
  const shrinkThresholdWidth = allowTitleAutoShrink ? titleWidth * titleMinimumScale : titleWidth;
  const usesStackedPageLayout = variant === 'page'
    && contentWidth > 0
    && titleWidth > 0
    && inlineTitleAvailableWidth > 0
    && shrinkThresholdWidth > inlineTitleAvailableWidth;
  const leadingNode = leftActions ? leftActions : variant === 'home' ? (
    avatarUri ? (
      <Image
        source={{ uri: avatarUri }}
        style={styles.avatar}
        accessibilityIgnoresInvertColors
      />
    ) : null
  ) : showBackButton && onBack ? (
    <SurfaceHeaderIconButton
      iconName="chevron-back"
      onPress={onBack}
      accessibilityLabel={t('common.back')}
      color={textColor}
    />
  ) : null;

  React.useEffect(() => {
    if (!hasLeadingNode) {
      setLeadingWidth(0);
    }
  }, [hasLeadingNode]);

  React.useEffect(() => {
    if (!rightActions) {
      setRightActionsWidth(0);
    }
  }, [rightActions]);

  const titleNode = title ? (
    <AppText
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      numberOfLines={usesStackedPageLayout ? 2 : 1}
      adjustsFontSizeToFit={!usesStackedPageLayout && variant === 'page' && allowTitleAutoShrink}
      minimumFontScale={!usesStackedPageLayout && variant === 'page' && allowTitleAutoShrink ? titleMinimumScale : 1}
      ellipsizeMode="tail"
      style={[
        styles.title,
        variant === 'home' ? styles.homeTitle : styles.pageTitle,
        usesStackedPageLayout && styles.stackedPageTitle,
        { color: textColor },
      ]}
    >
      {title}
    </AppText>
  ) : null;
  const subtitleNode = subtitle ? (
    <AppText
      variant="Caption"
      maxFontSizeMultiplier={MAX_FONT_SCALE}
      numberOfLines={usesStackedPageLayout ? 2 : 1}
      style={[
        styles.subtitle,
        usesStackedPageLayout && styles.stackedSubtitle,
        { color: subtextColor },
      ]}
    >
      {subtitle}
    </AppText>
  ) : null;

  return (
    <LinearGradient
      colors={headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerShell}
      onLayout={(event) => {
        const nextWidth = Math.max(0, event.nativeEvent.layout.width - spacing.cardPadding * 2);
        if (Math.abs(nextWidth - contentWidth) > 1) {
          setContentWidth(nextWidth);
        }
      }}
    >
      {usesStackedPageLayout ? (
        <View style={styles.stackedShell}>
          <View style={styles.headerTopRow}>
            {leadingNode ? (
              <View
                style={styles.topLeftActions}
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width;
                  if (Math.abs(nextWidth - leadingWidth) > 1) {
                    setLeadingWidth(nextWidth);
                  }
                }}
              >
                {leadingNode}
              </View>
            ) : (
              <View style={styles.topLeftSpacer} />
            )}
            {rightActions ? (
              <View
                style={styles.headerActions}
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width;
                  if (Math.abs(nextWidth - rightActionsWidth) > 1) {
                    setRightActionsWidth(nextWidth);
                  }
                }}
              >
                {rightActions}
              </View>
            ) : null}
          </View>

          {title || subtitle ? (
            <View style={[styles.titleWrap, styles.stackedTitleWrap]}>
              {titleNode}
              {subtitleNode}
            </View>
          ) : null}
        </View>
      ) : (
        <View style={styles.headerRow}>
          <View style={[styles.leftCluster, variant === 'page' && styles.pageLeftCluster]}>
            {leadingNode ? (
              <View
                onLayout={(event) => {
                  const nextWidth = event.nativeEvent.layout.width;
                  if (Math.abs(nextWidth - leadingWidth) > 1) {
                    setLeadingWidth(nextWidth);
                  }
                }}
              >
                {leadingNode}
              </View>
            ) : null}

            {title || subtitle ? (
              <View style={[styles.titleWrap, variant === 'page' && styles.pageTitleWrap]}>
                {titleNode}
                {subtitleNode}
              </View>
            ) : null}
          </View>

          {rightActions ? (
            <View
              style={styles.headerActions}
              onLayout={(event) => {
                const nextWidth = event.nativeEvent.layout.width;
                if (Math.abs(nextWidth - rightActionsWidth) > 1) {
                  setRightActionsWidth(nextWidth);
                }
              }}
            >
              {rightActions}
            </View>
          ) : null}
        </View>
      )}

      {variant === 'page' && title ? (
        <View pointerEvents="none" style={styles.measureLayer}>
          <Text
            numberOfLines={1}
            onLayout={(event) => {
              const nextWidth = event.nativeEvent.layout.width;
              if (Math.abs(nextWidth - titleWidth) > 1) {
                setTitleWidth(nextWidth);
              }
            }}
            style={[styles.title, styles.pageTitle, styles.measureText]}
          >
            {title}
          </Text>
        </View>
      ) : null}
    </LinearGradient>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    headerShell: {
      borderRadius: radius.card,
      borderWidth: 1,
      borderColor: isDark ? platformColor(C.surfaceGlassBorder, C.border) : C.borderLight,
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
    stackedShell: {
      gap: spacing.sm,
    },
    headerTopRow: {
      minHeight: spacing.chevronHitArea,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: spacing.sm,
    },
    topLeftActions: {
      minWidth: spacing.chevronHitArea,
      minHeight: spacing.chevronHitArea,
      justifyContent: 'center',
      alignItems: 'flex-start',
      flexShrink: 0,
    },
    topLeftSpacer: {
      width: 0,
      height: spacing.chevronHitArea,
      flexShrink: 1,
    },
    leftCluster: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.sm,
      minWidth: 0,
    },
    pageLeftCluster: {
      gap: spacing.xs,
    },
    titleWrap: {
      flex: 1,
      minWidth: 0,
    },
    pageTitleWrap: {
      paddingRight: spacing.xxs,
    },
    stackedTitleWrap: {
      flex: 0,
      paddingRight: 0,
      gap: 2,
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
    stackedPageTitle: {
      flexShrink: 0,
      fontSize: 19,
      lineHeight: 24,
      letterSpacing: -0.3,
    },
    subtitle: {
      ...typography.Caption,
      marginTop: 2,
    },
    stackedSubtitle: {
      marginTop: 0,
    },
    measureLayer: {
      position: 'absolute',
      left: 0,
      top: 0,
      opacity: 0,
      pointerEvents: 'none',
    },
    measureText: {
      alignSelf: 'flex-start',
      flexShrink: 0,
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
      gap: spacing.xs,
      flexShrink: 0,
    },
    headerIconBtn: {
      width: spacing.chevronHitArea,
      height: spacing.chevronHitArea,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: isDark ? platformColor(C.surfaceGlassBorder, C.border) : C.border,
      backgroundColor: isDark
        ? platformColor('rgba(36,34,54,0.88)', C.card)
        : platformColor('rgba(255,255,255,0.92)', C.surface),
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
