import { Ionicons } from '@expo/vector-icons';
import React from 'react';

export type IoniconName = React.ComponentProps<typeof Ionicons>['name'];

// Tab bar icons — active and inactive variants per tab
export const NAV_ICONS = {
  home:            { active: 'home' as IoniconName,             inactive: 'home-outline' as IoniconName },
  discover:        { active: 'compass' as IoniconName,          inactive: 'compass-outline' as IoniconName },
  calendar:        { active: 'calendar' as IoniconName,         inactive: 'calendar-outline' as IoniconName },
  natalChart:      { active: 'planet' as IoniconName,           inactive: 'planet-outline' as IoniconName },
  profile:         { active: 'person' as IoniconName,           inactive: 'person-outline' as IoniconName },
  dreams:          { active: 'moon' as IoniconName,             inactive: 'moon-outline' as IoniconName },
  compatibility:   { active: 'heart' as IoniconName,            inactive: 'heart-outline' as IoniconName },
  horoscope:       { active: 'star' as IoniconName,             inactive: 'star-outline' as IoniconName },
  starMate:        { active: 'sparkles' as IoniconName,         inactive: 'sparkles-outline' as IoniconName },
  spiritual:       { active: 'leaf' as IoniconName,             inactive: 'leaf-outline' as IoniconName },
  decisionCompass: { active: 'compass' as IoniconName,          inactive: 'compass-outline' as IoniconName },
} as const;

// Canonical icon per domain module — one icon per module, used everywhere
export const MODULE_ICONS = {
  home:             'home-outline' as IoniconName,
  natal_chart:      'planet-outline' as IoniconName,
  horoscope:        'sunny-outline' as IoniconName,       // daily horoscope — sun is more expressive
  transits:         'pulse-outline' as IoniconName,
  calendar:         'calendar-outline' as IoniconName,
  planner:          'calendar-outline' as IoniconName,
  decision_compass: 'compass-outline' as IoniconName,
  numerology:       'keypad-outline' as IoniconName,      // keypad more specific than calculator
  name_analysis:    'text-outline' as IoniconName,
  compatibility:    'heart-outline' as IoniconName,
  star_mate:        'sparkles-outline' as IoniconName,
  compare:          'git-compare-outline' as IoniconName,
  dreams:           'moon-outline' as IoniconName,
  dream_diary:      'book-outline' as IoniconName,
  spiritual:        'leaf-outline' as IoniconName,
  prayer:           'heart-circle-outline' as IoniconName,
  meditation:       'radio-button-on-outline' as IoniconName,
  night_sky:        'moon-outline' as IoniconName,        // night sky feature identity
  weekly:           'analytics-outline' as IoniconName,   // weekly analysis
  lucky_hours:      'time-outline' as IoniconName,
  notifications:    'notifications-outline' as IoniconName,
  premium:          'diamond-outline' as IoniconName,
  guru:             'sparkles-outline' as IoniconName,
  profile:          'person-outline' as IoniconName,
  settings:         'settings-outline' as IoniconName,
} as const;

// Common actions — same action always maps to the same icon
export const ACTION_ICONS = {
  add:            'add-circle-outline' as IoniconName,
  edit:           'pencil-outline' as IoniconName,
  delete:         'trash-outline' as IoniconName,
  share:          'share-social-outline' as IoniconName,
  save:           'bookmark-outline' as IoniconName,
  saved:          'bookmark' as IoniconName,
  search:         'search-outline' as IoniconName,
  filter:         'options-outline' as IoniconName,
  sort:           'funnel-outline' as IoniconName,
  close:          'close' as IoniconName,
  back:           'chevron-back' as IoniconName,
  forward:        'chevron-forward' as IoniconName,
  up:             'chevron-up' as IoniconName,
  down:           'chevron-down' as IoniconName,
  refresh:        'refresh-outline' as IoniconName,
  retry:          'reload-outline' as IoniconName,
  send:           'send-outline' as IoniconName,
  copy:           'copy-outline' as IoniconName,
  unlock:         'lock-open-outline' as IoniconName,
  lock:           'lock-closed-outline' as IoniconName,
  play:           'play-circle-outline' as IoniconName,
  pause:          'pause-circle-outline' as IoniconName,
  camera:         'camera-outline' as IoniconName,
  image:          'image-outline' as IoniconName,
  mic:            'mic-outline' as IoniconName,
  location:       'location-outline' as IoniconName,
  link:           'link-outline' as IoniconName,
  external:       'open-outline' as IoniconName,
  settings:       'settings-outline' as IoniconName,
  logout:         'log-out-outline' as IoniconName,
  notify:         'notifications-outline' as IoniconName,
  help:           'help-circle-outline' as IoniconName,
  info:           'information-circle-outline' as IoniconName,
  warning:        'warning-outline' as IoniconName,
  success:        'checkmark-circle-outline' as IoniconName,
  error:          'alert-circle-outline' as IoniconName,
  star:           'star-outline' as IoniconName,
  starFilled:     'star' as IoniconName,
  favorite:       'heart-outline' as IoniconName,
  favoriteFilled: 'heart' as IoniconName,
  more:           'ellipsis-horizontal' as IoniconName,
  menu:           'menu-outline' as IoniconName,
} as const;

