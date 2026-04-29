import React from 'react';
import { useTranslation } from 'react-i18next';
import { useBackNavigation, type UseBackNavigationOptions } from '../../hooks/useBackNavigation';
import { SurfaceHeaderIconButton } from './AppSurfaceHeader';

interface AppBackButtonProps extends UseBackNavigationOptions {
  /** Override the resolved label. Defaults to translated `common.back`. */
  accessibilityLabel?: string;
  /** Override the tint color. */
  color?: string;
  /** Optional custom onPress — if provided, back resolution is skipped. */
  onPress?: () => void;
}

/**
 * Reusable back chevron button wired to `useBackNavigation`.
 *
 * Use this in custom headers (where `AppHeader` isn't a fit) so that back
 * behavior stays consistent across the app — it automatically honors the
 * `from` / `entry_type` navigation origin params, stack history, and tab
 * fallbacks.
 */
export function AppBackButton({
  accessibilityLabel,
  color,
  onPress,
  fallbackRoute,
  overrideOrigin,
}: AppBackButtonProps) {
  const { t } = useTranslation();
  const goBack = useBackNavigation({ fallbackRoute, overrideOrigin });

  return (
    <SurfaceHeaderIconButton
      iconName="chevron-back"
      onPress={onPress ?? goBack}
      accessibilityLabel={accessibilityLabel ?? t('common.back')}
      color={color}
    />
  );
}
