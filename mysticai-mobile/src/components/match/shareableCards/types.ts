import type { IoniconName } from '../../../constants/icons';
import type { RelationshipType } from '../../../services/synastry.service';
import type { ZodiacSign } from '../../../features/horoscope/types/horoscope.types';

export type ShareableCardsTabKey = 'all' | 'compatibility' | 'daily' | 'numerology';
export type ShareCardTypeKey =
  | 'compatibility_summary'
  | 'guru_card'
  | 'bond_snapshot'
  | 'daily_insight'
  | 'numerology_signature';
export type ShareCardThemeKey = 'romantic_night' | 'lavender_mist' | 'starlit_bloom';
export type ShareCardAspectRatioKey = 'story' | 'portrait';
export type ShareCardLayoutKey = 'spotlight' | 'duo' | 'insight';
export type ShareCardIconSetKey = 'cosmic' | 'romantic' | 'minimal';
export type ShareableCardsViewState = 'loading' | 'ready' | 'empty' | 'error';

export interface ShareableCardsSelectableOption<T extends string> {
  value: T;
  label: string;
  iconName: IoniconName;
}

export interface ShareableCardsTabItem {
  key: ShareableCardsTabKey;
  label: string;
  iconName: IoniconName;
}

export interface ShareableCardsPreviewMetric {
  id: 'love' | 'communication' | 'balance';
  label: string;
  value: number;
  iconName: IoniconName;
}

export interface ShareableCardsPreviewModel {
  title: string;
  cardTypeKey?: ShareCardTypeKey;
  score: number;
  leftPersonName: string;
  rightPersonName: string;
  leftPersonSignLabel: string;
  rightPersonSignLabel: string;
  leftPersonSignIcon: string;
  rightPersonSignIcon: string;
  relationshipLabel: string;
  summary: string;
  themeName: string;
  aspectRatio: ShareCardAspectRatioKey;
  relationshipType?: RelationshipType | null;
  metrics: ShareableCardsPreviewMetric[];
  brandLabel: string;
  sourceLabel?: string | null;
  cardTypeLabel?: string | null;
  layoutVariant: ShareCardLayoutKey;
  iconSet: ShareCardIconSetKey;
  themeVariant: ShareCardThemeKey;
}

/** Horoscope card preview data */
export interface HoroscopePreviewModel {
  title: string;
  sign: ZodiacSign;
  signEmoji: string;
  signName: string;
  date: string;
  generalText: string;
  highlights: string[];
  luckyColor?: string | null;
  luckyNumber?: string | null;
  mood?: string | null;
  brandLabel: string;
  themeVariant: ShareCardThemeKey;
  aspectRatio: ShareCardAspectRatioKey;
}

/** Numerology card preview data */
export interface NumerologyPreviewModel {
  title: string;
  name: string;
  mainNumber: number;
  headline: string;
  personalYear: number;
  shortTheme: string;
  brandLabel: string;
  themeVariant: ShareCardThemeKey;
  aspectRatio: ShareCardAspectRatioKey;
}

export interface ShareableCardsActionItem {
  key: string;
  label: string;
  iconName: IoniconName;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  tone?: 'default' | 'accent';
}
