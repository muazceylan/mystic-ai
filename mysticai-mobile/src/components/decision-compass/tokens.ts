import type { ThemeColors } from '../../context/ThemeContext';

export function getCompassTokens(colors: ThemeColors, isDark: boolean) {
  const surface = {
    base: isDark ? 'rgba(20, 18, 36, 0.78)' : 'rgba(255, 255, 255, 0.82)',
    tinted: isDark ? 'rgba(42, 34, 66, 0.58)' : 'rgba(247, 240, 255, 0.84)',
    hero: isDark ? 'rgba(63, 48, 103, 0.52)' : 'rgba(241, 229, 255, 0.92)',
    heroPanel: isDark ? 'rgba(255, 255, 255, 0.09)' : 'rgba(255, 255, 255, 0.76)',
    featured: isDark ? 'rgba(31, 26, 53, 0.76)' : 'rgba(255, 255, 255, 0.74)',
    mini: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.70)',
  };

  const border = {
    soft: isDark ? 'rgba(229, 220, 255, 0.18)' : 'rgba(210, 188, 249, 0.68)',
    thin: isDark ? 'rgba(255, 255, 255, 0.10)' : 'rgba(232, 223, 251, 0.84)',
    hero: isDark ? 'rgba(238, 231, 255, 0.20)' : 'rgba(202, 173, 246, 0.78)',
  };

  const text = {
    primary: colors.text,
    secondary: isDark ? 'rgba(239, 231, 255, 0.76)' : '#746E89',
    body: isDark ? 'rgba(247, 242, 255, 0.88)' : '#4E495F',
    accent: isDark ? '#D8BEFF' : '#8E54EB',
  };

  const lilac = {
    primary: isDark ? '#CDAFFF' : '#9A63F5',
    soft: isDark ? 'rgba(205, 175, 255, 0.18)' : 'rgba(196, 170, 255, 0.22)',
  };

  const pink = {
    soft: isDark ? 'rgba(255, 187, 221, 0.16)' : 'rgba(255, 211, 232, 0.26)',
  };

  const glow = {
    page: isDark ? 'rgba(170, 148, 246, 0.16)' : 'rgba(228, 214, 255, 0.72)',
    hero: isDark ? 'rgba(225, 208, 255, 0.16)' : 'rgba(255, 246, 255, 0.82)',
    card: isDark ? 'rgba(211, 186, 255, 0.12)' : 'rgba(248, 236, 255, 0.72)',
  };

  const gradients = {
    page: isDark
      ? ['#0F1021', '#17162C', '#1E1935'] as [string, string, string]
      : ['#EFE8FF', '#EAE0FF', '#F4EEFF'] as [string, string, string],
    pageHaze: isDark
      ? ['rgba(151, 128, 230, 0.20)', 'rgba(151, 128, 230, 0.00)'] as [string, string]
      : ['rgba(233, 220, 255, 0.88)', 'rgba(233, 220, 255, 0.00)'] as [string, string],
    pagePinkHaze: isDark
      ? ['rgba(255, 183, 219, 0.14)', 'rgba(255, 183, 219, 0.00)'] as [string, string]
      : ['rgba(255, 224, 239, 0.82)', 'rgba(255, 224, 239, 0.00)'] as [string, string],
    pageBlueHaze: isDark
      ? ['rgba(170, 188, 255, 0.14)', 'rgba(170, 188, 255, 0.00)'] as [string, string]
      : ['rgba(227, 236, 255, 0.80)', 'rgba(227, 236, 255, 0.00)'] as [string, string],
    hero: isDark
      ? ['rgba(115, 88, 210, 0.72)', 'rgba(100, 72, 188, 0.58)', 'rgba(50, 36, 100, 0.46)'] as [string, string, string]
      : ['#A78BFA', '#C4B5FD', '#EDE9FE'] as [string, string, string],
    heroOverlay: isDark
      ? ['rgba(255, 255, 255, 0.18)', 'rgba(255, 255, 255, 0.02)'] as [string, string]
      : ['rgba(255, 255, 255, 0.82)', 'rgba(255, 255, 255, 0.00)'] as [string, string],
    heroPanel: isDark
      ? ['rgba(255, 255, 255, 0.16)', 'rgba(255, 255, 255, 0.07)'] as [string, string]
      : ['rgba(255, 255, 255, 0.94)', 'rgba(248, 241, 255, 0.82)'] as [string, string],
    heroCta: isDark
      ? ['rgba(220, 200, 255, 0.38)', 'rgba(186, 158, 250, 0.28)'] as [string, string]
      : ['rgba(248, 240, 255, 1.00)', 'rgba(236, 218, 255, 0.97)'] as [string, string],
    featuredPink: isDark
      ? ['rgba(84, 56, 82, 0.84)', 'rgba(65, 40, 74, 0.78)'] as [string, string]
      : ['#FFF0F7', '#F8E6F1'] as [string, string],
    featuredBlue: isDark
      ? ['rgba(54, 62, 94, 0.84)', 'rgba(38, 46, 80, 0.78)'] as [string, string]
      : ['#EEF4FF', '#E7EEFF'] as [string, string],
    featuredGold: isDark
      ? ['rgba(102, 78, 64, 0.84)', 'rgba(92, 56, 100, 0.74)'] as [string, string]
      : ['#FFE8C8', '#F3D9FF'] as [string, string],
    featuredCosmic: isDark
      ? ['rgba(76, 68, 132, 0.84)', 'rgba(108, 72, 160, 0.76)'] as [string, string]
      : ['#DCCBFF', '#F5D8FF'] as [string, string],
    featuredMoon: isDark
      ? ['rgba(82, 86, 132, 0.84)', 'rgba(108, 90, 154, 0.76)'] as [string, string]
      : ['#E7E2FF', '#F7ECFF'] as [string, string],
    featuredLilac: isDark
      ? ['rgba(74, 60, 110, 0.84)', 'rgba(55, 42, 92, 0.78)'] as [string, string]
      : ['#FAF0FF', '#F0E5FF'] as [string, string],
    featuredArtPink: isDark
      ? ['rgba(255, 160, 210, 0.38)', 'rgba(220, 120, 178, 0.26)'] as [string, string]
      : ['#FBCFE8', '#F9A8D4'] as [string, string],
    featuredArtBlue: isDark
      ? ['rgba(160, 192, 255, 0.36)', 'rgba(110, 140, 230, 0.24)'] as [string, string]
      : ['#BFDBFE', '#A5B4FC'] as [string, string],
    featuredArtLilac: isDark
      ? ['rgba(200, 172, 255, 0.38)', 'rgba(152, 118, 242, 0.26)'] as [string, string]
      : ['#DDD6FE', '#C4B5FD'] as [string, string],
    pillPrimary: isDark
      ? ['rgba(218, 196, 255, 0.34)', 'rgba(183, 152, 250, 0.24)'] as [string, string]
      : ['rgba(248, 240, 255, 0.99)', 'rgba(234, 216, 255, 0.96)'] as [string, string],
    pillSoft: isDark
      ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)'] as [string, string]
      : ['rgba(255, 255, 255, 0.92)', 'rgba(251, 247, 255, 0.78)'] as [string, string],
    chipDefault: isDark
      ? ['rgba(255, 255, 255, 0.08)', 'rgba(255, 255, 255, 0.04)'] as [string, string]
      : ['rgba(255, 255, 255, 0.92)', 'rgba(251, 246, 255, 0.80)'] as [string, string],
    chipSelected: isDark
      ? ['rgba(193, 165, 255, 0.26)', 'rgba(159, 129, 240, 0.18)'] as [string, string]
      : ['rgba(233, 220, 255, 1)', 'rgba(221, 204, 255, 0.96)'] as [string, string],
    chipAction: isDark
      ? ['rgba(182, 154, 255, 0.16)', 'rgba(158, 130, 240, 0.12)'] as [string, string]
      : ['rgba(239, 230, 255, 0.96)', 'rgba(232, 222, 255, 0.92)'] as [string, string],
    miniCard: isDark
      ? ['rgba(255,255,255,0.07)', 'rgba(255,255,255,0.04)'] as [string, string]
      : ['#FFF9FF', '#F8F0FF'] as [string, string],
    section: isDark
      ? ['rgba(36, 30, 61, 0.84)', 'rgba(28, 23, 52, 0.76)'] as [string, string]
      : ['rgba(252, 246, 255, 0.94)', 'rgba(245, 237, 255, 0.88)'] as [string, string],
    tabGlass: isDark
      ? ['rgba(22, 18, 40, 0.52)', 'rgba(22, 18, 40, 0.24)', 'rgba(22, 18, 40, 0.10)'] as [string, string, string]
      : ['rgba(255, 255, 255, 0.74)', 'rgba(249, 245, 255, 0.52)', 'rgba(245, 239, 255, 0.30)'] as [string, string, string],
  };

  return {
    spacing: {
      xs: 6,
      sm: 10,
      md: 14,
      lg: 18,
      xl: 24,
    },
    radii: {
      chip: 24,
      card: 28,
      panel: 24,
      mini: 20,
      pill: 999,
    },
    colors: {
      surface,
      border,
      text,
      lilac,
      pink,
      glow,
    },
    gradients,
    shadows: {
      soft: {
        shadowColor: isDark ? '#000000' : '#BDA3EA',
        shadowOpacity: isDark ? 0.20 : 0.11,
        shadowRadius: isDark ? 16 : 14,
        shadowOffset: { width: 0, height: isDark ? 10 : 8 },
        elevation: isDark ? 4 : 3,
      },
      ambient: {
        shadowColor: isDark ? '#000000' : '#C8B0F2',
        shadowOpacity: isDark ? 0.28 : 0.14,
        shadowRadius: isDark ? 24 : 20,
        shadowOffset: { width: 0, height: isDark ? 14 : 12 },
        elevation: isDark ? 7 : 5,
      },
      hero: {
        shadowColor: isDark ? '#000000' : '#C8B0F2',
        shadowOpacity: isDark ? 0.30 : 0.18,
        shadowRadius: isDark ? 28 : 24,
        shadowOffset: { width: 0, height: isDark ? 16 : 14 },
        elevation: isDark ? 8 : 6,
      },
    },
    page: {
      backgroundGradient: gradients.page,
      blobA: isDark ? 'rgba(169, 149, 242, 0.22)' : 'rgba(210, 193, 255, 0.90)',
      blobB: isDark ? 'rgba(255, 193, 219, 0.16)' : 'rgba(255, 216, 234, 0.88)',
      blobC: isDark ? 'rgba(188, 204, 255, 0.14)' : 'rgba(220, 232, 255, 0.86)',
      blobD: isDark ? 'rgba(242, 225, 255, 0.14)' : 'rgba(240, 228, 255, 0.88)',
      blobE: isDark ? 'rgba(184, 156, 255, 0.14)' : 'rgba(228, 218, 255, 0.82)',
    },
    border,
    shadow: {
      cardColor: isDark ? '#000000' : '#BCA1EE',
      cardOpacity: isDark ? 0.24 : 0.16,
      cardRadius: isDark ? 24 : 18,
      cardOffsetY: isDark ? 12 : 10,
    },
    hero: {
      gradient: gradients.hero,
      panelGradient: gradients.heroPanel,
      ctaGradient: gradients.heroCta,
    },
    chip: {
      defaultGradient: gradients.chipDefault,
      selectedGradient: gradients.chipSelected,
      actionGradient: gradients.chipAction,
    },
    featuredCardGradients: [gradients.featuredLilac, gradients.featuredBlue, gradients.featuredPink],
    featuredArtGradients: [gradients.featuredArtLilac, gradients.featuredArtBlue, gradients.featuredArtPink],
    surface: {
      glass: surface.base,
      soft: surface.tinted,
      mini: surface.mini,
    },
    text: {
      title: text.primary,
      subtitle: text.secondary,
      body: text.body,
      accent: text.accent,
    },
  };
}
