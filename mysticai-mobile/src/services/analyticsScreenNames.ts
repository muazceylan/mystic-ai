/**
 * Maps Expo Router pathnames to human-readable, report-friendly screen names.
 *
 * Used by the centralized screen tracker in _layout.tsx.
 * Screen names follow the pattern: feature_screen_name (snake_case).
 */

const SCREEN_MAP: Record<string, string> = {
  // Auth & Onboarding
  '/(auth)/welcome': 'onboarding_welcome',
  '/(auth)/signup': 'auth_signup',
  '/(auth)/email-register': 'auth_email_register',
  '/(auth)/verify-email': 'auth_verify_email',
  '/(auth)/verify-email-pending': 'auth_verify_email_pending',
  '/(auth)/forgot-password': 'auth_forgot_password',
  '/(auth)/birth-date': 'onboarding_birth_date',
  '/(auth)/birth-time': 'onboarding_birth_time',
  '/(auth)/birth-country': 'onboarding_birth_country',
  '/(auth)/birth-city': 'onboarding_birth_city',
  '/(auth)/gender': 'onboarding_gender',
  '/(auth)/marital-status': 'onboarding_marital_status',
  '/(auth)/focus-point': 'onboarding_focus_point',
  '/(auth)/notification-permission': 'onboarding_notification_permission',
  '/(auth)/natal-chart': 'onboarding_natal_chart',
  '/(auth)/oauth2': 'auth_oauth2',

  // Main tabs
  '/(tabs)/home': 'home_dashboard',
  '/(tabs)/natal-chart': 'astrology_birth_chart',
  '/(tabs)/daily-transits': 'astrology_daily_transits',
  '/(tabs)/today-actions': 'astrology_today_actions',
  '/(tabs)/calendar': 'cosmic_planner',
  '/(tabs)/compatibility': 'compatibility_home',
  '/(tabs)/compare': 'compatibility_compare',
  '/(tabs)/compare/technical': 'compatibility_technical',
  '/(tabs)/dreams': 'dreams_home',
  '/(tabs)/discover': 'discover_home',
  '/(tabs)/star-mate': 'star_mate',
  '/(tabs)/name-analysis': 'name_analysis_home',
  '/(tabs)/name-search': 'name_search',
  '/(tabs)/name-favorites': 'name_favorites',
  '/(tabs)/dream-book': 'dream_book',

  // Stack screens
  '/numerology': 'numerology_home',
  '/profile': 'profile_home',
  '/notifications': 'notifications_center',
  '/link-account': 'link_account',
  '/tutorial-center': 'tutorial_center',

  // Spiritual
  '/spiritual/asma': 'spiritual_esma_list',
  '/spiritual/counter': 'spiritual_counter',
  '/spiritual/journal/stats': 'spiritual_stats',
};

/**
 * Resolve a human-readable screen name from an Expo Router pathname.
 *
 * For dynamic routes (e.g., `/name-detail/123`), strips the dynamic segment
 * and matches the base path. Returns null for unrecognized paths.
 */
export function resolveScreenName(pathname: string): string | null {
  // Direct match
  const direct = SCREEN_MAP[pathname];
  if (direct) return direct;

  // Dynamic route patterns
  if (pathname.startsWith('/(tabs)/name-detail/')) return 'name_detail';
  if (pathname.startsWith('/(tabs)/compare/')) return 'compatibility_compare_detail';
  if (pathname.startsWith('/spiritual/asma/')) return 'spiritual_esma_detail';
  if (pathname.startsWith('/spiritual/dua/')) return 'spiritual_dua_detail';

  // Fallback: convert pathname to a reasonable screen name
  // e.g., "/(tabs)/some-screen" → "some_screen"
  const cleaned = pathname
    .replace(/^\//, '')
    .replace(/\(.*?\)\//g, '')
    .replace(/\//g, '_')
    .replace(/-/g, '_')
    .replace(/[^a-z0-9_]/gi, '')
    .toLowerCase();

  return cleaned || null;
}
