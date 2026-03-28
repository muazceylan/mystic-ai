import React from 'react';
import { Image, View, StyleSheet, ImageStyle, ViewStyle } from 'react-native';

// ---------------------------------------------------------------------------
// Asset references — resolved once at module load
// ---------------------------------------------------------------------------
const ICON_512 = require('../../../assets/brand/logo/astro-guru-icon-512.png');
const ICON_TRANSPARENT_512 = require('../../../assets/brand/logo/astro-guru-icon-transparent-512.png');
const ICON_TRANSPARENT_128 = require('../../../assets/brand/logo/astro-guru-icon-transparent-128.png');
const MONO_WHITE = require('../../../assets/brand/logo/astro-guru-logo-monochrome-white.png');
const MONO_DARK = require('../../../assets/brand/logo/astro-guru-logo-monochrome-dark.png');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Controls which asset variant is selected. */
export type BrandVariant =
  | 'icon'             // solid-background square icon (default)
  | 'icon-transparent' // transparent-background icon; good on dark/gradient surfaces
  | 'mono-white'       // white monochrome logotype — for dark backgrounds
  | 'mono-dark';       // dark monochrome logotype — for light backgrounds

/** Predefined size tokens → pixel dimensions. */
export type BrandSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero';

const SIZE_MAP: Record<BrandSize, number> = {
  xs:   24,
  sm:   36,
  md:   48,
  lg:   64,
  xl:   80,
  hero: 96,
};

// ---------------------------------------------------------------------------
// BrandMark  (icon only — no container)
// ---------------------------------------------------------------------------

export interface BrandMarkProps {
  /** Visual asset to render. Defaults to 'icon'. */
  variant?: BrandVariant;
  /** Predefined size token or an explicit pixel size. */
  size?: BrandSize | number;
  /** Extra style applied to the Image. */
  style?: ImageStyle;
  accessibilityLabel?: string;
}

/**
 * The Astro Guru icon / logotype with no surrounding chrome.
 * Use this when you need the raw mark — e.g. inside a custom container.
 */
export function BrandMark({
  variant = 'icon',
  size = 'md',
  style,
  accessibilityLabel = 'Astro Guru',
}: BrandMarkProps) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size];
  const source = resolveSource(variant, px);

  return (
    <Image
      source={source}
      style={[{ width: px, height: px, resizeMode: 'contain' }, style]}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="image"
    />
  );
}

// ---------------------------------------------------------------------------
// BrandLogo  (icon inside a rounded container)
// ---------------------------------------------------------------------------

export interface BrandLogoProps extends BrandMarkProps {
  /**
   * Whether to wrap the icon in a rounded container.
   * Defaults to true for 'icon' and 'icon-transparent' variants.
   */
  rounded?: boolean;
  /** Background color of the container. Defaults to transparent. */
  containerColor?: string;
  /** Extra style applied to the outer container View. */
  containerStyle?: ViewStyle;
}

/**
 * The Astro Guru brand mark with an optional rounded-square container.
 * Preferred component for auth screens, profile headers, and modals.
 */
export function BrandLogo({
  variant = 'icon',
  size = 'md',
  rounded = true,
  containerColor,
  style,
  containerStyle,
  accessibilityLabel = 'Astro Guru',
}: BrandLogoProps) {
  const px = typeof size === 'number' ? size : SIZE_MAP[size];
  // Container is 12.5% larger than the icon to give breathing room
  const containerPx = Math.round(px * 1.125);
  const borderRadius = Math.round(containerPx * 0.25);

  const source = resolveSource(variant, px);

  if (!rounded) {
    return (
      <Image
        source={source}
        style={[{ width: px, height: px, resizeMode: 'contain' }, style]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      />
    );
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: containerPx,
          height: containerPx,
          borderRadius,
          backgroundColor: containerColor ?? 'transparent',
        },
        containerStyle,
      ]}
    >
      <Image
        source={source}
        style={[{ width: px, height: px, resizeMode: 'contain' }, style]}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="image"
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// BrandBadge  (compact inline badge — 24 px default, no container padding)
// ---------------------------------------------------------------------------

export interface BrandBadgeProps {
  variant?: BrandVariant;
  size?: number;
  style?: ImageStyle;
}

/**
 * Tiny inline brand mark for use next to text labels, list headers, etc.
 */
export function BrandBadge({ variant = 'icon-transparent', size = 24, style }: BrandBadgeProps) {
  const source = resolveSource(variant, size);
  return (
    <Image
      source={source}
      style={[{ width: size, height: size, resizeMode: 'contain' }, style]}
      accessibilityLabel="Astro Guru"
      accessibilityRole="image"
    />
  );
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function resolveSource(variant: BrandVariant, px: number) {
  switch (variant) {
    case 'icon-transparent':
      // Use the smaller 128px asset for anything ≤ 64px to save memory
      return px <= 64 ? ICON_TRANSPARENT_128 : ICON_TRANSPARENT_512;
    case 'mono-white':
      return MONO_WHITE;
    case 'mono-dark':
      return MONO_DARK;
    case 'icon':
    default:
      return ICON_512;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
