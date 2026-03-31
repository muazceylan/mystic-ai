/**
 * TanStack Query key factory - tutarlı cache key'leri için
 */
export const queryKeys = {
  dailySecret: (params?: Record<string, string | undefined>) =>
    ['oracle', 'daily-secret', params ?? {}] as const,
  homeBrief: (params?: Record<string, string | undefined>) =>
    ['oracle', 'home-brief', params ?? {}] as const,
  homeDashboardFast: (userId: number | string, locale?: string) =>
    ['oracle', 'home-dashboard-fast', userId, locale ?? 'tr'] as const,
  homeDashboard: (userId: number | string, sign?: string, locale?: string) =>
    ['oracle', 'home-dashboard', userId, sign ?? '', locale ?? 'tr'] as const,
  skyPulse: () => ['astrology', 'sky-pulse'] as const,
  weeklySwot: (userId: number) => ['astrology', 'weekly-swot', userId] as const,
  dailyLifeGuide: (userId: number, locale?: string, date?: string) =>
    ['astrology', 'daily-life-guide', userId, locale ?? 'tr', date ?? 'today'] as const,
  dailyTransits: (date: string, locale?: string) => ['dailyTransits', date, locale ?? 'tr'] as const,
  dailyActions: (date: string, locale?: string) => ['dailyActions', date, locale ?? 'tr'] as const,
  cosmicSummary: (userId: number, locale?: string, date?: string, gender?: string, maritalStatus?: string) =>
    ['cosmic', 'summary', userId, locale ?? 'tr', date ?? 'today', gender ?? '', maritalStatus ?? ''] as const,
  cosmicPlanner: (userId: number, month?: string, locale?: string, gender?: string, maritalStatus?: string) =>
    ['cosmic', 'planner', userId, month ?? '', locale ?? 'tr', gender ?? '', maritalStatus ?? ''] as const,
  natalChart: (userId: number) => ['astrology', 'natal-chart', userId] as const,
  natalChartById: (chartId: number) => ['astrology', 'natal-chart', chartId] as const,
  dreams: (userId: number) => ['dreams', 'list', userId] as const,
  dreamSymbols: (userId: number) => ['dreams', 'symbols', userId] as const,
  dreamAnalytics: (userId: number) => ['dreams', 'analytics', userId] as const,
  collectivePulse: () => ['dreams', 'collective-pulse'] as const,
  monthlyStory: (userId: number, year: number, month: number) =>
    ['dreams', 'monthly-story', userId, year, month] as const,
  luckyDates: (userId: number, category: string) =>
    ['lucky-dates', userId, category] as const,
  numerology: (
    name: string,
    birthDate: string,
    effectiveDate?: string,
    locale?: string,
    guidancePeriod?: string,
  ) => ['numerology', name, birthDate, effectiveDate ?? 'today', locale ?? 'tr', guidancePeriod ?? 'day'] as const,
  profileStats: (userId: number) => ['profile', 'stats', userId] as const,
};
