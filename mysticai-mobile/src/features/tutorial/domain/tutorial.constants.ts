export const TUTORIAL_SCREEN_KEYS = {
  GLOBAL_ONBOARDING: 'global_onboarding',
  HOME: 'home',
  DAILY_TRANSITS: 'daily_transits',
  COSMIC_PLANNER: 'cosmic_planner',
  DECISION_COMPASS: 'decision_compass',
  COMPATIBILITY: 'compatibility',
  BIRTH_CHART: 'birth_chart',
  DREAMS: 'dreams',
  NUMEROLOGY: 'numerology',
  NAME_ANALYSIS: 'name_analysis',
  SPIRITUAL_PRACTICE: 'spiritual_practice',
  PROFILE: 'profile',
} as const;

export const TUTORIAL_IDS = {
  GLOBAL_ONBOARDING: 'global_onboarding_v1',
  HOME_FOUNDATION: 'home_foundation_tutorial',
  DAILY_TRANSITS_FOUNDATION: 'daily_transits_foundation_tutorial',
  COSMIC_PLANNER_INTRO: 'cosmic_planner_intro',
  DECISION_COMPASS_INTRO: 'decision_compass_intro',
  COSMIC_PLANNER_FOUNDATION: 'cosmic_planner_intro',
  DECISION_COMPASS_FOUNDATION: 'decision_compass_intro',
  COMPATIBILITY_FOUNDATION: 'compatibility_foundation_tutorial',
  BIRTH_CHART_INTRO: 'birth_chart_intro',
  BIRTH_CHART_FOUNDATION: 'birth_chart_intro',
  DREAMS_FOUNDATION: 'dreams_foundation_tutorial',
  NUMEROLOGY_FOUNDATION: 'numerology_foundation_tutorial',
  NAME_ANALYSIS_FOUNDATION: 'name_analysis_foundation_tutorial',
  SPIRITUAL_PRACTICE_FOUNDATION: 'spiritual_practice_foundation_tutorial',
  PROFILE_FOUNDATION: 'profile_foundation_tutorial',
} as const;

export const TUTORIAL_ID_ALIASES: Record<string, string> = {
  cosmic_planner_foundation_tutorial: TUTORIAL_IDS.COSMIC_PLANNER_INTRO,
  decision_compass_foundation_tutorial: TUTORIAL_IDS.DECISION_COMPASS_INTRO,
  birth_chart_foundation_tutorial: TUTORIAL_IDS.BIRTH_CHART_INTRO,
};

export function normalizeTutorialId(tutorialId: string): string {
  return TUTORIAL_ID_ALIASES[tutorialId] ?? tutorialId;
}

export const GLOBAL_ONBOARDING_TARGET_KEYS = {
  INTRO: 'global_onboarding.intro',
} as const;

export const HOME_TUTORIAL_TARGET_KEYS = {
  HERO_ENERGY: 'home.hero_energy',
  QUICK_ACTIONS: 'home.quick_actions',
  PERSONAL_WIDGET: 'home.personal_widget',
  MONETIZATION_ENTRY: 'home.monetization_entry',
  HELP_ENTRY: 'home.help_entry',
} as const;

export const DAILY_TRANSITS_TUTORIAL_TARGET_KEYS = {
  HERO_SUMMARY: 'daily_transits.hero_summary',
  TRANSIT_CARDS: 'daily_transits.transit_cards',
  IMPACT_ZONES: 'daily_transits.impact_zones',
  MONETIZATION_ENTRY: 'daily_transits.monetization_entry',
  HELP_ENTRY: 'daily_transits.help_entry',
} as const;

export const COSMIC_PLANNER_TUTORIAL_TARGET_KEYS = {
  DATE_PICKER: 'cosmic_planner.date_picker',
  CATEGORY_DOCK: 'cosmic_planner.category_dock',
  DAILY_RECOMMENDATIONS: 'cosmic_planner.daily_recommendations',
  REMINDER_ACTION: 'cosmic_planner.reminder_action',
  MONETIZATION_ENTRY: 'cosmic_planner.monetization_entry',
  HELP_ENTRY: 'cosmic_planner.help_entry',
} as const;

export const DECISION_COMPASS_TUTORIAL_TARGET_KEYS = {
  HEADER_SUMMARY: 'decision_compass.header_summary',
  INPUT_AREA: 'decision_compass.input_area',
  RESULT_AREA: 'decision_compass.result_area',
  REEVALUATE_ENTRY: 'decision_compass.reevaluate_entry',
  MONETIZATION_ENTRY: 'decision_compass.monetization_entry',
  HELP_ENTRY: 'decision_compass.help_entry',
} as const;

export const COMPATIBILITY_TUTORIAL_TARGET_KEYS = {
  SUMMARY_HEADER: 'compatibility.summary_header',
  SECTION_TABS: 'compatibility.section_tabs',
  SCORE_AREA: 'compatibility.score_area',
  SAVE_SHARE_ENTRY: 'compatibility.save_share_entry',
  MONETIZATION_ENTRY: 'compatibility.monetization_entry',
  HELP_ENTRY: 'compatibility.help_entry',
} as const;

export const BIRTH_CHART_TUTORIAL_TARGET_KEYS = {
  HERO_SUMMARY: 'birth_chart.hero_summary',
  PLANET_POSITIONS: 'birth_chart.planet_positions',
  TECHNICAL_DETAILS: 'birth_chart.technical_details',
  INSIGHT_PANEL: 'birth_chart.insight_panel',
  DETAIL_ACTION: 'birth_chart.detail_action',
  MONETIZATION_ENTRY: 'birth_chart.monetization_entry',
  HELP_ENTRY: 'birth_chart.help_entry',
} as const;

