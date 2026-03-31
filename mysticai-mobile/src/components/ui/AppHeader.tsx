import React from 'react';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { AppSurfaceHeader } from './AppSurfaceHeader';

interface AppHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  rightActions?: React.ReactNode;
  transparent?: boolean;
  tintColor?: string;
}

export function AppHeader({
  title,
  subtitle,
  onBack,
  rightActions,
  transparent = false,
  tintColor,
}: AppHeaderProps) {
  const smartBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });

  return (
    <AppSurfaceHeader
      title={title}
      subtitle={subtitle}
      variant="page"
      showBackButton
      onBack={onBack ?? smartBack}
      rightActions={rightActions}
      tintColor={tintColor}
      transparent={transparent}
    />
  );
}
