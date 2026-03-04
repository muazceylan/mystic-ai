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

export const DISCOVER_CATEGORIES: DiscoverCategory[] = [
  {
    key: 'cosmic_flow',
    title: 'Kozmik Akış',
    subtitle: 'Bugün ve hafta ritmini buradan takip et.',
  },
  {
    key: 'self_discovery',
    title: 'Kendini Keşfet',
    subtitle: 'Haritan ve kişisel içgörüler tek yerde.',
  },
  {
    key: 'spiritual',
    title: 'Ruhsal Pratikler',
    subtitle: 'Dua, esma, nefes ve meditasyon akışları.',
  },
  {
    key: 'social_compat',
    title: 'Sosyal & Uyum',
    subtitle: 'İlişki uyumu ve paylaşım deneyimleri.',
  },
];

export const DISCOVER_MODULES: DiscoverModule[] = [
  {
    key: 'horoscope_daily',
    categoryKey: 'cosmic_flow',
    title: 'Günlük Burç',
    subtitle: 'Bugünün yorumu',
    icon: 'sunny-outline',
    route: '/(tabs)/horoscope',
    keywords: ['burç', 'horoscope', 'günlük', 'yorum', 'zodyak'],
    todayPriority: true,
  },
  {
    key: 'transits_today',
    categoryKey: 'cosmic_flow',
    title: 'Günün Transitleri',
    subtitle: 'Anlık gökyüzü etkisi',
    icon: 'planet-outline',
    route: '/transits-today',
    keywords: ['transit', 'gezegen', 'gün', 'etki', 'ay'],
    todayPriority: true,
  },
  {
    key: 'weekly',
    categoryKey: 'cosmic_flow',
    title: 'Haftalık Analiz',
    subtitle: 'Bu hafta odakları',
    icon: 'analytics-outline',
    route: '/(tabs)/weekly-analysis',
    keywords: ['haftalık', 'analiz', 'swot', 'hafta'],
    recommended: true,
  },
  {
    key: 'calendar',
    categoryKey: 'cosmic_flow',
    title: 'Kozmik Takvim',
    subtitle: 'Uygun günleri planla',
    icon: 'calendar-outline',
    route: '/(tabs)/calendar',
    keywords: ['takvim', 'planlayıcı', 'calendar', 'planner'],
  },
  {
    key: 'lucky_hours',
    categoryKey: 'cosmic_flow',
    title: 'Şanslı Saatler',
    subtitle: 'Yakında geliyor',
    icon: 'time-outline',
    keywords: ['şans', 'uğurlu', 'saat', 'lucky'],
  },

  {
    key: 'natal_chart',
    categoryKey: 'self_discovery',
    title: 'Doğum Haritası',
    subtitle: 'Natal detayların',
    icon: 'aperture-outline',
    route: '/(tabs)/natal-chart',
    keywords: ['natal', 'harita', 'doğum', 'chart'],
  },
  {
    key: 'night_sky',
    categoryKey: 'self_discovery',
    title: 'Doğduğun Gece Gökyüzü',
    subtitle: 'Kişisel gece haritan',
    icon: 'moon-outline',
    route: '/night-sky',
    keywords: ['gece', 'gökyüzü', 'night', 'sky', 'ay'],
    todayPriority: true,
  },
  {
    key: 'name_analysis',
    categoryKey: 'self_discovery',
    title: 'İsim Analizi',
    subtitle: 'İsminin enerji izi',
    icon: 'person-outline',
    route: '/name-analysis',
    keywords: ['isim', 'analiz', 'name', 'numeroloji'],
  },
  {
    key: 'decision_compass',
    categoryKey: 'self_discovery',
    title: 'Karar Pusulası',
    subtitle: 'Anlık karar rehberi',
    icon: 'navigate-outline',
    route: '/decision-compass',
    keywords: ['karar', 'pusula', 'decision', 'compass'],
    recommended: true,
  },

  {
    key: 'spiritual_prayers',
    categoryKey: 'spiritual',
    title: 'Dua Akışı',
    subtitle: 'Günlük dua listeleri',
    icon: 'book-outline',
    route: '/(tabs)/spiritual/prayers',
    keywords: ['dua', 'prayer', 'ibadet'],
  },
  {
    key: 'spiritual_esma',
    categoryKey: 'spiritual',
    title: 'Esma Zikir',
    subtitle: 'Esma ve tekrar',
    icon: 'sparkles-outline',
    route: '/(tabs)/spiritual/esma',
    keywords: ['esma', 'zikir'],
  },
  {
    key: 'spiritual_meditation',
    categoryKey: 'spiritual',
    title: 'Meditasyon',
    subtitle: 'Sessiz odak seansları',
    icon: 'leaf-outline',
    route: '/(tabs)/spiritual/meditation',
    keywords: ['meditasyon', 'meditation', 'odak'],
  },
  {
    key: 'spiritual_breathing',
    categoryKey: 'spiritual',
    title: 'Nefes',
    subtitle: 'Nefes egzersizleri',
    icon: 'water-outline',
    route: '/(tabs)/spiritual/breathing',
    keywords: ['nefes', 'breathing', 'rahatlama'],
  },
  {
    key: 'spiritual_recommendations',
    categoryKey: 'spiritual',
    title: 'Ruhsal Öneri',
    subtitle: 'Güne uygun pratik',
    icon: 'heart-outline',
    route: '/(tabs)/spiritual/recommendations',
    keywords: ['öneri', 'ruhsal', 'spiritual'],
  },

  {
    key: 'compatibility',
    categoryKey: 'social_compat',
    title: 'Uyumluluk',
    subtitle: 'İlişki uyum analizi',
    icon: 'heart-half-outline',
    route: '/(tabs)/compatibility',
    keywords: ['uyum', 'compatibility', 'ilişki'],
    recommended: true,
  },
  {
    key: 'star_mate',
    categoryKey: 'social_compat',
    title: 'Ruh Eşi',
    subtitle: 'Eşleşme içgörüleri',
    icon: 'people-outline',
    route: '/(tabs)/star-mate',
    keywords: ['ruh eşi', 'eşleşme', 'star mate'],
  },
  {
    key: 'share_cards',
    categoryKey: 'social_compat',
    title: 'Paylaşılabilir Kartlar',
    subtitle: 'Sosyalde paylaşmaya hazır',
    icon: 'images-outline',
    route: '/share-cards',
    keywords: ['paylaş', 'kart', 'share'],
  },
  {
    key: 'relation_matrix',
    categoryKey: 'social_compat',
    title: 'İlişki Matris',
    subtitle: 'Yakında geliyor',
    icon: 'grid-outline',
    keywords: ['matris', 'karşılaştırma', 'matrix'],
  },
];

export const TODAY_MODULE_KEYS: DiscoverModuleKey[] = [
  'horoscope_daily',
  'transits_today',
  'night_sky',
];

export const RECOMMENDED_MODULE_KEYS: DiscoverModuleKey[] = [
  'weekly',
  'compatibility',
  'decision_compass',
];
