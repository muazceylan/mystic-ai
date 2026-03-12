import React from 'react';
import { AppSurfaceHeader, SurfaceHeaderIconButton } from '../ui';

interface AllCategoriesHeaderProps {
  onBack: () => void;
  onOpenCalendar: () => void;
  onToggleLegend: () => void;
}

export function AllCategoriesHeader({
  onBack,
  onOpenCalendar,
  onToggleLegend,
}: AllCategoriesHeaderProps) {
  return (
    <AppSurfaceHeader
      title="Tüm Kategoriler"
      subtitle="Bugünün tüm alanları ve skorları"
      variant="page"
      showBackButton
      onBack={onBack}
      rightActions={(
        <>
          <SurfaceHeaderIconButton iconName="calendar-outline" onPress={onOpenCalendar} accessibilityLabel="Takvim" />
          <SurfaceHeaderIconButton iconName="options-outline" onPress={onToggleLegend} accessibilityLabel="Filtreler" />
        </>
      )}
    />
  );
}
