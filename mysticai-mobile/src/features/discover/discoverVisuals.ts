import { COLORS } from '../../constants/colors';
import { CATEGORY_ICONS, MODULE_ICONS } from '../../constants/icons';
import type {
  DiscoverCategoryKey,
  DiscoverIconName,
  DiscoverModuleKey,
} from './catalog';

export interface DiscoverVisual {
  icon: DiscoverIconName;
  gradientLight: [string, string];
  gradientDark: [string, string];
  iconLight: string;
  iconDark: string;
  glowLight: string;
  glowDark: string;
  ringLight: string;
  ringDark: string;
}

type ExploreCardVisualInput = {
  cardKey: string;
  categoryKey?: string;
  routeKey?: string;
  fallbackRouteKey?: string;
};

type VisualTone = Omit<DiscoverVisual, 'icon'>;

const TONES: Record<
  | 'cosmic'
  | 'mystic'
  | 'lunar'
  | 'rose'
  | 'insight'
  | 'sacred'
  | 'oracle',
  VisualTone
> = {
  cosmic: {
    gradientLight: [COLORS.blue, COLORS.primary],
    gradientDark: [COLORS.themeDarkAccent, COLORS.themeDarkPrimary],
    iconLight: '#F8FAFC',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(46,74,156,0.18)',
    glowDark: 'rgba(96,165,250,0.24)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.30)',
  },
  mystic: {
    gradientLight: [COLORS.primaryLight, COLORS.primary700],
    gradientDark: [COLORS.themeDarkPrimaryLight, COLORS.primaryDark],
    iconLight: '#FCFAFF',
    iconDark: '#F5F3FF',
    glowLight: 'rgba(157,78,221,0.20)',
    glowDark: 'rgba(168,85,247,0.28)',
    ringLight: 'rgba(199,132,247,0.30)',
    ringDark: 'rgba(216,180,254,0.34)',
  },
  lunar: {
    gradientLight: [COLORS.moonBlue, COLORS.primaryDark],
    gradientDark: [COLORS.themeDarkAccent, '#172554'],
    iconLight: '#F8FAFC',
    iconDark: '#E0F2FE',
    glowLight: 'rgba(94,66,187,0.18)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(123,158,199,0.34)',
    ringDark: 'rgba(147,197,253,0.28)',
  },
  rose: {
    gradientLight: [COLORS.primaryLight, COLORS.accent],
    gradientDark: [COLORS.themeDarkPrimary, COLORS.themeDarkAccent],
    iconLight: '#FAF7FF',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(157,78,221,0.18)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.30)',
  },
  insight: {
    gradientLight: [COLORS.moonBlue, COLORS.accent],
    gradientDark: [COLORS.themeDarkAccent, COLORS.themeDarkSurface],
    iconLight: '#F8FAFC',
    iconDark: '#E2E8F0',
    glowLight: 'rgba(46,74,156,0.16)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(123,158,199,0.30)',
    ringDark: 'rgba(148,163,184,0.26)',
  },
  sacred: {
    gradientLight: ['#C7D2FE', '#4F46E5'],
    gradientDark: ['#818CF8', '#312E81'],
    iconLight: '#FCFAFF',
    iconDark: '#EEF2FF',
    glowLight: 'rgba(94,66,187,0.18)',
    glowDark: 'rgba(129,140,248,0.24)',
    ringLight: 'rgba(94,66,187,0.24)',
    ringDark: 'rgba(196,181,253,0.28)',
  },
  oracle: {
    gradientLight: [COLORS.primary, COLORS.accent],
    gradientDark: [COLORS.themeDarkPrimary, COLORS.themeDarkAccent],
    iconLight: '#FAF7FF',
    iconDark: '#F1F5F9',
    glowLight: 'rgba(157,78,221,0.18)',
    glowDark: 'rgba(96,165,250,0.22)',
    ringLight: 'rgba(157,78,221,0.24)',
    ringDark: 'rgba(168,85,247,0.30)',
  },
};

const CATEGORY_VISUALS: Record<DiscoverCategoryKey, DiscoverVisual> = {
  cosmic_flow: {
    icon: CATEGORY_ICONS.cosmic_flow,
    ...TONES.cosmic,
  },
  self_discovery: {
    icon: CATEGORY_ICONS.self_discovery,
    ...TONES.mystic,
  },
  spiritual: {
    icon: CATEGORY_ICONS.spiritual,
    ...TONES.sacred,
  },
  social_compat: {
    icon: CATEGORY_ICONS.social_compat,
    ...TONES.rose,
  },
};

