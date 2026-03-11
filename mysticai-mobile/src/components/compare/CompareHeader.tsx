import React from 'react';
import { AppSurfaceHeader } from '../ui';

interface CompareHeaderProps {
  title: string;
  onBack: () => void;
  subtitle?: string;
}

export default function CompareHeader({ title, onBack, subtitle }: CompareHeaderProps) {
  return (
    <AppSurfaceHeader
      title={title}
      subtitle={subtitle}
      variant="page"
      showBackButton
      onBack={onBack}
    />
  );
}
