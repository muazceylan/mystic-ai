import api from './api';
import { fetchSkyPulse, fetchWeeklySwot, type SkyPulseResponse, type WeeklySwotResponse } from './astrology.service';
import { fetchHomeBrief, type HomeBrief } from './oracle.service';
import type { UserProfile } from '../store/useAuthStore';
import { envConfig } from '../config/env';
import { logApiError, logWarnOnce } from './observability';

const HOME_DASHBOARD_ENDPOINT = '/api/v1/oracle/home-dashboard';

export interface HomeDashboardUser {
  name: string;
  avatarUrl?: string | null;
  notifications?: number;
  signName?: string;
}

export interface HomeDashboardHero {
  title: string;
  subtitle: string;
  insightText: string;
  ctaText: string;
}

export interface HomeDashboardQuickAction {
  key: string;
  title: string;
  subtitle: string;
  route: string;
  available: boolean;
}

export interface HomeDashboardHoroscopeSummary {
  today: {
    signName: string;
    label: string;
    themeText: string;
    adviceText: string;
    route: string;
  };
  weekly: {
    signName: string;
    label: string;
    shortText?: string;
    routeToWeeklyHoroscope: string;
  };
}

export interface HomeDashboardTransitsToday {
  moonPhase: string;
  moonSign: string;
  retroCount: number;
  route: string;
}

export interface HomeDashboardWeeklyHighlightItem {
  key: string;
  title: string;
  desc: string;
  level: 'Yüksek' | 'Orta' | 'Risk';
}

export interface HomeDashboardWeeklyHighlights {
  rangeText: string;
  items: HomeDashboardWeeklyHighlightItem[];
  route: string;
}

export interface HomeDashboardOracleStatus {
  enabled: boolean;
  label: string;
}

export interface HomeDashboardResponse {
  user: HomeDashboardUser;
  hero: HomeDashboardHero;
  quickActions: HomeDashboardQuickAction[];
  horoscopeSummary: HomeDashboardHoroscopeSummary;
  transitsToday: HomeDashboardTransitsToday;
  weeklyHighlights: HomeDashboardWeeklyHighlights;
  oracleStatus?: HomeDashboardOracleStatus;
}

export interface FetchHomeDashboardParams {
  user: UserProfile | null;
}

const STATIC_QUICK_ACTIONS: HomeDashboardQuickAction[] = [
  {
    key: 'decisionCompass',
    title: 'Karar Pusulası',
    subtitle: 'Günlük Rehber',
    route: '/decision-compass',
    available: true,
  },
  {
    key: 'planner',
    title: 'Kozmik Planlayıcı',
    subtitle: 'Şanslı Günler',
    route: '/(tabs)/calendar',
    available: true,
  },
  {
    key: 'spiritual',
    title: 'Ruhsal Pratikler',
    subtitle: 'Dua, Esma, Meditasyon',
    route: '/(tabs)/spiritual',
    available: true,
  },
  {
    key: 'dreamJournal',
    title: 'Rüya Günlüğü',
    subtitle: 'Rüya Notları',
    route: '/(tabs)/dreams',
    available: true,
  },
];

const TR_MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'] as const;

function clampText(value: string | null | undefined, max = 96): string {
  const text = value?.trim() ?? '';
  if (text.length <= max) return text;
  return `${text.slice(0, max - 1).trimEnd()}…`;
}