const MODULE_VISUALS: Record<DiscoverModuleKey, DiscoverVisual> = {
  horoscope_daily: {
    icon: 'sunny',
    ...TONES.rose,
  },
  transits_today: {
    icon: 'planet',
    ...TONES.cosmic,
  },
  night_sky: {
    icon: 'moon',
    ...TONES.lunar,
  },
  weekly: {
    icon: 'analytics',
    ...TONES.cosmic,
  },
  calendar: {
    icon: 'calendar',
    ...TONES.cosmic,
  },
  lucky_hours: {
    icon: 'time',
    ...TONES.oracle,
  },
  natal_chart: {
    icon: 'planet',
    ...TONES.insight,
  },
  numerology: {
    icon: 'keypad',
    ...TONES.mystic,
  },
  name_analysis: {
    icon: 'text',
    ...TONES.insight,
  },
  decision_compass: {
    icon: 'compass',
    ...TONES.cosmic,
  },
  spiritual_dua: {
    icon: 'heart-circle',
    ...TONES.sacred,
  },
  spiritual_esma: {
    icon: 'sparkles',
    ...TONES.oracle,
  },
  spiritual_sure: {
    icon: 'document-text',
    ...TONES.insight,
  },
  spiritual_meditation: {
    icon: 'leaf',
    ...TONES.mystic,
  },
  spiritual_breathing: {
    icon: 'water',
    ...TONES.lunar,
  },
  spiritual_recommendations: {
    icon: 'heart',
    ...TONES.rose,
  },
  compatibility: {
    icon: 'people',
    ...TONES.rose,
  },
  star_mate: {
    icon: 'sparkles',
    ...TONES.rose,
  },
  share_cards: {
    icon: 'images',
    ...TONES.cosmic,
  },
  relation_matrix: {
    icon: 'grid',
    ...TONES.insight,
  },
};

function normalizeToken(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function resolveCategoryVisual(categoryKey?: string): DiscoverVisual {
  const normalizedCategory = normalizeToken(categoryKey ?? '');
  if (normalizedCategory in CATEGORY_VISUALS) {
    return CATEGORY_VISUALS[normalizedCategory as DiscoverCategoryKey];
  }
  return CATEGORY_VISUALS.self_discovery;
}

function inferModuleKey(value: string): DiscoverModuleKey | null {
  if (!value) return null;

  if (value.includes('night_sky') || value.includes('birth_sky')) return 'night_sky';
  if (value.includes('horoscope') || value.includes('burc')) return 'horoscope_daily';
  if (value.includes('transit') || value.includes('sky_pulse') || value.includes('daily_summary')) return 'transits_today';
  if (value.includes('weekly') || value.includes('swot')) return 'weekly';
  if (value.includes('calendar') || value.includes('planner')) return 'calendar';
  if (value.includes('lucky') || value.includes('ugurlu') || value.includes('sansli')) return 'lucky_hours';
  if (value.includes('natal')) return 'natal_chart';
  if (value.includes('numerology') || value.includes('numeroloji')) return 'numerology';
  if (value.includes('name_analysis') || value.includes('isim') || value.includes('name')) return 'name_analysis';
  if (value.includes('decision') || value.includes('compass') || value.includes('pusula')) return 'decision_compass';
  if (value.includes('esma') || value.includes('asma')) return 'spiritual_esma';
  if (value.includes('sure') || value.includes('surah') || value.includes('ayet')) return 'spiritual_sure';
  if (value.includes('meditation') || value.includes('meditasyon')) return 'spiritual_meditation';
  if (value.includes('breath') || value.includes('nefes')) return 'spiritual_breathing';
  if (value.includes('recommend') || value.includes('oneri')) return 'spiritual_recommendations';
  if (value.includes('dua') || value.includes('prayer')) return 'spiritual_dua';
  if (value.includes('compatibility') || value.includes('uyum')) return 'compatibility';
  if (value.includes('star_mate') || value.includes('soul_mate') || value.includes('esles')) return 'star_mate';
  if (value.includes('share') || value.includes('paylas')) return 'share_cards';
  if (value.includes('relation') || value.includes('matrix') || value.includes('matris')) return 'relation_matrix';

  return null;
}

function resolveFallbackIcon(icon?: DiscoverIconName, categoryKey?: string): DiscoverIconName {
  if (icon) return icon;
  const categoryVisual = resolveCategoryVisual(categoryKey);
  return categoryVisual.icon;
}

export function getDiscoverVisualForModule(input: {
  key: DiscoverModuleKey;
  icon?: DiscoverIconName;
  categoryKey: DiscoverCategoryKey;
}): DiscoverVisual {
  return MODULE_VISUALS[input.key] ?? {
    ...resolveCategoryVisual(input.categoryKey),
    icon: resolveFallbackIcon(input.icon, input.categoryKey),
  };
}

export function getDiscoverVisualForCmsCard(card: ExploreCardVisualInput): DiscoverVisual {
  const normalizedFragments = [
    normalizeToken(card.cardKey),
    normalizeToken(card.routeKey ?? ''),
    normalizeToken(card.fallbackRouteKey ?? ''),
    normalizeToken(card.categoryKey ?? ''),
  ].filter(Boolean);

  for (const fragment of normalizedFragments) {
    const inferredKey = inferModuleKey(fragment);
    if (inferredKey) {
      return MODULE_VISUALS[inferredKey];
    }
  }

  const categoryVisual = resolveCategoryVisual(card.categoryKey);
  const categoryIcon = (() => {
    const normalizedCategory = normalizeToken(card.categoryKey ?? '');
    if (normalizedCategory === 'cosmic_flow') return MODULE_ICONS.transits;
    if (normalizedCategory === 'spiritual') return MODULE_ICONS.spiritual;
    if (normalizedCategory === 'social_compat') return MODULE_ICONS.compatibility;
    return MODULE_ICONS.natal_chart;
  })();

  return {
    ...categoryVisual,
    icon: categoryIcon,
  };
}
