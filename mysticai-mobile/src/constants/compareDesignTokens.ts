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
    accent: '#D946EF',
    accentSoft: '#F5D0FE',
    surface: '#FEF3FF',
    border: '#F0ABFC',
    glow: 'rgba(217, 70, 239, 0.18)',
    icon: '💗',
  },
  work: {
    accent: '#2563EB',
    accentSoft: '#DBEAFE',
    surface: '#F2F7FF',
    border: '#93C5FD',
    glow: 'rgba(37, 99, 235, 0.16)',
    icon: '🤝',
  },
  friend: {
    accent: '#15803D',
    accentSoft: '#DCFCE7',
    surface: '#F1FCF5',
    border: '#86EFAC',
    glow: 'rgba(21, 128, 61, 0.18)',
    icon: '🌟',
  },
  family: {
    accent: '#C2410C',
    accentSoft: '#FFEDD5',
    surface: '#FFF7ED',
    border: '#FDBA74',
    glow: 'rgba(194, 65, 12, 0.16)',
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
