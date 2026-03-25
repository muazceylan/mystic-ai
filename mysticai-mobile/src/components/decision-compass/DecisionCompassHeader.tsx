import React from 'react';
import { AppSurfaceHeader, SurfaceHeaderIconButton } from '../ui';
import { MonetizationQuickBar } from '../../features/monetization';
import { SpotlightTarget } from '../../features/tutorial/components/SpotlightTarget';
import { DECISION_COMPASS_TUTORIAL_TARGET_KEYS } from '../../features/tutorial/domain/tutorial.constants';
import { useNotificationStore } from '../../store/useNotificationStore';

interface DecisionCompassHeaderProps {
  onBack: () => void;
  onOpenCalendar: () => void;
  onOpenNotifications: () => void;
  onOpenHelp: () => void;
}

export function DecisionCompassHeader({
  onBack,
  onOpenCalendar,
  onOpenNotifications,
  onOpenHelp,
}: DecisionCompassHeaderProps) {
  const unreadCount = useNotificationStore((state) => state.unreadCount);
  const badgeText = unreadCount > 0 ? (unreadCount > 9 ? '9+' : String(unreadCount)) : null;

  return (
    <AppSurfaceHeader
      title="Karar Pusulası"
      subtitle="Günün öncelik alanları ve skorlar"
      variant="page"
      showBackButton
      onBack={onBack}
      rightActions={(
        <>
          <SurfaceHeaderIconButton iconName="calendar-outline" onPress={onOpenCalendar} accessibilityLabel="Takvim" />
          <MonetizationQuickBar />
          <SurfaceHeaderIconButton
            iconName="notifications-outline"
            onPress={onOpenNotifications}
            accessibilityLabel="Bildirimler"
            badgeText={badgeText}
          />
          <SpotlightTarget targetKey={DECISION_COMPASS_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
            <SurfaceHeaderIconButton iconName="help-circle-outline" onPress={onOpenHelp} accessibilityLabel="Yardım" />
          </SpotlightTarget>
        </>
      )}
    />
  );
}