// Loading / empty / error / success UI state icons
export const STATE_ICONS = {
  empty:            'telescope-outline' as IoniconName,
  error:            'cloud-offline-outline' as IoniconName,
  offline:          'cloud-offline-outline' as IoniconName,
  success:          'checkmark-circle-outline' as IoniconName,
  loading:          'hourglass-outline' as IoniconName,
  locked:           'lock-closed-outline' as IoniconName,
  unlocked:         'lock-open-outline' as IoniconName,
  comingSoon:       'time-outline' as IoniconName,
  noResults:        'search-outline' as IoniconName,
  noInternet:       'wifi-outline' as IoniconName,
  noNotifications:  'notifications-off-outline' as IoniconName,
  noDreams:         'moon-outline' as IoniconName,
  noHistory:        'document-outline' as IoniconName,
} as const;

// Profile / settings list row icons
export const SETTINGS_ICONS = {
  profile:        'person-outline' as IoniconName,
  name:           'person-outline' as IoniconName,
  birthInfo:      'calendar-outline' as IoniconName,
  maritalStatus:  'heart-outline' as IoniconName,
  notifications:  'notifications-outline' as IoniconName,
  theme:          'moon-outline' as IoniconName,
  language:       'globe-outline' as IoniconName,
  security:       'shield-checkmark-outline' as IoniconName,
  privacy:        'lock-closed-outline' as IoniconName,
  help:           'help-circle-outline' as IoniconName,
  tutorialCenter: 'albums-outline' as IoniconName,
  about:          'information-circle-outline' as IoniconName,
  logout:         'log-out-outline' as IoniconName,
  premium:        'diamond-outline' as IoniconName,
  subscription:   'card-outline' as IoniconName,
  restore:        'refresh-circle-outline' as IoniconName,
  feedback:       'chatbubble-outline' as IoniconName,
  rate:           'star-outline' as IoniconName,
} as const;

// Premium / monetization / Guru token icons
export const PREMIUM_ICONS = {
  premium:     'diamond-outline' as IoniconName,
  guru:        'sparkles-outline' as IoniconName,
  guruFilled:  'sparkles' as IoniconName,   // filled variant for hero/highlight usage
  wallet:      'wallet-outline' as IoniconName,
  reward:      'gift-outline' as IoniconName,
  ad:          'play-circle-outline' as IoniconName,
  purchase:    'card-outline' as IoniconName,
  restore:     'refresh-circle-outline' as IoniconName,
  locked:      'lock-closed-outline' as IoniconName,
  unlocked:    'lock-open-outline' as IoniconName,
  coin:        'ellipse-outline' as IoniconName,
  crown:       'ribbon-outline' as IoniconName,
} as const;

// Discover / explore category icons
export const CATEGORY_ICONS = {
  cosmic_flow:    'planet-outline' as IoniconName,
  self_discovery: 'person-outline' as IoniconName,
  spiritual:      'leaf-outline' as IoniconName,
  social_compat:  'heart-outline' as IoniconName,
  astrology:      'planet-outline' as IoniconName,
  numerology:     'keypad-outline' as IoniconName,
  compatibility:  'heart-outline' as IoniconName,
  dreams:         'moon-outline' as IoniconName,
  wellness:       'leaf-outline' as IoniconName,
  cosmic:         'star-outline' as IoniconName,
} as const;

