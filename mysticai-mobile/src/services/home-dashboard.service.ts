import { fetchSkyPulse, fetchWeeklySwot, type SkyPulseResponse, type WeeklySwotResponse } from './astrology.service';
import { fetchHomeBrief, type HomeBrief } from './oracle.service';
import type { UserProfile } from '../store/useAuthStore';
import { envConfig } from '../config/env';
import { logApiError, logWarnOnce } from './observability';

type DashboardLocale = 'tr' | 'en';
type WeeklyHighlightLevel = 'high' | 'medium' | 'risk';

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
  level: WeeklyHighlightLevel;
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
  locale?: string;
}
const TR_MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'] as const;
const EN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
const TURKISH_TEXT_PATTERN = /[çğıöşüÇĞİÖŞÜ]|\b(bugün|günün|hafta|için|ve|ile|sen|seni|gökyüzü|yorum|fırsat|enerji|detay|ay|retrosu|haritan)\b/i;

function normalizeLocale(locale?: string | null): DashboardLocale {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'tr';
}

function isEnglish(locale: DashboardLocale): boolean {
  return locale === 'en';
}

function getStaticQuickActions(locale: DashboardLocale): HomeDashboardQuickAction[] {
  if (isEnglish(locale)) {
    return [
      {
        key: 'decisionCompass',
        title: 'Decision Compass',
        subtitle: 'Daily guide',
        route: '/(tabs)/decision-compass-tab',
        available: true,
      },
      {
        key: 'planner',
        title: 'Cosmic Planner',
        subtitle: 'Lucky timings',
        route: '/(tabs)/calendar',
        available: true,
      },
      {
        key: 'spiritual',
        title: 'Spiritual Practice',
        subtitle: 'Prayer, names, meditation',
        route: '/(tabs)/spiritual',
        available: true,
      },
      {
        key: 'dreamJournal',
        title: 'Dream Journal',
        subtitle: 'Dream notes',
        route: '/(tabs)/dreams',
        available: true,
      },
    ];
  }

  return [
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
}

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
  const text = compactWhitespace(value).toLocaleLowerCase();
  if (!text || text.length < 24) return true;
  return text.includes('kısa süre içinde yenilenecek')
    || text.includes('yorum hazırlanıyor')
    || text.includes('hazırlanıyor')
    || text.includes('being prepared')
    || text.includes('loading')
    || text.includes('"data"')
    || text.startsWith('{')
    || text.startsWith('{"')
    || text.includes('evdeki detaylar')
    || text.includes('harekete geçirecek');
}

function matchesRequestedLocale(value: string | null | undefined, locale: DashboardLocale): boolean {
  const text = compactWhitespace(value);
  if (!text) {
    return false;
  }

  if (isEnglish(locale)) {
    return !TURKISH_TEXT_PATTERN.test(text);
  }

  return true;
}

function firstStrongText(locale: DashboardLocale, max: number, ...values: Array<string | null | undefined>): string {
  for (const value of values) {
    const normalized = normalizeDashboardText(value, max);
    if (!isWeakDashboardText(normalized) && matchesRequestedLocale(normalized, locale)) {
      return normalized;
    }
  }

  for (const value of values) {
    const normalized = normalizeDashboardText(value, max);
    if (matchesRequestedLocale(normalized, locale)) {
      return normalized;
    }
  }

  return normalizeDashboardText(values[0], max);
}

function localizeMoonPhase(value: string | null | undefined, locale: DashboardLocale): string {
  const phase = compactWhitespace(value);
  if (!phase) {
    return '';
  }

  const normalized = phase.toLowerCase();
  const map: Record<string, { tr: string; en: string }> = {
    dolunay: { tr: 'Dolunay', en: 'Full Moon' },
    'yeni ay': { tr: 'Yeni Ay', en: 'New Moon' },
    'ilk dordun': { tr: 'İlk Dördün', en: 'First Quarter' },
    'ilk dördün': { tr: 'İlk Dördün', en: 'First Quarter' },
    'son dordun': { tr: 'Son Dördün', en: 'Last Quarter' },
    'son dördün': { tr: 'Son Dördün', en: 'Last Quarter' },
    waxing: { tr: phase, en: phase },
    waning: { tr: phase, en: phase },
    crescent: { tr: phase, en: phase },
    gibbous: { tr: phase, en: phase },
  };

  const matchedEntry = Object.entries(map).find(([key]) => normalized.includes(key));
  if (!matchedEntry) {
    return phase;
  }

  return matchedEntry[1][locale];
}

function localizeMoonSign(skyPulse: SkyPulseResponse | null, locale: DashboardLocale): string {
  if (!skyPulse) {
    return '';
  }

  return isEnglish(locale)
    ? compactWhitespace(skyPulse.moonSign) || compactWhitespace(skyPulse.moonSignTurkish)
    : compactWhitespace(skyPulse.moonSignTurkish) || compactWhitespace(skyPulse.moonSign);
}