export const DREAMS_TUTORIAL_TARGET_KEYS = {
  COMPOSE_ENTRY: 'dreams.compose_entry',
  INTERPRETATION_RESULT: 'dreams.interpretation_result',
  HISTORY_ENTRY: 'dreams.history_entry',
  MONETIZATION_ENTRY: 'dreams.monetization_entry',
  HELP_ENTRY: 'dreams.help_entry',
} as const;

export const NUMEROLOGY_TUTORIAL_TARGET_KEYS = {
  INPUT_AREA: 'numerology.input_area',
  RESULT_CARD: 'numerology.result_card',
  DETAIL_SECTION: 'numerology.detail_section',
  MONETIZATION_ENTRY: 'numerology.monetization_entry',
  HELP_ENTRY: 'numerology.help_entry',
} as const;

export const NAME_ANALYSIS_TUTORIAL_TARGET_KEYS = {
  NAME_INPUT: 'name_analysis.name_input',
  MEANING_PANEL: 'name_analysis.meaning_panel',
  SAVE_SHARE_ENTRY: 'name_analysis.save_share_entry',
  MONETIZATION_ENTRY: 'name_analysis.monetization_entry',
  HELP_ENTRY: 'name_analysis.help_entry',
} as const;

export const SPIRITUAL_PRACTICE_TUTORIAL_TARGET_KEYS = {
  DAILY_RECOMMENDATION: 'spiritual_practice.daily_recommendation',
  PRACTICE_COUNTER: 'spiritual_practice.practice_counter',
  JOURNAL_ENTRY: 'spiritual_practice.journal_entry',
  MONETIZATION_ENTRY: 'spiritual_practice.monetization_entry',
  HELP_ENTRY: 'spiritual_practice.help_entry',
} as const;

export const PROFILE_TUTORIAL_TARGET_KEYS = {
  PERSONAL_INFO: 'profile.personal_info',
  PREFERENCES: 'profile.preferences',
  TUTORIAL_CENTER_ENTRY: 'profile.tutorial_center_entry',
  MONETIZATION_ENTRY: 'profile.monetization_entry',
  HELP_ENTRY: 'profile.help_entry',
} as const;

export const TUTORIAL_SCREEN_KEY_OPTIONS = Object.values(TUTORIAL_SCREEN_KEYS);
export const TUTORIAL_SCREEN_KEY_SET: ReadonlySet<string> = new Set(TUTORIAL_SCREEN_KEY_OPTIONS);

export const TUTORIAL_TARGET_KEY_OPTIONS: Record<string, readonly string[]> = {
  [TUTORIAL_SCREEN_KEYS.GLOBAL_ONBOARDING]: Object.values(GLOBAL_ONBOARDING_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.HOME]: Object.values(HOME_TUTORIAL_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.DAILY_TRANSITS]: Object.values(DAILY_TRANSITS_TUTORIAL_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.COSMIC_PLANNER]: Object.values(COSMIC_PLANNER_TUTORIAL_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.DECISION_COMPASS]: Object.values(DECISION_COMPASS_TUTORIAL_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.COMPATIBILITY]: Object.values(COMPATIBILITY_TUTORIAL_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.BIRTH_CHART]: Object.values(BIRTH_CHART_TUTORIAL_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.DREAMS]: Object.values(DREAMS_TUTORIAL_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.NUMEROLOGY]: Object.values(NUMEROLOGY_TUTORIAL_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.NAME_ANALYSIS]: Object.values(NAME_ANALYSIS_TUTORIAL_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.SPIRITUAL_PRACTICE]: Object.values(SPIRITUAL_PRACTICE_TUTORIAL_TARGET_KEYS),
  [TUTORIAL_SCREEN_KEYS.PROFILE]: Object.values(PROFILE_TUTORIAL_TARGET_KEYS),
};

export function getTutorialTargetKeyOptions(screenKey: string): readonly string[] {
  return TUTORIAL_TARGET_KEY_OPTIONS[screenKey] ?? [];
}

export const TUTORIAL_PLATFORM_OPTIONS = ['MOBILE', 'IOS', 'ANDROID', 'WEB', 'ALL'] as const;
export const TUTORIAL_STATUS_OPTIONS = ['DRAFT', 'PUBLISHED', 'ARCHIVED'] as const;
export const TUTORIAL_PRESENTATION_TYPE_OPTIONS = ['SPOTLIGHT_CARD', 'FULLSCREEN_CAROUSEL', 'INLINE_HINT'] as const;

export const TUTORIAL_TARGET_RESOLUTION_POLICY = {
  MISSING_TARGET_LAYOUT_BEHAVIOR: 'fallback_card',
} as const;

export const TUTORIAL_STORAGE_KEYS = {
  PROGRESS_STORE: 'tutorial-progress-store-v1',
  REMOTE_CONFIG_CACHE: 'tutorial-remote-config-cache-v1',
} as const;

export const TUTORIAL_LAYER = {
  MODAL_Z_INDEX: 1200,
  DIM_OPACITY: 0.58,
} as const;

export const TUTORIAL_DEFAULTS = {
  TOOLTIP_HORIZONTAL_MARGIN: 16,
  TOOLTIP_WIDTH: 340,
  SPOTLIGHT_PADDING: 10,
  SPOTLIGHT_RADIUS: 22,
  CARD_MAX_BODY_LINES: 3,
} as const;

export const TUTORIAL_CONFIG_POLICY = {
  IN_MEMORY_TTL_MS: 60_000,
  CACHE_FRESH_TTL_MS: 15 * 60 * 1000,
  CACHE_STALE_TTL_MS: 12 * 60 * 60 * 1000,
} as const;
