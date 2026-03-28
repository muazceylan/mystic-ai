export function isStandardSurfaceRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  if (pathname.startsWith('/(auth)')) return false;
  if (pathname.startsWith('/oauth2')) return false;
  return true;
}

const SURFACE_TITLE_MAP: Array<[string, string]> = [
  ['/(tabs)/home', 'surfaceTitles.home'],
  ['/(tabs)/discover', 'surfaceTitles.discover'],
  ['/(tabs)/calendar', 'surfaceTitles.calendar'],
  ['/(tabs)/compatibility', 'surfaceTitles.compatibility'],
  ['/(tabs)/daily-transits', 'surfaceTitles.dailyTransits'],
  ['/(tabs)/dreams', 'surfaceTitles.dreams'],
  ['/(tabs)/name-analysis', 'surfaceTitles.nameAnalysis'],
  ['/(tabs)/name-favorites', 'surfaceTitles.nameFavorites'],
  ['/(tabs)/name-detail', 'surfaceTitles.nameDetail'],
  ['/(tabs)/name-search', 'surfaceTitles.nameSearch'],
  ['/(tabs)/natal-chart', 'surfaceTitles.natalChart'],
  ['/(tabs)/profile', 'surfaceTitles.profile'],
  ['/(tabs)/spiritual', 'surfaceTitles.spiritual'],
  ['/(tabs)/star-mate', 'surfaceTitles.starMate'],
  ['/(tabs)/today-actions', 'surfaceTitles.todayActions'],
  ['/(tabs)/weekly-analysis', 'surfaceTitles.weeklyAnalysis'],
  ['/(tabs)/compare', 'surfaceTitles.compare'],
  ['/add-person', 'surfaceTitles.addPerson'],
  ['/daily-summary', 'surfaceTitles.dailySummary'],
  ['/decision-compass', 'surfaceTitles.decisionCompass'],
  ['/(tabs)/decision-compass-all-categories', 'surfaceTitles.decisionCompassAllCategories'],
  ['/decision-compass-detail', 'surfaceTitles.decisionCompassDetail'],
  ['/edit-birth-info', 'surfaceTitles.editBirthInfo'],
  ['/edit-profile-name', 'surfaceTitles.editProfileName'],
  ['/help', 'surfaceTitles.help'],
  ['/interaction-detail', 'surfaceTitles.interactionDetail'],
  ['/language-settings', 'surfaceTitles.languageSettings'],
  ['/notifications', 'surfaceTitles.notifications'],
  ['/notifications-settings', 'surfaceTitles.notificationsSettings'],
  ['/numerology', 'surfaceTitles.numerology'],
  ['/premium', 'surfaceTitles.premium'],
  ['/privacy', 'surfaceTitles.privacy'],
  ['/terms', 'surfaceTitles.terms'],
  ['/security', 'surfaceTitles.security'],
  ['/theme-settings', 'surfaceTitles.themeSettings'],
  ['/tutorial-center', 'surfaceTitles.tutorialCenter'],
  ['/transits-today', 'surfaceTitles.dailyTransits'],
];

export function resolveSurfaceTitle(
  pathname: string | null | undefined,
  explicitTitle?: string | null,
  translate?: (key: string) => string,
): string | undefined {
  const trimmedTitle = explicitTitle?.trim();
  if (trimmedTitle) {
    return trimmedTitle;
  }

  if (!pathname) {
    return undefined;
  }

  const matched = SURFACE_TITLE_MAP.find(([prefix]) => pathname.startsWith(prefix));
  if (!matched) {
    return undefined;
  }

  return translate ? translate(matched[1]) : matched[1];
}