function buildFallbackHeadline(moonSign: string, moonPhase: string, locale: DashboardLocale): string {
  if (moonSign) {
    return isEnglish(locale) ? `Today's flow is shaped by ${moonSign}` : `${moonSign} etkisiyle günün akışı`;
  }
  if (moonPhase) {
    return isEnglish(locale) ? `Daily rhythm under the ${moonPhase}` : `${moonPhase} fazında günlük akış`;
  }
  return isEnglish(locale) ? 'The rhythm of the day is forming' : 'Bugün için günlük akış';
}

function buildFallbackAdvice(retroCount: number, locale: DashboardLocale): string {
  if (isEnglish(locale)) {
    if (retroCount >= 2) return 'Double-check important decisions before you commit to them today.';
    if (retroCount === 1) return 'Keeping your messages short and clear can prevent misunderstandings today.';
    return 'Pick one clear priority and finish it to steady the rest of the day.';
  }

  if (retroCount >= 2) return 'Önemli kararları aceleye getirmeden iki kez kontrol etmen iyi olabilir.';
  if (retroCount === 1) return 'Mesajlarını kısa ve net tutman bugün yanlış anlaşılmaları azaltabilir.';
  return 'Tek bir öncelik seçip onu tamamlaman gününü daha rahatlatabilir.';
}

function buildFallbackInsight(moonSign: string, moonPhase: string, retroCount: number, locale: DashboardLocale): string {
  if (retroCount >= 2) {
    return isEnglish(locale)
      ? 'Keep the pace calm today and review important messages once more before sending them.'
      : 'Bugün tempoyu sakin tutup önemli mesajları göndermeden önce tekrar kontrol etmen iyi olabilir.';
  }
  if (retroCount === 1) {
    return isEnglish(locale)
      ? 'You will move more smoothly today if you keep communication clear and the plan simple.'
      : 'Bugün iletişimde net kalıp planını sade tuttuğunda daha rahat ilerleyebilirsin.';
  }
  if (moonSign) {
    return isEnglish(locale)
      ? `${moonSign} energy supports emotional balance and a tighter focus on one priority today.`
      : `${moonSign} etkisiyle duygusal dengeyi koruman ve tek bir önceliğe odaklanman iyi gelebilir.`;
  }
  if (moonPhase) {
    return isEnglish(locale)
      ? `Small but steady steps can make the day easier under the ${moonPhase}.`
      : `${moonPhase} fazında küçük ama kararlı adımlar gününü kolaylaştırabilir.`;
  }
  return isEnglish(locale)
    ? 'Choosing one priority and finishing it can make the rest of the day much clearer.'
    : 'Bugün tek bir öncelik seçip onu tamamlaman günün akışını daha net hale getirebilir.';
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

function weekRangeFromDate(startInput: string | null | undefined, endInput: string | null | undefined, locale: DashboardLocale): string {
  const start = parseDate(startInput);
  const end = parseDate(endInput);
  const months = isEnglish(locale) ? EN_MONTHS_SHORT : TR_MONTHS_SHORT;
  if (!start || !end) {
    const now = new Date();
    const day = now.getDay();
    const mondayOffset = (day + 6) % 7;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - mondayOffset);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    return `${weekStart.getDate()} ${months[weekStart.getMonth()]} – ${weekEnd.getDate()} ${months[weekEnd.getMonth()]}`;
  }
  return `${start.getDate()} ${months[start.getMonth()]} – ${end.getDate()} ${months[end.getMonth()]}`;
}

function mapSwotToWeekly(swot: WeeklySwotResponse | null | undefined, locale: DashboardLocale): HomeDashboardWeeklyHighlightItem[] {
  if (!swot) {
    return [];
  }

  const fallbackDesc = (key: 'strength' | 'opportunity' | 'threat', intensity: number) => {
    if (isEnglish(locale)) {
      if (key === 'strength') return intensity >= 60 ? 'Momentum is strong in this area this week.' : 'A stable source of support stays active this week.';
      if (key === 'opportunity') return intensity >= 60 ? 'A clear opening is worth acting on this week.' : 'Watch for smaller openings building in the background.';
      return intensity >= 60 ? 'Move carefully around pressure points this week.' : 'Keep plans flexible and avoid forcing outcomes.';
    }

    if (key === 'strength') return intensity >= 60 ? 'Bu alan bu hafta güçlü destek alıyor.' : 'Bu alanda dengeli bir destek devam ediyor.';
    if (key === 'opportunity') return intensity >= 60 ? 'Bu hafta değerlendirmeye açık net bir fırsat var.' : 'Daha küçük ama anlamlı açılımlar birikiyor.';
    return intensity >= 60 ? 'Bu hafta baskı yaratan alanlarda temkinli ilerle.' : 'Planlarını esnek tutup zorlamadan ilerle.';
  };

  return [
    {
      key: 'strength',
      title: isEnglish(locale) ? 'Inner Strength' : 'İçsel Güç',
      desc: clampText(
        isEnglish(locale)
          ? fallbackDesc('strength', swot.strength.intensity)
          : swot.strength.quickTip || swot.strength.subtext || fallbackDesc('strength', swot.strength.intensity),
        64,
      ),
      level: 'high',
    },
    {
      key: 'opportunity',
      title: isEnglish(locale) ? 'Golden Opportunity' : 'Altın Fırsat',
      desc: clampText(
        isEnglish(locale)
          ? fallbackDesc('opportunity', swot.opportunity.intensity)
          : swot.opportunity.quickTip || swot.opportunity.subtext || fallbackDesc('opportunity', swot.opportunity.intensity),
        64,
      ),
      level: 'medium',
    },
    {
      key: 'threat',
      title: isEnglish(locale) ? 'Critical Warning' : 'Kritik Uyarı',
      desc: clampText(
        isEnglish(locale)
          ? fallbackDesc('threat', swot.threat.intensity)
          : swot.threat.quickTip || swot.threat.subtext || fallbackDesc('threat', swot.threat.intensity),
        64,
      ),
      level: 'risk',
    },
  ];
}

