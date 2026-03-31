// --- Typography & Text ---
export { AppText } from './AppText';
export type { AppTextProps, TypographyVariant } from './AppText';
export { AccessibleText } from './AccessibleText';

// --- Form ---
export { TextField } from './TextField';
export type { TextFieldProps } from './TextField';
export { Button } from './Button';
export type { ButtonProps, ButtonVariant, ButtonSize } from './Button';
export { IconButton } from './IconButton';

// --- Layout & Containers ---
export { SafeScreen, useBottomTabBarOffset } from './SafeScreen';
export { Section } from './Section';
export type { SectionProps } from './Section';
export { Card } from './Card';
export { default as AccordionSection } from './AccordionSection';

// --- Data Display ---
export { Badge } from './Badge';
export { Chip } from './Chip';
export { ListItem } from './ListItem';
export { ListRow } from './ListRow';
export { ProgressPill } from './ProgressPill';
export { Skeleton } from './Skeleton';
export { ErrorStateCard } from './ErrorStateCard';

// --- Navigation & Header ---
export { AppHeader } from './AppHeader';
export { TabHeader, HeaderRightIcons } from './TabHeader';
export { AppSurfaceBackground } from './AppSurfaceBackground';
export { AppSurfaceHeader, SurfaceHeaderIconButton } from './AppSurfaceHeader';

// --- Overlay ---
export { BottomSheet } from './BottomSheet';

// --- Brand & Icons ---
export { AppIcon } from './AppIcon';
export type { AppIconProps } from './AppIcon';
export { BrandLogo, BrandMark, BrandBadge } from './BrandLogo';
export type { BrandLogoProps, BrandMarkProps, BrandBadgeProps, BrandVariant, BrandSize } from './BrandLogo';
export { PremiumIconBadge } from './PremiumIconBadge';
export type { PremiumIconTone } from './PremiumIconBadge';

// --- Deprecated ---
/** @deprecated Replaced by PagerView-based MainTabPager in navigation/ */
export { TabSwipeGesture } from './TabSwipeGesture';
/** @deprecated Use SafeScreen with scroll prop instead */
export { Screen } from './Screen';
