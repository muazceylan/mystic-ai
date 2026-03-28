import React from 'react';
import { AppSurfaceHeader } from '../ui';

interface AllCategoriesHeaderProps {
  onBack: () => void;
}

export function AllCategoriesHeader({
  onBack,
}: AllCategoriesHeaderProps) {
  return (
    <AppSurfaceHeader
      title="Tüm Kategoriler"
      subtitle="Bugünün tüm alanları ve skorları"
      variant="page"
      showBackButton
      onBack={onBack}
    />
  );
}
