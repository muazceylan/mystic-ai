import type { TextStyle } from 'react-native';
import type { Label, RelationshipType } from '../types/compare';
import { TYPOGRAPHY } from './tokens';

export interface CompareRelationshipPalette {
  accent: string;
  accentSoft: string;
  surface: string;
  border: string;
  glow: string;
  ringStart: string;
  ringEnd: string;
  ringTrack: string;
  icon: string;
}

type CompareRelationshipPaletteModes = {
  light: CompareRelationshipPalette;
  dark: CompareRelationshipPalette;
};

export const COMPARE_RELATIONSHIP_TOKENS: Record<RelationshipType, CompareRelationshipPaletteModes> = {
  love: {
    light: {
      accent: '#DB2777',
      accentSoft: '#FCE7F3',
      surface: '#FFF5FA',
      border: '#F9A8D4',
      glow: 'rgba(219, 39, 119, 0.18)',
      ringStart: '#F9A8D4',
      ringEnd: '#DB2777',
      ringTrack: '#FCE7F3',
      icon: '💗',
    },
    dark: {
      accent: '#F472B6',
      accentSoft: 'rgba(244, 114, 182, 0.18)',
      surface: '#32111F',
      border: 'rgba(244, 114, 182, 0.3)',
      glow: 'rgba(244, 114, 182, 0.22)',
      ringStart: '#F9A8D4',
      ringEnd: '#F472B6',
      ringTrack: 'rgba(244, 114, 182, 0.16)',
      icon: '💗',
    },
  },
  work: {
    light: {
      accent: '#4338CA',
      accentSoft: '#E0E7FF',
      surface: '#F5F7FF',
      border: '#A5B4FC',
      glow: 'rgba(67, 56, 202, 0.16)',
      ringStart: '#A5B4FC',
      ringEnd: '#4338CA',
      ringTrack: '#E0E7FF',
      icon: '🤝',
    },
    dark: {
      accent: '#818CF8',
      accentSoft: 'rgba(129, 140, 248, 0.18)',
      surface: '#141C38',
      border: 'rgba(129, 140, 248, 0.3)',
      glow: 'rgba(129, 140, 248, 0.22)',
      ringStart: '#C7D2FE',
      ringEnd: '#818CF8',
      ringTrack: 'rgba(129, 140, 248, 0.16)',
      icon: '🤝',
    },
  },
  friend: {
    light: {
      accent: '#0F766E',
      accentSoft: '#CCFBF1',
      surface: '#F0FDFA',
      border: '#5EEAD4',
      glow: 'rgba(15, 118, 110, 0.18)',
      ringStart: '#99F6E4',
      ringEnd: '#0F766E',
      ringTrack: '#CCFBF1',
      icon: '🌟',
    },
    dark: {
      accent: '#2DD4BF',
      accentSoft: 'rgba(45, 212, 191, 0.18)',
      surface: '#0D2525',
      border: 'rgba(45, 212, 191, 0.28)',
      glow: 'rgba(45, 212, 191, 0.22)',
      ringStart: '#99F6E4',
      ringEnd: '#2DD4BF',
      ringTrack: 'rgba(45, 212, 191, 0.16)',
      icon: '🌟',
    },
  },
  family: {
    light: {
      accent: '#B45309',
      accentSoft: '#FEF3C7',
      surface: '#FFF9EB',
      border: '#FCD34D',
      glow: 'rgba(180, 83, 9, 0.16)',
      ringStart: '#FDE68A',
      ringEnd: '#B45309',
      ringTrack: '#FEF3C7',
      icon: '🏠',
    },
    dark: {
      accent: '#FBBF24',
      accentSoft: 'rgba(251, 191, 36, 0.18)',
      surface: '#2D230F',
      border: 'rgba(251, 191, 36, 0.28)',
      glow: 'rgba(251, 191, 36, 0.22)',
      ringStart: '#FDE68A',
      ringEnd: '#FBBF24',
      ringTrack: 'rgba(251, 191, 36, 0.16)',
      icon: '🏠',
    },
  },
  rival: {
    light: {
      accent: '#BE123C',
      accentSoft: '#FFE4E6',
      surface: '#FFF1F4',
      border: '#FDA4AF',
      glow: 'rgba(190, 18, 60, 0.18)',
      ringStart: '#FDA4AF',
      ringEnd: '#BE123C',
      ringTrack: '#FFE4E6',
      icon: '🥊',
    },
    dark: {
      accent: '#FB7185',
      accentSoft: 'rgba(251, 113, 133, 0.18)',
      surface: '#34101A',
      border: 'rgba(251, 113, 133, 0.3)',
      glow: 'rgba(251, 113, 133, 0.22)',
      ringStart: '#FDA4AF',
      ringEnd: '#FB7185',
      ringTrack: 'rgba(251, 113, 133, 0.16)',
      icon: '🥊',
    },
  },
};

export interface CompareBadgePalette {
  bg: string;
  border: string;
  text: string;
  soft: string;
}

type CompareBadgePaletteModes = {
  light: CompareBadgePalette;
  dark: CompareBadgePalette;
};

export const COMPARE_BADGE_TOKENS: Record<Label, CompareBadgePaletteModes> = {
  Uyumlu: {
    light: {
      bg: '#EAF9F0',
      border: '#B7E7C8',
      text: '#166534',
      soft: '#F3FCF6',
    },
    dark: {
      bg: 'rgba(52, 211, 153, 0.14)',
      border: 'rgba(52, 211, 153, 0.3)',
      text: '#A7F3D0',
      soft: 'rgba(6, 95, 70, 0.36)',
    },
  },
  Gelişim: {
    light: {
      bg: '#FFF6E8',
      border: '#F3D9A9',
      text: '#9A5A0A',
      soft: '#FFFAF0',
    },
    dark: {
      bg: 'rgba(251, 146, 60, 0.16)',
      border: 'rgba(251, 146, 60, 0.3)',
      text: '#FDBA74',
      soft: 'rgba(154, 82, 10, 0.34)',
    },
  },
  Dikkat: {
    light: {
      bg: '#FDEEEF',
      border: '#F8C5CB',
      text: '#9F1239',
      soft: '#FFF6F7',
    },
    dark: {
      bg: 'rgba(248, 113, 113, 0.16)',
      border: 'rgba(248, 113, 113, 0.3)',
      text: '#FCA5A5',
      soft: 'rgba(127, 29, 29, 0.34)',
    },
  },
};

export const COMPARE_TYPOGRAPHY: Record<'groupHeader' | 'groupMeta' | 'cardTitle', TextStyle> = {
  groupHeader: {
    ...TYPOGRAPHY.H3,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  groupMeta: {
    ...TYPOGRAPHY.CaptionBold,
    fontWeight: '700',
    letterSpacing: 0.2,
    textTransform: 'uppercase',
  },
  cardTitle: {
    ...TYPOGRAPHY.BodyLarge,
    fontWeight: '800',
    letterSpacing: -0.15,
  },
};

export function getRelationshipPalette(type: RelationshipType, isDark = false): CompareRelationshipPalette {
  return COMPARE_RELATIONSHIP_TOKENS[type][isDark ? 'dark' : 'light'];
}

export function getCompareBadgePalette(label: Label, isDark = false): CompareBadgePalette {
  return COMPARE_BADGE_TOKENS[label][isDark ? 'dark' : 'light'];
}
