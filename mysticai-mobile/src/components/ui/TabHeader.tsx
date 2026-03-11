import React from 'react';
import { View } from 'react-native';
import { usePathname, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useNotificationStore } from '../../store/useNotificationStore';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { AppSurfaceHeader, SurfaceHeaderIconButton } from './AppSurfaceHeader';
import { resolveSurfaceTitle } from './surfaceUtils';

/* ─── Standalone right-side icons ─── */
/**
 * Settings + Notifications icon buttons.
 * Drop into any header's right slot to get consistent nav icons.
 */
export function HeaderRightIcons({ tintColor }: { tintColor?: string }) {
  const { t } = useTranslation();
  const router = useRouter();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const badgeText = unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      <SurfaceHeaderIconButton
        iconName="notifications-outline"
        onPress={() => router.push('/notifications')}
        accessibilityLabel={t('profile.menu.notifications')}
        badgeText={badgeText}
        color={tintColor}
      />
      <SurfaceHeaderIconButton
        iconName="sunny-outline"
        onPress={() => router.push('/theme-settings')}
        accessibilityLabel={t('common.settings')}
        color={tintColor}
      />
    </View>
  );
}

/* ─── Full TabHeader ─── */

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
}

export function TabHeader({
  title,
  subtitle,
  showBackButton,
  onBack,
  rightActions,
  showAvatar = true,
  transparent = false,
  onOpenProfile,
  onOpenSettings,
  onOpenNotifications,
  showDefaultRightIcons = true,
}: TabHeaderProps) {
  void showAvatar;
  void transparent;
  void onOpenProfile;
  const { t } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const badgeText = unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;
  const smartBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });
  const handleBack = onBack ?? smartBack;
  const handleOpenSettings = onOpenSettings ?? (() => router.push('/theme-settings'));
  const handleOpenNotifications = onOpenNotifications ?? (() => router.push('/notifications'));
  const resolvedTitle = resolveSurfaceTitle(pathname, title, t) ?? t('tabs.home');
  const shouldShowBackButton = showBackButton ?? pathname !== '/(tabs)/home';

  const defaultActions = showDefaultRightIcons ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {rightActions}
      <SurfaceHeaderIconButton
        iconName="notifications-outline"
        onPress={handleOpenNotifications}
        accessibilityLabel={t('profile.menu.notifications')}
        badgeText={badgeText}
      />
      <SurfaceHeaderIconButton
        iconName="sunny-outline"
        onPress={handleOpenSettings}
        accessibilityLabel={t('common.settings')}
      />
    </View>
  ) : rightActions;

  return (
    <AppSurfaceHeader
      title={resolvedTitle}
      subtitle={subtitle}
      variant="page"
      showBackButton={shouldShowBackButton}
      onBack={handleBack}
      rightActions={defaultActions}
    />
  );
}