// Notification type icons — maps notification category keys to icons
export const NOTIFICATION_CATEGORY_ICONS: Record<string, IoniconName> = {
  DAILY:      'sunny-outline',
  INTRADAY:   'time-outline',
  WEEKLY:     'calendar-outline',
  REMINDER:   'alarm-outline',
  BEHAVIORAL: 'pulse-outline',
  SYSTEM:     'information-circle-outline',
};

/**
 * Returns the canonical Ionicons icon name for a cosmic planner subcategory.
 * Extracted from calendar.tsx so that the mapping is centralized and maintainable.
 *
 * @param categoryKey  - top-level cosmic category (transit, moon, color, …)
 * @param subCategoryKey - specific subcategory slug from the backend response
 */
export function getCosmicSubcategoryIcon(
  categoryKey: string | null | undefined,
  subCategoryKey: string,
): IoniconName {
  const sub = (subCategoryKey ?? '').toLowerCase();
  const cat = (categoryKey ?? '').toLowerCase();

  // decision-compass-specific sub-categories
  if (sub.includes('retro')) return 'play-back-outline';
  if (sub.includes('aspect') || sub.includes('aci')) return 'git-network-outline';
  if (sub.includes('cycle') || sub.includes('dongu')) return 'sync-outline';
  if (sub.includes('moon') || sub.includes('ay_')) return 'moon-outline';

  // common sub-categories (calendar + decision-compass)
  if (sub.includes('hair_cut')) return 'cut-outline';
  if (sub.includes('skin') || sub.includes('aesthetic') || sub.includes('nail')) return 'sparkles-outline';
  if (sub.includes('hair_reduction')) return 'flash-outline';
  if (sub.includes('diet')) return 'leaf-outline';
  if (sub.includes('treatment') || sub.includes('checkup')) return 'medkit-outline';
  if (sub.includes('operation')) return ACTION_ICONS.warning;
  if (sub.includes('sport')) return 'fitness-outline';
  if (sub.includes('vacation') || sub.includes('travel')) return 'airplane-outline';
  if (sub.includes('culture_art')) return 'color-palette-outline';
  if (sub.includes('party') || sub.includes('social')) return 'people-outline';
  if (sub.includes('shopping') || sub.includes('big_purchase')) return 'cart-outline';
  if (sub.includes('repair') || sub.includes('renovation')) return 'hammer-outline';
  if (
    sub.includes('housework') ||
    sub.includes('cleaning') ||
    sub.includes('moving') ||
    sub.includes('decoration') ||
    sub.includes('plant')
  ) return 'home-outline';
  if (sub.includes('investment') || sub.includes('debt') || sub.includes('finance')) return PREMIUM_ICONS.wallet;
  if (
    sub.includes('law') ||
    sub.includes('official_documents') ||
    sub.includes('applications') ||
    sub.includes('public_affairs')
  ) return 'document-text-outline';
  if (sub.includes('meeting') || sub.includes('thesis') || sub.includes('career_education')) return 'briefcase-outline';
  if (
    sub.includes('new_job') ||
    sub.includes('seniority') ||
    sub.includes('entrepreneurship') ||
    sub.includes('resignation')
  ) return 'business-outline';
  if (
    sub.includes('worship') ||
    sub.includes('prayer') ||
    sub.includes('ritual') ||
    sub.includes('meditation') ||
    sub.includes('inner_journey')
  ) return MODULE_ICONS.spiritual;
  if (
    sub.includes('green') ||
    sub.includes('pink') ||
    sub.includes('yellow') ||
    sub.includes('blue') ||
    sub.includes('purple')
  ) return 'color-fill-outline';
  if (sub.includes('timing') || sub.includes('communication') || sub.includes('energy')) return 'bulb-outline';

  if (cat === 'transit') return MODULE_ICONS.natal_chart;
  if (cat === 'moon') return NAV_ICONS.dreams.active;
  if (cat === 'color') return 'color-palette-outline';
  return 'ellipse-outline';
}
