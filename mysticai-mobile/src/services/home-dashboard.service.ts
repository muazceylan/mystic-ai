import { fetchSkyPulse, fetchWeeklySwot, type SkyPulseResponse, type WeeklySwotResponse } from './astrology.service';
import { fetchHomeBrief, type HomeBrief } from './oracle.service';
import type { UserProfile } from '../store/useAuthStore';
import { envConfig } from '../config/env';
import { logApiError, logWarnOnce } from './observability';

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
    route: '/(tabs)/decision-compass-tab',
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

function compactWhitespace(value: string | null | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim();
}

function safeParseJsonTwice(raw: string): unknown {
  let current: unknown = raw;
  for (let i = 0; i < 2; i += 1) {
    if (typeof current !== 'string') return current;
    const candidate = current.trim();
    if (!(candidate.startsWith('{') || candidate.startsWith('[') || candidate.startsWith('"'))) {
      return current;
    }
    try {
      current = JSON.parse(candidate);
    } catch {
      return current;
    }
  }
  return current;
}

function extractNarrativeFromObject(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const node = payload as Record<string, any>;
  const fromData = node.data && typeof node.data === 'object' ? (node.data as Record<string, any>) : null;
  const fromDataList = Array.isArray(node.data) ? node.data[0] : null;
  return compactWhitespace(
    node.transitSummary
      ?? node.transit_summary
      ?? node.horoscope
      ?? node.summary
      ?? node.message
      ?? fromData?.transitSummary
      ?? fromData?.transit_summary
      ?? fromData?.horoscope
      ?? fromData?.summary
      ?? fromData?.message
      ?? fromDataList?.horoscope
      ?? fromDataList?.summary
      ?? fromDataList?.message
      ?? '',
  );
}

function normalizeDashboardText(value: string | null | undefined, max = 96): string {
  const raw = compactWhitespace(value);
  if (!raw) return '';
  const parsed = safeParseJsonTwice(raw);
  const extracted = extractNarrativeFromObject(parsed);
  const source = extracted || raw;
  const sentenceMatch = source.match(/^(.+?[.!?])(?:\s|$)/);
  const firstSentence = compactWhitespace(sentenceMatch?.[1] ?? source);
  return clampText(firstSentence || source, max);
}

function isWeakDashboardText(value: string | null | undefined): boolean {
  const text = compactWhitespace(value).toLocaleLowerCase('tr-TR');
  if (!text || text.length < 24) return true;
  return text.includes('kısa süre içinde yenilenecek')
    || text.includes('yorum hazırlanıyor')
    || text.includes('hazırlanıyor')
    || text.includes('"data"')
    || text.startsWith('{')
    || text.startsWith('{"')
    || text.includes('evdeki detaylar')
    || text.includes('harekete geçirecek');
}

function firstStrongText(max: number, ...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = normalizeDashboardText(value, max);
    if (!isWeakDashboardText(normalized)) {
      return normalized;
    }
  }
  return normalizeDashboardText(values[0], max);
}

function buildFallbackHeadline(moonSign: string, moonPhase: string): string {
  if (moonSign) return `${moonSign} etkisiyle günün akışı`;
  if (moonPhase) return `${moonPhase} fazında günlük akış`;
  return 'Bugün için günlük akış';
}

function buildFallbackAdvice(retroCount: number): string {
  if (retroCount >= 2) return 'Önemli kararları aceleye getirmeden iki kez kontrol etmen iyi olabilir.';
  if (retroCount === 1) return 'Mesajlarını kısa ve net tutman bugün yanlış anlaşılmaları azaltabilir.';
  return 'Tek bir öncelik seçip onu tamamlaman gününü daha rahatlatabilir.';
}

function buildFallbackInsight(moonSign: string, moonPhase: string, retroCount: number): string {
  if (retroCount >= 2) {
    return 'Bugün tempoyu sakin tutup önemli mesajları göndermeden önce tekrar kontrol etmen iyi olabilir.';
  }
  if (retroCount === 1) {
    return 'Bugün iletişimde net kalıp planını sade tuttuğunda daha rahat ilerleyebilirsin.';
  }
  if (moonSign) {
    return `${moonSign} etkisiyle duygusal dengeyi koruman ve tek bir önceliğe odaklanman iyi gelebilir.`;
  }
  if (moonPhase) {
    return `${moonPhase} fazında küçük ama kararlı adımlar gününü kolaylaştırabilir.`;
  }
  return 'Bugün tek bir öncelik seçip onu tamamlaman günün akışını daha net hale getirebilir.';
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
  const moonPhase = skyPulse?.moonPhase?.trim() || '';
  const moonSign = skyPulse?.moonSignTurkish?.trim() || '';
  const fallbackHeadline = buildFallbackHeadline(moonSign, moonPhase);
  const fallbackAdvice = buildFallbackAdvice(retroCount);
  const fallbackInsight = buildFallbackInsight(moonSign, moonPhase, retroCount);
  const transitHeadline = firstStrongText(
    88,
    homeBrief?.transitHeadline,
    homeBrief?.dailyEnergy,
    fallbackHeadline,
  );
  const transitAdvice = firstStrongText(
    88,
    homeBrief?.actionMessage,
    homeBrief?.transitPoints?.[0],
    fallbackAdvice,
  );
  const transitSummary = firstStrongText(
    88,
    homeBrief?.transitSummary,
    homeBrief?.actionMessage,
    homeBrief?.dailyEnergy,
    fallbackInsight,
  );

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
      insightText: transitSummary || fallbackInsight,
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

  if (homeBriefResult.status === 'rejected') {
    logApiError('home-dashboard', homeBriefResult.reason, { source: 'home-brief' });
  }

  if (skyPulseResult.status === 'rejected') {
    logApiError('home-dashboard', skyPulseResult.reason, { source: 'sky-pulse' });
  }

  if (homeBriefResult.status === 'rejected' && skyPulseResult.status === 'rejected') {
    throw new Error('HOME_DASHBOARD_UPSTREAM_UNAVAILABLE');
  }

  return buildDashboardFromSources(user, homeBrief, skyPulse, weeklySwot);
}
