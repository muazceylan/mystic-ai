import type {
  TutorialConfigStatus,
  TutorialContractOptions,
  TutorialPlatform,
  TutorialPresentationType,
} from '@/types';

export const TUTORIAL_PLATFORM_OPTIONS: TutorialPlatform[] = ['MOBILE', 'IOS', 'ANDROID', 'WEB', 'ALL'];

export const TUTORIAL_PRESENTATION_OPTIONS: TutorialPresentationType[] = [
  'SPOTLIGHT_CARD',
  'FULLSCREEN_CAROUSEL',
  'INLINE_HINT',
];

export const TUTORIAL_EDITABLE_STATUS_OPTIONS: Array<Extract<TutorialConfigStatus, 'DRAFT' | 'ARCHIVED'>> = [
  'DRAFT',
  'ARCHIVED',
];

export const TUTORIAL_SCREEN_KEY_OPTIONS = [
  'global_onboarding',
  'home',
  'daily_transits',
  'cosmic_planner',
  'decision_compass',
  'compatibility',
  'birth_chart',
  'dreams',
  'numerology',
  'name_analysis',
  'spiritual_practice',
  'profile',
] as const;

export const TUTORIAL_TARGET_KEY_OPTIONS: Record<string, string[]> = {
  global_onboarding: ['global_onboarding.intro'],
  home: [
    'home.hero_energy',
    'home.quick_actions',
    'home.personal_widget',
    'home.help_entry',
  ],
  daily_transits: [
    'daily_transits.hero_summary',
    'daily_transits.transit_cards',
    'daily_transits.impact_zones',
    'daily_transits.help_entry',
  ],
  cosmic_planner: [
    'cosmic_planner.date_picker',
    'cosmic_planner.category_dock',
    'cosmic_planner.daily_recommendations',
    'cosmic_planner.reminder_action',
    'cosmic_planner.help_entry',
  ],
  decision_compass: [
    'decision_compass.header_summary',
    'decision_compass.input_area',
    'decision_compass.result_area',
    'decision_compass.reevaluate_entry',
    'decision_compass.help_entry',
  ],
  compatibility: [
    'compatibility.summary_header',
    'compatibility.section_tabs',
    'compatibility.score_area',
    'compatibility.save_share_entry',
    'compatibility.help_entry',
  ],
  birth_chart: [
    'birth_chart.hero_summary',
    'birth_chart.planet_positions',
    'birth_chart.technical_details',
    'birth_chart.insight_panel',
    'birth_chart.detail_action',
    'birth_chart.help_entry',
  ],
  dreams: [
    'dreams.compose_entry',
    'dreams.interpretation_result',
    'dreams.history_entry',
    'dreams.help_entry',
  ],
  numerology: [
    'numerology.input_area',
    'numerology.result_card',
    'numerology.detail_section',
    'numerology.help_entry',
  ],
  name_analysis: [
    'name_analysis.name_input',
    'name_analysis.meaning_panel',
    'name_analysis.save_share_entry',
    'name_analysis.help_entry',
  ],
  spiritual_practice: [
    'spiritual_practice.daily_recommendation',
    'spiritual_practice.practice_counter',
    'spiritual_practice.journal_entry',
    'spiritual_practice.help_entry',
  ],
  profile: [
    'profile.personal_info',
    'profile.preferences',
    'profile.tutorial_center_entry',
    'profile.help_entry',
  ],
};

export function getTargetKeyOptions(
  screenKey: string,
  contract?: TutorialContractOptions | null,
): string[] {
  const remote = contract?.targetKeysByScreen?.[screenKey] ?? [];
  const local = TUTORIAL_TARGET_KEY_OPTIONS[screenKey] ?? [];
  const merged = Array.from(new Set([...remote, ...local]));
  return merged;
}

export function resolveScreenOptions(
  currentValue: string,
  contract?: TutorialContractOptions | null,
): string[] {
  const remote = contract?.screenKeys ?? [];
  const local = [...TUTORIAL_SCREEN_KEY_OPTIONS];
  const baseOptions = Array.from(new Set([...remote, ...local]));

  if (!currentValue) {
    return baseOptions;
  }

  if (baseOptions.includes(currentValue)) {
    return baseOptions;
  }

  return [currentValue, ...baseOptions];
}
