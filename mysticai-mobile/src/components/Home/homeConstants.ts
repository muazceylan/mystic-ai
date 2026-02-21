import { Dimensions } from 'react-native';
import { SPACING } from '../../constants/tokens';

/** Servis slider sabitleri */
export const SERVICE_SLIDE_IDS = [
  { id: 'planner', key: 'home.planner', emoji: '📅' },
  { id: 'dream', key: 'home.dreams', emoji: '🌙' },
  { id: 'numerology', key: 'home.numerology', emoji: '🔢' },
  { id: 'weekly', key: 'home.weeklyAnalysis', emoji: '📅' },
  { id: 'natal', key: 'home.birthChart', emoji: '⭐' },
  { id: 'compatibility', key: 'home.compatibility', emoji: '💕' },
  { id: 'name', key: 'home.nameAnalysis', emoji: '🧿' },
];

/** ACTION_MAP, SECRET_PATTERNS, DAILY_VIBE artık i18n'den okunuyor (home.actionMap, home.secretPatterns, home.dailyVibeFallback) */

export const RETRO_CAUTION_KEYS: Record<string, string> = {
  'Merkür': 'home.retroMercury', 'Mercury': 'home.retroMercury',
  'Venüs': 'home.retroVenus', 'Venus': 'home.retroVenus',
  'Mars': 'home.retroMars',
  'Jüpiter': 'home.retroJupiter', 'Jupiter': 'home.retroJupiter',
  'Satürn': 'home.retroSaturn', 'Saturn': 'home.retroSaturn',
  'Uranüs': 'home.retroUranus', 'Uranus': 'home.retroUranus',
  'Neptün': 'home.retroNeptune', 'Neptune': 'home.retroNeptune',
  'Plüton': 'home.retroPluto', 'Pluto': 'home.retroPluto',
};

/** ACTION_MAP odak ve enerji tipleri - i18n key yoluna göre kullanılır */
export const ACTION_MAP_FOCUS_KEYS = ['ask', 'para', 'kariyer', 'aile', 'arkadaslik', 'ticaret', 'genel'] as const;
export type ActionMapFocus = typeof ACTION_MAP_FOCUS_KEYS[number];

/** SECRET_PATTERNS odak tipleri */
export const SECRET_PATTERN_FOCUS_KEYS = ['ask', 'para', 'kariyer', 'aile', 'arkadaslik', 'ticaret', 'genel'] as const;

export const SUMMARY_MAX_CHARS = 90;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
export const HORIZONTAL_PADDING = SPACING.lgXl;
export const SLIDE_GAP = 0;
export const SLIDE_WIDTH = SCREEN_WIDTH - HORIZONTAL_PADDING * 2;
export const SLIDE_SNAP = SLIDE_WIDTH + SLIDE_GAP;