function buildDashboardFromSources(
  user: UserProfile | null,
  homeBrief: HomeBrief | null,
  skyPulse: SkyPulseResponse | null,
  weeklySwot: WeeklySwotResponse | null,
  locale: DashboardLocale,
): HomeDashboardResponse {
  const userName = user?.firstName?.trim() || user?.name?.trim() || user?.username?.trim() || (isEnglish(locale) ? 'Guest' : 'Misafir');
  const userSign = user?.zodiacSign || localizeMoonSign(skyPulse, locale) || '';
  const weeklySignSlug = signSlug(userSign);
  const retroCount = skyPulse?.retrogradePlanets?.length ?? 0;

  const weeklyItems = mapSwotToWeekly(weeklySwot, locale);
  const weeklyRange = weekRangeFromDate(weeklySwot?.weekStart, weeklySwot?.weekEnd, locale);
  const moonPhase = localizeMoonPhase(skyPulse?.moonPhase?.trim() || '', locale);
  const moonSign = localizeMoonSign(skyPulse, locale);
  const fallbackHeadline = buildFallbackHeadline(moonSign, moonPhase, locale);
  const fallbackAdvice = buildFallbackAdvice(retroCount, locale);
  const fallbackInsight = buildFallbackInsight(moonSign, moonPhase, retroCount, locale);
  const transitHeadline = firstStrongText(
    locale,
    88,
    homeBrief?.transitHeadline,
    homeBrief?.dailyEnergy,
    fallbackHeadline,
  );
  const transitAdvice = firstStrongText(
    locale,
    88,
    homeBrief?.actionMessage,
    homeBrief?.transitPoints?.[0],
    fallbackAdvice,
  );
  const transitSummary = firstStrongText(
    locale,
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
      title: isEnglish(locale) ? 'Your Birth Night Sky' : 'Doğduğun Gece Gökyüzü',
      subtitle: moonPhase ? (isEnglish(locale) ? `Moon Phase: ${moonPhase}` : `Ay Fazı: ${moonPhase}`) : '',
      insightText: transitSummary || fallbackInsight,
      ctaText: isEnglish(locale) ? 'See the sky' : 'Gökyüzünü gör',
    },
    quickActions: getStaticQuickActions(locale),
    horoscopeSummary: {
      today: {
        signName: userSign,
        label: isEnglish(locale) ? 'Daily reading' : 'Günlük yorum',
        themeText: transitHeadline,
        adviceText: transitAdvice,
        route: '/(tabs)/horoscope',
      },
      weekly: {
        signName: userSign || '',
        label: isEnglish(locale) ? 'Weekly reading' : 'Haftalık yorum',
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
    oracleStatus: homeBrief
      ? {
          enabled: true,
          label: isEnglish(locale) ? 'Oracle is available' : 'Oracle kullanılabilir',
        }
      : undefined,
  };
}

export async function fetchHomeDashboard({ user, locale }: FetchHomeDashboardParams): Promise<HomeDashboardResponse> {
  const resolvedLocale = normalizeLocale(locale ?? user?.preferredLanguage ?? 'tr');
  if (!envConfig.isApiConfigured) {
    logWarnOnce(
      'home-dashboard',
      'service_not_configured',
      'Home dashboard service is not configured. Returning sparse dashboard model.',
      { appEnv: envConfig.appEnv },
    );
    return buildDashboardFromSources(user, null, null, null, resolvedLocale);
  }

  const [homeBriefResult, skyPulseResult, weeklySwotResult] = await Promise.allSettled([
    fetchHomeBrief({
      name: user?.firstName || user?.name,
      birthDate: user?.birthDate,
      maritalStatus: user?.maritalStatus,
      focusPoint: user?.focusPoint,
      locale: resolvedLocale,
    }),
    fetchSkyPulse(resolvedLocale),
    user?.id ? fetchWeeklySwot(user.id, resolvedLocale) : Promise.resolve(null),
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

  return buildDashboardFromSources(user, homeBrief, skyPulse, weeklySwot, resolvedLocale);
}
