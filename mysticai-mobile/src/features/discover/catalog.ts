import type { ComponentProps } from 'react';
import { Ionicons } from '@expo/vector-icons';

export type DiscoverCategoryKey =
  | 'cosmic_flow'
  | 'self_discovery'
  | 'spiritual'
  | 'social_compat';

export type DiscoverModuleKey =
  | 'horoscope_daily'
  | 'transits_today'
  | 'night_sky'
  | 'weekly'
  | 'calendar'
  | 'lucky_hours'
  | 'natal_chart'
  | 'numerology'
  | 'name_analysis'
  | 'decision_compass'
  | 'spiritual_prayers'
  | 'spiritual_esma'
  | 'spiritual_meditation'
  | 'spiritual_breathing'
  | 'spiritual_recommendations'
  | 'compatibility'
  | 'star_mate'
  | 'share_cards'
  | 'relation_matrix';

export type DiscoverIconName = ComponentProps<typeof Ionicons>['name'];

export interface DiscoverModule {
  key: DiscoverModuleKey;
  categoryKey: DiscoverCategoryKey;
  title: string;
  subtitle: string;
  icon: DiscoverIconName;
  route?: string;
  keywords: string[];
  todayPriority?: boolean;
  recommended?: boolean;
}

export interface DiscoverCategory {
  key: DiscoverCategoryKey;
  title: string;
  subtitle: string;
}

type Translate = (key: string) => string;

type DiscoverCategoryDefinition = {
  key: DiscoverCategoryKey;
  titleKey: string;
  subtitleKey: string;
};

type DiscoverModuleDefinition = {
  key: DiscoverModuleKey;
  categoryKey: DiscoverCategoryKey;
  titleKey: string;
  subtitleKey: string;
  icon: DiscoverIconName;
  route?: string;
  keywords: string[];
  todayPriority?: boolean;
  recommended?: boolean;
};

const DISCOVER_CATEGORY_DEFINITIONS: DiscoverCategoryDefinition[] = [
  {
    key: 'cosmic_flow',
    titleKey: 'discover.categories.cosmicFlow.title',
    subtitleKey: 'discover.categories.cosmicFlow.subtitle',
  },
  {
    key: 'self_discovery',
    titleKey: 'discover.categories.selfDiscovery.title',
    subtitleKey: 'discover.categories.selfDiscovery.subtitle',
  },
  {
    key: 'spiritual',
    titleKey: 'discover.categories.spiritual.title',
    subtitleKey: 'discover.categories.spiritual.subtitle',
  },
  {
    key: 'social_compat',
    titleKey: 'discover.categories.socialCompat.title',
    subtitleKey: 'discover.categories.socialCompat.subtitle',
  },
];

