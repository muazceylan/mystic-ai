import type { PosterTone } from './poster.types';

export const posterTokens = {
  frame: {
    width: 360,
    height: 708,
    radius: 30,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 26,
  },
  colors: {
    bgTop: '#060816',
    bgBottom: '#02030A',
    navy: '#0B1226',
    violet: '#4B2A7A',
    indigo: '#1E295E',
    gold: '#D9BC74',
    goldSoft: 'rgba(217,188,116,0.72)',
    textPrimary: '#F4F1EA',
    textSecondary: 'rgba(244,241,234,0.74)',
    textMuted: 'rgba(244,241,234,0.44)',
    cardBorder: 'rgba(217,188,116,0.18)',
    cardSurface: 'rgba(10,14,28,0.72)',
    ring: 'rgba(255,255,255,0.10)',
    ringStrong: 'rgba(255,255,255,0.18)',
    glowViolet: 'rgba(124,92,255,0.16)',
    glowBlue: 'rgba(90,140,255,0.16)',
    glowGold: 'rgba(217,188,116,0.18)',
    glowRose: 'rgba(244,162,198,0.18)',
    glowSilver: 'rgba(216,227,247,0.18)',
    surfaceStrong: 'rgba(9,12,24,0.9)',
    surfaceSoft: 'rgba(255,255,255,0.03)',
    lineSoft: 'rgba(255,255,255,0.08)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 28,
    xxxl: 36,
  },
  radius: {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 28,
    pill: 999,
  },
  typography: {
    eyebrowSize: 11,
    titleSize: 33,
    subtitleSize: 16,
    metaSize: 13,
    metaSmall: 11,
  },
  disc: {
    size: 316,
    ringFractions: [0.28, 0.44, 0.62, 0.82, 0.96],
    badgeOffsetDistance: 0.045,
  },
  motion: {
    hazeDurationMs: 4200,
    pulseDurationMs: 2800,
  },
} as const;

export const toneColorMap: Record<
  PosterTone,
  {
    glow: string;
    border: string;
    fill: string;
    symbol: string;
  }
> = {
  gold: {
    glow: 'rgba(217,188,116,0.22)',
    border: 'rgba(224,196,128,0.78)',
    fill: '#E0C480',
    symbol: '#FFF6D6',
  },
  moon: {
    glow: 'rgba(216,227,247,0.2)',
    border: 'rgba(235,240,250,0.76)',
    fill: '#DEE6F2',
    symbol: '#FAFCFF',
  },
  violet: {
    glow: 'rgba(134,102,255,0.2)',
    border: 'rgba(164,138,255,0.76)',
    fill: '#9A82FF',
    symbol: '#F8F4FF',
  },
  blue: {
    glow: 'rgba(100,155,255,0.2)',
    border: 'rgba(140,188,255,0.76)',
    fill: '#82B2FF',
    symbol: '#F4F8FF',
  },
  silver: {
    glow: 'rgba(200,214,235,0.2)',
    border: 'rgba(205,218,236,0.76)',
    fill: '#BCCEE2',
    symbol: '#FAFCFF',
  },
  rose: {
    glow: 'rgba(244,168,210,0.2)',
    border: 'rgba(248,180,216,0.76)',
    fill: '#F0B4D0',
    symbol: '#FFF4FA',
  },
};
