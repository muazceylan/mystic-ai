import type { ImageSourcePropType, TextStyle } from 'react-native';
import type { MatchResultKind } from '../types/match';
import { TYPOGRAPHY } from './tokens';

export type MatchBadgeTone = MatchResultKind | 'DESTEKLEYICI' | 'ZORLAYICI';

export interface MatchBadgePalette {
  background: string;
  border: string;
  text: string;
  softSurface: string;
}

export const MATCH_BADGE_TOKENS: Record<MatchBadgeTone, MatchBadgePalette> = {
  UYUMLU: {
    background: '#EAF8EF',
    border: '#BCE3CA',
    text: '#166534',
    softSurface: '#F2FBF5',
  },
  GELISIM_ALANI: {
    background: '#FFF6E8',
    border: '#F4DEB8',
    text: '#9A5A0A',
    softSurface: '#FFF9EE',
  },
  DIKKAT: {
    background: '#FEEFEF',
    border: '#F8CACA',
    text: '#9F1239',
    softSurface: '#FEF2F2',
  },
  DESTEKLEYICI: {
    background: '#E8FFF4',
    border: '#A7F3D0',
    text: '#0D8B56',
    softSurface: '#ECFDF3',
  },
  ZORLAYICI: {
    background: '#FFF0F0',
    border: '#FECACA',
    text: '#B42318',
    softSurface: '#FEF2F2',
  },
};

export const MATCH_GROUP_TYPOGRAPHY: Record<
  'sectionKicker' | 'detailGroupTitle' | 'matrixGroupHeader',
  TextStyle
> = {
  sectionKicker: {
    ...TYPOGRAPHY.CaptionBold,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.45,
  },
  detailGroupTitle: {
    ...TYPOGRAPHY.H3,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  matrixGroupHeader: {
    ...TYPOGRAPHY.CaptionBold,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
};

export const MATCH_AVATAR_FALLBACK_ASSETS: Record<'left' | 'right', ImageSourcePropType> = {
  left: require('../../assets/avatars/avatar-fallback-left.png') as ImageSourcePropType,
  right: require('../../assets/avatars/avatar-fallback-right.png') as ImageSourcePropType,
};

export function getMatchBadgePalette(tone: MatchBadgeTone): MatchBadgePalette {
  return MATCH_BADGE_TOKENS[tone];
}