const DISCOVER_MODULE_DEFINITIONS: DiscoverModuleDefinition[] = [
  {
    key: 'horoscope_daily',
    categoryKey: 'cosmic_flow',
    titleKey: 'discover.modules.horoscopeDaily.title',
    subtitleKey: 'discover.modules.horoscopeDaily.subtitle',
    icon: 'sunny-outline',
    route: '/(tabs)/horoscope',
    keywords: ['burc', 'burç', 'horoscope', 'daily', 'günlük', 'yorum', 'zodyak', 'zodiac'],
    todayPriority: true,
  },
  {
    key: 'transits_today',
    categoryKey: 'cosmic_flow',
    titleKey: 'discover.modules.transitsToday.title',
    subtitleKey: 'discover.modules.transitsToday.subtitle',
    icon: 'planet-outline',
    route: '/transits-today',
    keywords: ['transit', 'gezegen', 'planet', 'gün', 'today', 'etki', 'effect', 'ay', 'moon'],
    todayPriority: true,
  },
  {
    key: 'weekly',
    categoryKey: 'cosmic_flow',
    titleKey: 'discover.modules.weekly.title',
    subtitleKey: 'discover.modules.weekly.subtitle',
    icon: 'analytics-outline',
    route: '/(tabs)/weekly-analysis',
    keywords: ['haftalık', 'weekly', 'analiz', 'analysis', 'swot', 'hafta', 'week'],
    recommended: true,
  },
  {
    key: 'calendar',
    categoryKey: 'cosmic_flow',
    titleKey: 'discover.modules.calendar.title',
    subtitleKey: 'discover.modules.calendar.subtitle',
    icon: 'calendar-outline',
    route: '/(tabs)/calendar',
    keywords: ['takvim', 'calendar', 'planlayıcı', 'planner', 'plan'],
  },
  {
    key: 'lucky_hours',
    categoryKey: 'cosmic_flow',
    titleKey: 'discover.modules.luckyHours.title',
    subtitleKey: 'discover.modules.luckyHours.subtitle',
    icon: 'time-outline',
    keywords: ['şans', 'sans', 'lucky', 'uğurlu', 'ugurlu', 'saat', 'hour'],
  },
  {
    key: 'natal_chart',
    categoryKey: 'self_discovery',
    titleKey: 'discover.modules.natalChart.title',
    subtitleKey: 'discover.modules.natalChart.subtitle',
    icon: 'aperture-outline',
    route: '/(tabs)/natal-chart',
    keywords: ['natal', 'harita', 'chart', 'doğum', 'dogum', 'birth'],
  },
  {
    key: 'night_sky',
    categoryKey: 'self_discovery',
    titleKey: 'discover.modules.nightSky.title',
    subtitleKey: 'discover.modules.nightSky.subtitle',
    icon: 'moon-outline',
    route: '/night-sky',
    keywords: ['gece', 'night', 'gökyüzü', 'gokyuzu', 'sky', 'ay', 'moon'],
    todayPriority: true,
  },
  {
    key: 'name_analysis',
    categoryKey: 'self_discovery',
    titleKey: 'discover.modules.nameAnalysis.title',
    subtitleKey: 'discover.modules.nameAnalysis.subtitle',
    icon: 'person-outline',
    route: '/(tabs)/name-analysis',
    keywords: ['isim', 'name', 'analiz', 'analysis', 'numeroloji', 'numerology'],
  },
  {
    key: 'numerology',
    categoryKey: 'self_discovery',
    titleKey: 'discover.modules.numerology.title',
    subtitleKey: 'discover.modules.numerology.subtitle',
    icon: 'keypad-outline',
    route: '/numerology',
    keywords: ['numeroloji', 'numerology', 'sayı', 'sayi', 'number', 'yaşam yolu', 'yasam yolu', 'life path'],
    recommended: true,
  },
  {
    key: 'decision_compass',
    categoryKey: 'self_discovery',
    titleKey: 'discover.modules.decisionCompass.title',
    subtitleKey: 'discover.modules.decisionCompass.subtitle',
    icon: 'navigate-outline',
    route: '/(tabs)/decision-compass-tab',
    keywords: ['karar', 'decision', 'pusula', 'compass', 'guide', 'rehber'],
    recommended: true,
  },
  {
    key: 'spiritual_prayers',
    categoryKey: 'spiritual',
    titleKey: 'discover.modules.spiritualPrayers.title',
    subtitleKey: 'discover.modules.spiritualPrayers.subtitle',
    icon: 'book-outline',
    route: '/(tabs)/spiritual/prayers',
    keywords: ['dua', 'prayer', 'ibadet', 'worship'],
  },
  {
    key: 'spiritual_esma',
    categoryKey: 'spiritual',
    titleKey: 'discover.modules.spiritualEsma.title',
    subtitleKey: 'discover.modules.spiritualEsma.subtitle',
    icon: 'sparkles-outline',
    route: '/(tabs)/spiritual/esma',
    keywords: ['esma', 'asma', 'zikir', 'dhikr'],
  },
  {
    key: 'spiritual_meditation',
    categoryKey: 'spiritual',
    titleKey: 'discover.modules.spiritualMeditation.title',
    subtitleKey: 'discover.modules.spiritualMeditation.subtitle',
    icon: 'leaf-outline',
    route: '/(tabs)/spiritual/meditation',
    keywords: ['meditasyon', 'meditation', 'odak', 'focus'],
  },
  {
    key: 'spiritual_breathing',
    categoryKey: 'spiritual',
    titleKey: 'discover.modules.spiritualBreathing.title',
    subtitleKey: 'discover.modules.spiritualBreathing.subtitle',
    icon: 'water-outline',
    route: '/(tabs)/spiritual/breathing',
    keywords: ['nefes', 'breathing', 'rahatlama', 'relaxation'],
  },
  {
    key: 'spiritual_recommendations',
    categoryKey: 'spiritual',
    titleKey: 'discover.modules.spiritualRecommendations.title',
    subtitleKey: 'discover.modules.spiritualRecommendations.subtitle',
    icon: 'heart-outline',
    route: '/(tabs)/spiritual/recommendations',
    keywords: ['öneri', 'oneri', 'recommendation', 'ruhsal', 'spiritual'],
  },
  {
    key: 'compatibility',
    categoryKey: 'social_compat',
    titleKey: 'discover.modules.compatibility.title',
    subtitleKey: 'discover.modules.compatibility.subtitle',
    icon: 'heart-half-outline',
    route: '/(tabs)/compatibility',
    keywords: ['uyum', 'compatibility', 'ilişki', 'iliski', 'relationship'],
    recommended: true,
  },
  {
    key: 'star_mate',
    categoryKey: 'social_compat',
    titleKey: 'discover.modules.starMate.title',
    subtitleKey: 'discover.modules.starMate.subtitle',
    icon: 'people-outline',
    route: '/(tabs)/star-mate',
    keywords: ['ruh eşi', 'ruh esi', 'soul mate', 'eşleşme', 'eslesme', 'match', 'star mate'],
  },
  {
    key: 'share_cards',
    categoryKey: 'social_compat',
    titleKey: 'discover.modules.shareCards.title',
    subtitleKey: 'discover.modules.shareCards.subtitle',
    icon: 'images-outline',
    route: '/share-cards',
    keywords: ['paylaş', 'paylas', 'share', 'kart', 'card'],
  },
  {
    key: 'relation_matrix',
    categoryKey: 'social_compat',
    titleKey: 'discover.modules.relationMatrix.title',
    subtitleKey: 'discover.modules.relationMatrix.subtitle',
    icon: 'grid-outline',
    keywords: ['matris', 'matrix', 'karşılaştırma', 'karsilastirma', 'compare'],
  },
];

export function buildDiscoverCategories(t: Translate): DiscoverCategory[] {
  return DISCOVER_CATEGORY_DEFINITIONS.map((category) => ({
    key: category.key,
    title: t(category.titleKey),
    subtitle: t(category.subtitleKey),
  }));
}

export function buildDiscoverModules(t: Translate): DiscoverModule[] {
  return DISCOVER_MODULE_DEFINITIONS.map((module) => ({
    key: module.key,
    categoryKey: module.categoryKey,
    title: t(module.titleKey),
    subtitle: t(module.subtitleKey),
    icon: module.icon,
    route: module.route,
    keywords: module.keywords,
    todayPriority: module.todayPriority,
    recommended: module.recommended,
  }));
}

export const TODAY_MODULE_KEYS: DiscoverModuleKey[] = [
  'horoscope_daily',
  'transits_today',
  'night_sky',
];

export const RECOMMENDED_MODULE_KEYS: DiscoverModuleKey[] = [
  'weekly',
  'compatibility',
  'decision_compass',
  'numerology',
];