function slugify(value: string | undefined): string {
  const map: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };

  return (value ?? '')
    .toLowerCase()
    .split('')
    .map((char) => map[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function signSlug(signName: string | undefined): string {
  const map: Record<string, string> = {
    koc: 'aries',
    boga: 'taurus',
    ikizler: 'gemini',
    yengec: 'cancer',
    aslan: 'leo',
    basak: 'virgo',
    terazi: 'libra',
    akrep: 'scorpio',
    yay: 'sagittarius',
    oglak: 'capricorn',
    kova: 'aquarius',
    balik: 'pisces',
  };
  return map[slugify(signName)] ?? 'pisces';
}

function parseDate(input?: string | null): Date | null {
  if (!input) return null;
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function weekRangeFromDate(startInput?: string | null, endInput?: string | null): string {
  const start = parseDate(startInput);
  const end = parseDate(endInput);
  if (!start || !end) {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = (day + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${weekStart.getDate()} ${TR_MONTHS_SHORT[weekStart.getMonth()]} – ${weekEnd.getDate()} ${TR_MONTHS_SHORT[weekEnd.getMonth()]}`;
  }
  return `${start.getDate()} ${TR_MONTHS_SHORT[start.getMonth()]} – ${end.getDate()} ${TR_MONTHS_SHORT[end.getMonth()]}`;
}

function mapSwotToWeekly(swot: WeeklySwotResponse | null | undefined): HomeDashboardWeeklyHighlightItem[] {
  if (!swot) {
    return [];
  }
  return [
    {
      key: 'strength',
      title: 'İçsel Güç',
      desc: clampText(swot.strength.quickTip || swot.strength.subtext, 64),
      level: 'Yüksek',
    },
    {
      key: 'opportunity',
      title: 'Altın Fırsat',
      desc: clampText(swot.opportunity.quickTip || swot.opportunity.subtext, 64),
      level: 'Orta',
    },
    {
      key: 'threat',
      title: 'Kritik Uyarı',
      desc: clampText(swot.threat.quickTip || swot.threat.subtext, 64),
      level: 'Risk',
    },
  ];
}

function buildDashboardFromSources(
  user: UserProfile | null,
  homeBrief: HomeBrief | null,
  skyPulse: SkyPulseResponse | null,
  weeklySwot: WeeklySwotResponse | null,
): HomeDashboardResponse {
  const userName = user?.firstName?.trim() || user?.name?.trim() || user?.username?.trim() || 'Merhaba';
  const userSign = user?.zodiacSign || skyPulse?.moonSignTurkish || '';
  const weeklySignSlug = signSlug(userSign);
  const retroCount = skyPulse?.retrogradePlanets?.length ?? 0;

  const weeklyItems = mapSwotToWeekly(weeklySwot);
  const weeklyRange = weekRangeFromDate(weeklySwot?.weekStart, weeklySwot?.weekEnd);
  const transitHeadline = clampText(homeBrief?.transitHeadline, 88);
  const transitAdvice = clampText(homeBrief?.actionMessage, 88);
  const transitSummary = clampText(homeBrief?.transitSummary, 88);
  const moonPhase = skyPulse?.moonPhase?.trim() || '';
  const moonSign = skyPulse?.moonSignTurkish?.trim() || '';

  return {
    user: {
      name: userName,
      avatarUrl: user?.avatarUrl ?? user?.avatarUri ?? null,
      notifications: 0,
      signName: userSign || undefined,
    },
    hero: {
      title: 'Doğduğun Gece Gökyüzü',
      subtitle: moonPhase ? `Ay Fazı: ${moonPhase}` : '',
      insightText: transitSummary,
      ctaText: 'Gökyüzünü gör',
    },
    quickActions: STATIC_QUICK_ACTIONS,
    horoscopeSummary: {
      today: {
        signName: userSign,
        label: 'Günlük yorum',
        themeText: transitHeadline,
        adviceText: transitAdvice,
        route: '/(tabs)/horoscope',
      },
      weekly: {
        signName: userSign || '',
        label: 'Haftalık yorum',
        shortText: clampText(weeklySwot?.opportunity?.headline ?? weeklySwot?.flashInsight?.headline, 56),
        routeToWeeklyHoroscope: `/(tabs)/horoscope/${weeklySignSlug}?period=weekly`,
      },
    },
    transitsToday: {
      moonPhase,
      moonSign,
      retroCount,
      route: '/transits-today',
    },
    weeklyHighlights: {
      rangeText: weeklyRange,
      items: weeklyItems,
      route: '/(tabs)/weekly-analysis',
    },
    oracleStatus: homeBrief ? { enabled: true, label: 'Oracle kullanılabilir' } : undefined,
  };
}

function normalizeDashboardResponse(response: HomeDashboardResponse, user: UserProfile | null): HomeDashboardResponse {
  const nameFromUser = user?.firstName?.trim() || user?.name?.trim();
  return {
    ...response,
    user: {
      ...response.user,
      name: response.user?.name?.trim() || nameFromUser || 'Merhaba',
    },
    quickActions: response.quickActions?.length ? response.quickActions : STATIC_QUICK_ACTIONS,
    oracleStatus: response.oracleStatus,
  };
}

export async function fetchHomeDashboard({ user }: FetchHomeDashboardParams): Promise<HomeDashboardResponse> {
  if (!envConfig.isApiConfigured) {
    logWarnOnce(
      'home-dashboard',
      'service_not_configured',
      'Home dashboard service is not configured. Returning sparse dashboard model.',
      { appEnv: envConfig.appEnv },
    );
    return buildDashboardFromSources(user, null, null, null);
  }

  const queryParams = {
    userId: user?.id,
    name: user?.firstName || user?.name,
    birthDate: user?.birthDate,
    maritalStatus: user?.maritalStatus,
    focusPoint: user?.focusPoint,
  };

  try {
    const response = await api.get<HomeDashboardResponse>(HOME_DASHBOARD_ENDPOINT, { params: queryParams });
    return normalizeDashboardResponse(response.data, user);
  } catch (error) {
    logApiError('home_dashboard_fetch', error, { endpoint: HOME_DASHBOARD_ENDPOINT });
    // merged fallback below
  }

  const [homeBriefResult, skyPulseResult, weeklySwotResult] = await Promise.allSettled([
    fetchHomeBrief({
      name: user?.firstName || user?.name,
      birthDate: user?.birthDate,
      maritalStatus: user?.maritalStatus,
      focusPoint: user?.focusPoint,
    }),
    fetchSkyPulse(),
    user?.id ? fetchWeeklySwot(user.id) : Promise.resolve(null),
  ]);

  const homeBrief = homeBriefResult.status === 'fulfilled' ? homeBriefResult.value.data : null;
  const skyPulse = skyPulseResult.status === 'fulfilled' ? skyPulseResult.value.data : null;
  const weeklySwot =
    weeklySwotResult.status === 'fulfilled'
      ? (weeklySwotResult.value && 'data' in weeklySwotResult.value ? weeklySwotResult.value.data : null)
      : null;

  return buildDashboardFromSources(user, homeBrief, skyPulse, weeklySwot);
}
