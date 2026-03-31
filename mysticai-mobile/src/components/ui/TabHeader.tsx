import React, { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { usePathname } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useAuthStore } from '../../store/useAuthStore';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { useSurfaceNavigationActions } from '../../hooks/useSurfaceNavigationActions';
import { SPACING } from '../../constants/tokens';
import { radius, spacing as appSpacing } from '../../theme';
import { MonetizationQuickBar } from '../../features/monetization';
import { AppSurfaceHeader, SurfaceHeaderIconButton } from './AppSurfaceHeader';
import { resolveSurfaceTitle } from './surfaceUtils';

/* --- Standalone right-side icons --- */
/**
 * Settings + Notifications icon buttons.
 * Drop into any header's right slot to get consistent nav icons.
 */
export function HeaderRightIcons({ tintColor }: { tintColor?: string }) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { onOpenSettings, onOpenNotifications } = useSurfaceNavigationActions();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const badgeText = unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;
  const shouldShowThemeButton = pathname === '/(tabs)/profile';

  return (
    <View style={headerStyles.iconRow}>
      <SurfaceHeaderIconButton
        iconName="notifications-outline"
        onPress={onOpenNotifications}
        accessibilityLabel={t('profile.menu.notifications')}
        badgeText={badgeText}
        color={tintColor}
      />
      {shouldShowThemeButton ? (
        <SurfaceHeaderIconButton
          iconName="sunny-outline"
          onPress={onOpenSettings}
          accessibilityLabel={t('common.settings')}
          color={tintColor}
        />
      ) : null}
    </View>
  );
}

/* --- Full TabHeader --- */

interface TabHeaderProps {
  /** Page title (left side, next to avatar) */
  title?: string;
  /** Optional subtitle below the title row */
  subtitle?: string;
  /** Optional back button shown on the left */
  showBackButton?: boolean;
  onBack?: () => void;
  /** Screen-specific action buttons inserted before settings/notifications */
  rightActions?: React.ReactNode;
  /** Show avatar circle on the left (default true) */
  showAvatar?: boolean;
  /** Transparent background for gradient screens */
  transparent?: boolean;
  onOpenProfile?: () => void;
  onOpenSettings?: () => void;
  onOpenNotifications?: () => void;
  showDefaultRightIcons?: boolean;
  showMonetizationQuickBar?: boolean;
}

export function TabHeader({
  title,
  subtitle,
  showBackButton,
  onBack,
  rightActions,
  showAvatar = false,
  transparent = false,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  showDefaultRightIcons = true,
  showMonetizationQuickBar = true,
}: TabHeaderProps) {
  const { t } = useTranslation();
  const pathname = usePathname();
  const { colors } = useTheme();
  const user = useAuthStore((s) => s.user);
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const badgeText = unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;
  const smartBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });
  const {
    onOpenProfile: defaultOpenProfile,
    onOpenSettings: defaultOpenSettings,
    onOpenNotifications: defaultOpenNotifications,
  } = useSurfaceNavigationActions();
  const handleBack = onBack ?? smartBack;
  const handleOpenProfile = onOpenProfile ?? defaultOpenProfile;
  const handleOpenSettings = onOpenSettings ?? defaultOpenSettings;
  const handleOpenNotifications = onOpenNotifications ?? defaultOpenNotifications;
  const resolvedTitle = resolveSurfaceTitle(pathname, title, t) ?? t('tabs.home');
  const shouldShowBackButton = showBackButton ?? pathname !== '/(tabs)/home';
  const shouldShowThemeButton = pathname === '/(tabs)/profile';

  const avatarUri = user?.avatarUri ?? user?.avatarUrl ?? null;
  const avatarInitial = useMemo(() => {
    const source = user?.firstName?.trim() || user?.name?.trim() || user?.username?.trim();
    if (!source) return null;
    return source.charAt(0).toUpperCase();
  }, [user?.firstName, user?.name, user?.username]);

  const leftActions = useMemo(() => {
    const nodes: React.ReactNode[] = [];

    if (shouldShowBackButton) {
      nodes.push(
        <SurfaceHeaderIconButton
          key="back"
          iconName="chevron-back"
          onPress={handleBack}
          accessibilityLabel={t('common.back')}
          color={colors.text}
        />,
      );
    }

    if (showAvatar) {
      const avatarSize = appSpacing.xxl * 2;
      const avatarNode = avatarUri ? (
        <Image
          source={{ uri: avatarUri }}
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: radius.pill,
            },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.avatarPlaceholder,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: radius.pill,
              borderColor: colors.border,
              backgroundColor: colors.primarySoft,
            },
          ]}
        >
          {avatarInitial ? (
            <Text style={[styles.avatarInitial, { color: colors.text }]} numberOfLines={1}>
              {avatarInitial}
            </Text>
          ) : null}
        </View>
      );

      nodes.push(
        <Pressable
          key="avatar"
          onPress={handleOpenProfile}
          accessibilityRole="button"
          accessibilityLabel={t('tabs.profile')}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          style={({ pressed }) => (pressed ? { opacity: 0.85 } : undefined)}
        >
          {avatarNode}
        </Pressable>,
      );
    }

    if (nodes.length === 0) return undefined;
    return <View style={leftActionStyles.row}>{nodes}</View>;
  }, [
    avatarInitial,
    avatarUri,
    colors.border,
    colors.primarySoft,
    colors.text,
    handleBack,
    handleOpenProfile,
    shouldShowBackButton,
    showAvatar,
    t,
  ]);

  const defaultActions = showDefaultRightIcons ? (
    <View style={headerStyles.actionRow}>
      {rightActions}
      {showMonetizationQuickBar ? <MonetizationQuickBar /> : null}
      <SurfaceHeaderIconButton
        iconName="notifications-outline"
        onPress={handleOpenNotifications}
        accessibilityLabel={t('profile.menu.notifications')}
        badgeText={badgeText}
      />
      {shouldShowThemeButton ? (
        <SurfaceHeaderIconButton
          iconName="sunny-outline"
          onPress={handleOpenSettings}
          accessibilityLabel={t('common.settings')}
        />
      ) : null}
    </View>
  ) : rightActions ? (
    <View style={headerStyles.actionRow}>
      {rightActions}
    </View>
  ) : null;

  return (
    <AppSurfaceHeader
      title={resolvedTitle}
      subtitle={subtitle}
      variant="page"
      showBackButton={false}
      rightActions={defaultActions}
      leftActions={leftActions}
      transparent={transparent}
    />
  );
}

const headerStyles = StyleSheet.create({
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.smMd,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
});

const leftActionStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
});

const styles = StyleSheet.create({
  avatar: {
    backgroundColor: 'transparent',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  avatarInitial: {
    fontWeight: '700',
    fontSize: 14,
    lineHeight: 18,
  },
});
