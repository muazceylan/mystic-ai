import type { TextStyle } from 'react-native';
import type { Label, RelationshipType } from '../types/compare';
import { TYPOGRAPHY } from './tokens';

export interface CompareRelationshipPalette {
  accent: string;
  accentSoft: string;
  surface: string;
  border: string;
  glow: string;
  icon: string;
}

export const COMPARE_RELATIONSHIP_TOKENS: Record<RelationshipType, CompareRelationshipPalette> = {
  love: {
    accent: '#DB2777',
    accentSoft: '#FCE7F3',
    surface: '#FFF5FA',
    border: '#F9A8D4',
    glow: 'rgba(219, 39, 119, 0.18)',
    icon: '💗',
  },
  work: {
    accent: '#4338CA',
    accentSoft: '#E0E7FF',
    surface: '#F5F7FF',
    border: '#A5B4FC',
    glow: 'rgba(67, 56, 202, 0.16)',
    icon: '🤝',
  },
  friend: {
    accent: '#0F766E',
    accentSoft: '#CCFBF1',
    surface: '#F0FDFA',
    border: '#5EEAD4',
    glow: 'rgba(15, 118, 110, 0.18)',
    icon: '🌟',
  },
  family: {
    accent: '#B45309',
    accentSoft: '#FEF3C7',
    surface: '#FFF9EB',
    border: '#FCD34D',
    glow: 'rgba(180, 83, 9, 0.16)',
    icon: '🏠',
  },
  rival: {
    accent: '#BE123C',
    accentSoft: '#FFE4E6',
    surface: '#FFF1F4',
    border: '#FDA4AF',
    glow: 'rgba(190, 18, 60, 0.18)',
    icon: '🥊',
  },
};

export interface CompareBadgePalette {
  bg: string;
  border: string;
  text: string;
  soft: string;
}

export const COMPARE_BADGE_TOKENS: Record<Label, CompareBadgePalette> = {
  Uyumlu: {
    bg: '#EAF9F0',
    border: '#B7E7C8',
    text: '#166534',
    soft: '#F3FCF6',
  },
  Gelişim: {
    bg: '#FFF6E8',
    border: '#F3D9A9',
    text: '#9A5A0A',
    soft: '#FFFAF0',
  },
  Dikkat: {
    bg: '#FDEEEF',
    border: '#F8C5CB',
    text: '#9F1239',
    soft: '#FFF6F7',
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

export function getRelationshipPalette(type: RelationshipType): CompareRelationshipPalette {
  return COMPARE_RELATIONSHIP_TOKENS[type];
}

export function getCompareBadgePalette(label: Label): CompareBadgePalette {
  return COMPARE_BADGE_TOKENS[label];
}
