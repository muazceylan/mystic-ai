import React from 'react';
import { AppSurfaceHeader } from '../ui';
import { useTranslation } from 'react-i18next';

interface AllCategoriesHeaderProps {
  onBack: () => void;
}

export function AllCategoriesHeader({
  onBack,
}: AllCategoriesHeaderProps) {
  const { t } = useTranslation();
  return (
    <AppSurfaceHeader
      title={t('decisionCompassScreen.allCategoriesTitle')}
      subtitle={t('decisionCompassScreen.allCategoriesSubtitle')}
      variant="page"
      showBackButton
      onBack={onBack}
    />
  );
}
