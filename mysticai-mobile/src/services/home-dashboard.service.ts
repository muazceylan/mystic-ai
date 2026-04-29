import { fetchSkyPulse, fetchWeeklySwot, type SkyPulseResponse, type WeeklySwotResponse } from './astrology.service';
import { fetchHomeBrief, type HomeBrief } from './oracle.service';
import { fetchDailyHoroscopeFromCms, type CmsDailyHoroscope } from './cmsContent.service';
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

const SIGN_ORDER = [
  'aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo',
  'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces',
] as const;
type SignSlug = (typeof SIGN_ORDER)[number];

const SIGN_LABEL_TR: Record<SignSlug, string> = {
  aries: 'Koç', taurus: 'Boğa', gemini: 'İkizler', cancer: 'Yengeç',
  leo: 'Aslan', virgo: 'Başak', libra: 'Terazi', scorpio: 'Akrep',
  sagittarius: 'Yay', capricorn: 'Oğlak', aquarius: 'Kova', pisces: 'Balık',
};
const SIGN_LABEL_EN: Record<SignSlug, string> = {
  aries: 'Aries', taurus: 'Taurus', gemini: 'Gemini', cancer: 'Cancer',
  leo: 'Leo', virgo: 'Virgo', libra: 'Libra', scorpio: 'Scorpio',
  sagittarius: 'Sagittarius', capricorn: 'Capricorn', aquarius: 'Aquarius', pisces: 'Pisces',
};

type RetroPlanetKey = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto';

const RETRO_TEMPLATES_TR: Record<RetroPlanetKey | 'multi', readonly string[]> = {
  mercury: [
    '{name}Merkür retroda — yeni imza yerine eski yazışmaları açmanın günü.',
    '{name}Merkür geri yönlü; sözleşmeden önce ikinci okuma şart.',
    '{name}Merkür retrosu mesajları geri çağırıyor — ertelenen yanıtlar gündeme dönüyor.',
  ],
  venus: [
    '{name}Venüs retroda — değer/gelir kalemini yeniden tartmanın zamanı.',
    '{name}Venüs geri yönde; eski bir bağ veya harcama kalemi gündeme dönüyor.',
    '{name}Venüs retrosu ilişkide tarafları sorgulatır — mevcut bağı gözden geçirin.',
  ],
  mars: [
    '{name}Mars retroda — yeni başlangıç değil, revizyon günü.',
    '{name}Mars geri yönlü; bugün hız değil, kararlılık kazandırır.',
    '{name}Mars retrosu enerjiyi içe çevirir — strateji dış değil iç.',
  ],
  jupiter: [
    '{name}Jüpiter retroda — büyüme planını yeniden gözden geçirmenin haftası.',
    '{name}Jüpiter geri yönde; fırsatları artırmadan önce mevcudu derinleştirin.',
  ],
  saturn: [
    '{name}Satürn retrosu yapıyı sınıyor — ertelenen sorumluluk bugün masada.',
    '{name}Satürn geri yönde; yapısal kararı bir hafta beklemek lehinize.',
    '{name}Satürn retrosu disiplini yeniden çizer — sınırı tazelemek bugünün işi.',
  ],
  uranus: [
    '{name}Uranüs retroda — ani değişim yerine içsel uyanışa alan açın.',
    '{name}Uranüs geri yönde; özgürleşme planını sessizce olgunlaştırın.',
  ],
  neptune: [
    '{name}Neptün retroda — sezgi süzülüyor, hayalle gerçeği bugün ayırın.',
    '{name}Neptün geri yönde; idealize edilen bir konuyu olduğu gibi görme zamanı.',
  ],
  pluto: [
    '{name}Plüton retroda — derinde kaynayan bir konu yüzeye yaklaşıyor.',
    '{name}Plüton geri yönde; gücünüzü yeniden sahiplenmenin haftası.',
  ],
  multi: [
    '{name}İki gezegen retroda; yeni proje değil, yarım kalanı bitirmek bu haftanın işi.',
    '{name}Birden fazla gezegen geri yönlü — ileri gitmeden önce geriye bakmak akıllıca.',
    '{name}Çoklu retro penceresinde; bu hafta yeniyi değil, eskiyi onarmak ödül getirir.',
  ],
};

const RETRO_TEMPLATES_EN: Record<RetroPlanetKey | 'multi', readonly string[]> = {
  mercury: [
    '{name}Mercury is retrograde — review old messages before signing anything new.',
    '{name}Mercury reverses; every contract deserves a second read today.',
    '{name}Mercury retrograde brings replies back — old threads return to the table.',
  ],
  venus: [
    '{name}Venus is retrograde — revisit the value of what you spend or commit to.',
    '{name}Venus reverses; an old bond or expense returns for review.',
    '{name}Venus retrograde questions partnerships — refine the existing, not the new.',
  ],
  mars: [
    '{name}Mars is retrograde — today is for revision, not new launches.',
    '{name}Mars reverses; persistence beats speed this week.',
    '{name}Mars retrograde turns energy inward — refine the strategy, not the action.',
  ],
  jupiter: [
    '{name}Jupiter is retrograde — review your growth plan before expanding further.',
    '{name}Jupiter reverses; deepen what you have before reaching for more.',
  ],
  saturn: [
    '{name}Saturn retrograde tests the structure — postponed duties land on the table.',
    '{name}Saturn reverses; delaying a structural call by a week works in your favor.',
    '{name}Saturn retrograde redraws boundaries — refresh the lines you set.',
  ],
  uranus: [
    '{name}Uranus is retrograde — make space for inner awakening over outer disruption.',
    '{name}Uranus reverses; ripen the freedom plan quietly.',
  ],
  neptune: [
    "{name}Neptune is retrograde — separate fact from fantasy in today's decisions.",
    '{name}Neptune reverses; see an idealized matter as it actually is.',
  ],
  pluto: [
    '{name}Pluto is retrograde — a deep current is approaching the surface.',
    '{name}Pluto reverses; this is the week to reclaim your power.',
  ],
  multi: [
    '{name}Multiple planets are retrograde — finishing the unfinished beats starting new this week.',
    '{name}With more than one retrograde, looking back is the smart way forward.',
    '{name}A multi-retrograde window — repair before you reach.',
  ],
};

type Aspect = 'conj' | 'sext' | 'square' | 'trine' | 'opp' | 'none';

const ASPECT_TEMPLATES_TR: Record<Aspect, readonly string[]> = {
  conj: [
    "{name}Ay {sun}'ınızla birleşiyor — kişisel niyet bugün belirgin, sahne sizden yana.",
    "{name}Ay {sun}'a denk geldi; görünürlük yüksek, kararı kendi sesinizle verin.",
  ],
  trine: [
    "{name}Ay {moon}'da {sun}'ınıza üçgen yapıyor — sezgisel kararlar 24 saat destekli.",
    '{name}{moon}–{sun} üçgeni açık akış veriyor — planlanan hamleler bugün ilerler.',
  ],
  square: [
    "{name}Ay {moon}'da {sun}'ınızla kare açıda — hızlı karardan kaçının.",
    '{name}{sun}–{moon} karesi gerilim getiriyor — önemli görüşmeleri öğleden sonraya alın.',
  ],
  opp: [
    "{name}Ay {moon}'da {sun}'ınıza karşıt — denge dış sesle kuruluyor, dinleyin.",
    '{name}{sun}–{moon} ekseni açık; ilişki/karar dengesi gün ortasında netleşir.',
  ],
  sext: [
    "{name}Ay {moon}'da {sun}'ınıza sekstil — küçük hamleler bugün çok verimli.",
    "{name}{moon} Ay'ı {sun} Güneş'inize destek veriyor — iletişim için uygun pencere.",
  ],
  none: [
    "{name}Ay {moon}'da geziniyor — {sun} odağınızı dingin tutarsanız fark eder.",
    "{name}{moon} Ay'ı nötr açı verir; rutin işlerde ilerleme bugün gerçekçi.",
  ],
};

const ASPECT_TEMPLATES_EN: Record<Aspect, readonly string[]> = {
  conj: [
    '{name}Moon meets your {sun} Sun — intent is clear today, take the stage.',
    '{name}Moon conjuncts {sun}; visibility peaks, decide in your own voice.',
  ],
  trine: [
    '{name}Moon in {moon} trines your {sun} Sun — intuitive decisions are supported all day.',
    '{name}{moon}–{sun} trine opens flow — planned moves advance today.',
  ],
  square: [
    '{name}Moon in {moon} squares your {sun} Sun — avoid hasty calls.',
    '{name}{sun}–{moon} square brings tension — push key talks to the afternoon.',
  ],
  opp: [
    '{name}Moon in {moon} opposes your {sun} Sun — balance arrives through another voice; listen.',
    '{name}{sun}–{moon} axis is live; relationship/decision balance settles by midday.',
  ],
  sext: [
    '{name}Moon in {moon} sextiles your {sun} Sun — small moves carry far today.',
    '{name}{moon} Moon supports your {sun} Sun — a good window for outreach.',
  ],
  none: [
    '{name}Moon in {moon} drifts neutrally — your {sun} focus rewards a calm pace.',
    '{name}{moon} Moon is neutral; routine work moves realistically today.',
  ],
};

type PhaseKey =
  | 'new-moon' | 'full-moon' | 'first-quarter' | 'last-quarter'
  | 'waxing-crescent' | 'waxing-gibbous' | 'waning-gibbous' | 'waning-crescent';

const PHASE_TEMPLATES_TR: Record<PhaseKey, readonly string[]> = {
  'new-moon': [
    "Yeni Ay {moon}'da; niyet tohumlarının 6 aylık etkisi bugünden başlıyor.",
    "Yeni Ay {moon}'da; bu burcun temasında temiz bir başlangıç penceresi açık.",
  ],
  'full-moon': [
    "Dolunay {moon}'da; gizli kalan bir konu yüzeye çıkıyor, hazırlıklı olun.",
    "Dolunay {moon}'da kuluçkayı bitiriyor — sonuç ve berraklık günü.",
  ],
  'first-quarter': [
    'İlk Dördün gerilimi; iki yön arasında kararı ertelemek yarın daha pahalıya gelir.',
  ],
  'last-quarter': [
    'Son Dördün fazında; bitmemiş bir bağlantıyı kapatmak bugün alan açar.',
  ],
  'waxing-crescent': [
    'Büyüyen Hilal; yeni başlatılan bir niyet bu hafta ilk filizini veriyor.',
  ],
  'waxing-gibbous': [
    'Büyüyen Şişkin Ay; bekleyen iş kıvamına yaklaşıyor — son rötuşları yapın.',
  ],
  'waning-gibbous': [
    'Küçülen Şişkin Ay; öğrenileni paylaşma günü, çevreye değer geri dönüyor.',
  ],
  'waning-crescent': [
    'Küçülen Hilal; yeni döngü öncesi içe dönmek için doğal pencere.',
  ],
};

const PHASE_TEMPLATES_EN: Record<PhaseKey, readonly string[]> = {
  'new-moon': [
    "New Moon in {moon}; today's seed of intention shapes the next six months.",
    "New Moon in {moon}; a clean opening in this sign's theme.",
  ],
  'full-moon': [
    'Full Moon in {moon}; hidden matters surface — come prepared.',
    'Full Moon in {moon} closes a chapter — clarity is the gift.',
  ],
  'first-quarter': [
    'First Quarter tension; deferring the call between two directions costs more tomorrow.',
  ],
  'last-quarter': [
    'Last Quarter; closing an unfinished thread frees real space today.',
  ],
  'waxing-crescent': [
    'Waxing Crescent; the intention you set is showing its first sprout.',
  ],
  'waxing-gibbous': [
    'Waxing Gibbous; pending work nears its form — refine the final touches.',
  ],
  'waning-gibbous': [
    'Waning Gibbous; share what you learned — value flows back from your circle.',
  ],
  'waning-crescent': [
    'Waning Crescent; a natural window to turn inward before the next cycle.',
  ],
};

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
    || text.includes('harekete geçirecek')
    || text.includes('teknik detaya takılmadan bugüne odaklan')
    || text.includes('bugün gökyüzü senden tek bir net karar ve cesur bir adım bekliyor')
    || text.includes("don't get stuck in technical details")
    || text.includes('today asks for one clear decision and one bold move');
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

function normalizePlanetToken(value: string | null | undefined): string {
  return slugify(compactWhitespace(value)).replace(/-/g, '');
}

function matchPlanetToken(token: string, aliases: readonly string[]): boolean {
  return aliases.some((alias) => token === alias || token.startsWith(alias));
}

function classifyRetroPlanet(value: string | null | undefined): RetroPlanetKey | null {
  const token = normalizePlanetToken(value);
  const map: Array<{ key: RetroPlanetKey; aliases: readonly string[] }> = [
    { key: 'mercury', aliases: ['mercury', 'merkur'] },
    { key: 'venus', aliases: ['venus', 'venusu', 'venuz'] },
    { key: 'mars', aliases: ['mars'] },
    { key: 'jupiter', aliases: ['jupiter'] },
    { key: 'saturn', aliases: ['saturn', 'saturnu', 'saturnus'] },
    { key: 'uranus', aliases: ['uranus', 'uranusu'] },
    { key: 'neptune', aliases: ['neptune', 'neptun'] },
    { key: 'pluto', aliases: ['pluto', 'pluton'] },
  ];
  for (const entry of map) {
    if (matchPlanetToken(token, entry.aliases)) return entry.key;
  }
  return null;
}

function strictSignSlug(value: string | null | undefined): SignSlug | null {
  if (!value) return null;
  const trMap: Record<string, SignSlug> = {
    koc: 'aries', boga: 'taurus', ikizler: 'gemini', yengec: 'cancer',
    aslan: 'leo', basak: 'virgo', terazi: 'libra', akrep: 'scorpio',
    yay: 'sagittarius', oglak: 'capricorn', kova: 'aquarius', balik: 'pisces',
  };
  const key = slugify(value);
  if (trMap[key]) return trMap[key];
  if ((SIGN_ORDER as readonly string[]).includes(key)) return key as SignSlug;
  return null;
}

function moonSignToSlug(skyPulse: SkyPulseResponse | null): SignSlug | null {
  if (!skyPulse) return null;
  return strictSignSlug(skyPulse.moonSign) ?? strictSignSlug(skyPulse.moonSignTurkish);
}

function localizeSignLabel(slug: SignSlug | null, locale: DashboardLocale): string {
  if (!slug) return '';
  return isEnglish(locale) ? SIGN_LABEL_EN[slug] : SIGN_LABEL_TR[slug];
}

function signIndex(slug: SignSlug | null): number {
  return slug ? SIGN_ORDER.indexOf(slug) : -1;
}

function computeAspect(sunIdx: number, moonIdx: number): Aspect {
  if (sunIdx < 0 || moonIdx < 0) return 'none';
  const diff = Math.abs(sunIdx - moonIdx) % 12;
  const norm = diff > 6 ? 12 - diff : diff;
  if (norm === 0) return 'conj';
  if (norm === 2) return 'sext';
  if (norm === 3) return 'square';
  if (norm === 4) return 'trine';
  if (norm === 6) return 'opp';
  return 'none';
}

function moonPhaseKey(phase: string | null | undefined): PhaseKey | null {
  const norm = slugify(phase ?? '').replace(/-/g, ' ');
  if (!norm) return null;
  if (norm.includes('new moon') || norm.includes('yeni ay')) return 'new-moon';
  if (norm.includes('full moon') || norm.includes('dolunay')) return 'full-moon';
  if (norm.includes('first quarter') || norm.includes('ilk dordun')) return 'first-quarter';
  if (norm.includes('last quarter') || norm.includes('third quarter') || norm.includes('son dordun')) return 'last-quarter';
  if (norm.includes('waxing crescent') || norm.includes('buyuyen hilal')) return 'waxing-crescent';
  if (norm.includes('waxing gibbous') || norm.includes('buyuyen siskin')) return 'waxing-gibbous';
  if (norm.includes('waning gibbous') || norm.includes('kuculen siskin')) return 'waning-gibbous';
  if (norm.includes('waning crescent') || norm.includes('kuculen hilal')) return 'waning-crescent';
  return null;
}

function hashSeed(value: string): number {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function pickTemplate<T extends readonly string[]>(templates: T, seed: string): string {
  if (!templates.length) {
    return '';
  }

  return templates[hashSeed(seed) % templates.length];
}

function ensureSingleSentence(value: string, max = 108): string {
  const trimmed = compactWhitespace(value);
  if (!trimmed) {
    return '';
  }

  const sentenceMatch = trimmed.match(/^(.+?[.!?])(?:\s|$)/);
  const firstSentence = compactWhitespace(sentenceMatch?.[1] ?? trimmed);
  const withPunctuation = /[.!?]$/.test(firstSentence) ? firstSentence : `${firstSentence}.`;
  return clampText(withPunctuation, max);
}

function extractFirstName(user: UserProfile | null): string {
  const raw = (user?.firstName ?? user?.name ?? '').trim();
  if (!raw) return '';
  return raw.split(/\s+/)[0] ?? '';
}

function lowercaseFirstChar(value: string): string {
  if (!value) return value;
  const first = value.charAt(0);
  const lower = first.toLocaleLowerCase('tr-TR');
  if (lower === first) return value;
  return lower + value.slice(1);
}

const PROPER_NOUN_FIRST_WORDS: ReadonlySet<string> = new Set([
  ...Object.values(SIGN_LABEL_TR),
  ...Object.values(SIGN_LABEL_EN),
  'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'Merkür', 'Venüs', 'Jüpiter', 'Satürn', 'Uranüs', 'Neptün', 'Plüton',
]);

function startsWithProperNoun(text: string): boolean {
  const firstWord = compactWhitespace(text).split(/\s+/u)[0]?.replace(/[,;:.!?]+$/u, '') ?? '';
  if (!firstWord) return false;
  return PROPER_NOUN_FIRST_WORDS.has(firstWord);
}

function getTodayLocalDate(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function splitIntoSentences(text: string): string[] {
  const matches = text.match(/[^.!?]+[.!?]+/gu);
  if (matches && matches.length > 0) {
    return matches.map((s) => compactWhitespace(s)).filter((s) => s.length > 0);
  }
  const single = compactWhitespace(text);
  return single ? [single] : [];
}

function extractCmsTheme(cms: CmsDailyHoroscope | null, locale: DashboardLocale): string {
  if (!cms) return '';
  const summary = compactWhitespace(cms.shortSummary ?? cms.fullContent ?? '');
  if (summary && matchesRequestedLocale(summary, locale)) {
    const sentences = splitIntoSentences(summary);
    const first = sentences[0];
    if (first && first.length >= 24) return first;
  }
  const title = compactWhitespace(cms.title ?? '');
  if (title.length >= 16 && matchesRequestedLocale(title, locale)) return title;
  return '';
}

function extractCmsAdvice(cms: CmsDailyHoroscope | null, locale: DashboardLocale): string {
  if (!cms) return '';
  const summary = compactWhitespace(cms.shortSummary ?? cms.fullContent ?? '');
  if (!summary || !matchesRequestedLocale(summary, locale)) return '';
  const sentences = splitIntoSentences(summary);
  const second = sentences[1];
  if (second && second.length >= 24) return second;
  return '';
}

function withTrailingPeriod(value: string): string {
  const cleaned = compactWhitespace(value).replace(/[,;:—–\s]+$/u, '').trim();
  if (!cleaned) return '';
  return /[.!?]$/u.test(cleaned) ? cleaned : `${cleaned}.`;
}

/**
 * CMS gibi uzun yorum metninden hero için tek cümle çıkarır.
 * Yalnızca cümle sonunda (nokta/!/?) keser; virgül/em-tire gibi clause'larda asla kesmez.
 * Cümle uzunsa hero UI font/line sayısını responsive olarak küçültür — burada üst sınır yok.
 * Anlamlı bir cümle (>=24 karakter) bulunamazsa boş döner.
 */
function summarizeForHero(text: string | null | undefined): string {
  const trimmed = compactWhitespace(text);
  if (!trimmed) return '';

  const sentences = trimmed.match(/[^.!?]+[.!?]+/gu) ?? [trimmed];
  for (const raw of sentences) {
    const sentence = compactWhitespace(raw);
    if (sentence.length >= 24) {
      return withTrailingPeriod(sentence);
    }
  }
  return '';
}

function buildHeroInsightFromDaily(
  user: UserProfile | null,
  cmsDaily: CmsDailyHoroscope | null,
  homeBrief: HomeBrief | null,
  skyPulse: SkyPulseResponse | null,
  fallbackInsight: string,
  locale: DashboardLocale,
): string {
  const todayKey = new Date().toISOString().slice(0, 10);
  const userKey = user?.id ?? user?.username ?? 'guest';
  const seedBase = `${todayKey}|${locale}|${userKey}`;
  const firstName = extractFirstName(user);
  const namePrefix = firstName ? `${firstName}, ` : '';

  // 1) Retro priority — per-planet, expert-toned templates.
  const retroPlanets = Array.isArray(skyPulse?.retrogradePlanets) ? skyPulse!.retrogradePlanets : [];
  const retroKeys = Array.from(
    new Set(retroPlanets.map(classifyRetroPlanet).filter((key): key is RetroPlanetKey => key !== null)),
  );
  if (retroKeys.length >= 2) {
    const pool = isEnglish(locale) ? RETRO_TEMPLATES_EN.multi : RETRO_TEMPLATES_TR.multi;
    const tmpl = pickTemplate(pool, `${seedBase}|multi`);
    return ensureSingleSentence(tmpl.replace('{name}', namePrefix), 110);
  }
  if (retroKeys.length === 1) {
    const key = retroKeys[0];
    const pool = isEnglish(locale) ? RETRO_TEMPLATES_EN[key] : RETRO_TEMPLATES_TR[key];
    const tmpl = pickTemplate(pool, `${seedBase}|${key}`);
    return ensureSingleSentence(tmpl.replace('{name}', namePrefix), 110);
  }

  // 2) CMS daily horoscope — first sentence is returned as-is (no length cap).
  // Hero UI shrinks font / lifts numberOfLines responsively if the sentence is long.
  const cmsRaw = compactWhitespace(cmsDaily?.shortSummary ?? cmsDaily?.fullContent);
  if (cmsRaw && !isWeakDashboardText(cmsRaw) && matchesRequestedLocale(cmsRaw, locale)) {
    const cmsSummary = summarizeForHero(cmsRaw);
    if (cmsSummary) {
      const body = namePrefix ? lowercaseFirstChar(cmsSummary) : cmsSummary;
      return `${namePrefix}${body}`;
    }
  }

  // 3) Sun-Moon aspect — needs both signs known.
  const sunSlug = strictSignSlug(user?.zodiacSign);
  const moonSlug = moonSignToSlug(skyPulse);
  if (sunSlug && moonSlug) {
    const aspect = computeAspect(signIndex(sunSlug), signIndex(moonSlug));
    if (aspect !== 'none') {
      const pool = isEnglish(locale) ? ASPECT_TEMPLATES_EN[aspect] : ASPECT_TEMPLATES_TR[aspect];
      const tmpl = pickTemplate(pool, `${seedBase}|${aspect}|${sunSlug}|${moonSlug}`);
      const sunLabel = localizeSignLabel(sunSlug, locale);
      const moonLabel = localizeSignLabel(moonSlug, locale);
      return ensureSingleSentence(
        tmpl.replace('{name}', namePrefix).replace(/\{moon}/g, moonLabel).replace(/\{sun}/g, sunLabel),
        110,
      );
    }
  }

  // 4) Moon phase fallback — luminary-driven when sign data is partial.
  const phaseKey = moonPhaseKey(skyPulse?.moonPhase);
  if (phaseKey) {
    const pool = isEnglish(locale) ? PHASE_TEMPLATES_EN[phaseKey] : PHASE_TEMPLATES_TR[phaseKey];
    if (pool && pool.length) {
      const tmpl = pickTemplate(pool, `${seedBase}|${phaseKey}`);
      const moonLabel = localizeSignLabel(moonSlug, locale) || (isEnglish(locale) ? 'this sign' : 'bu burç');
      return ensureSingleSentence(tmpl.replace(/\{moon}/g, moonLabel), 110);
    }
  }

  // 5) HomeBrief headline as a last expert-voice fallback.
  const oracleHeadline = firstStrongText(locale, 96, homeBrief?.transitHeadline, homeBrief?.dailyEnergy);
  if (oracleHeadline && !isWeakDashboardText(oracleHeadline)) {
    const body = namePrefix ? lowercaseFirstChar(oracleHeadline) : oracleHeadline;
    return ensureSingleSentence(`${namePrefix}${body}`, 110);
  }

  return ensureSingleSentence(`${namePrefix}${fallbackInsight}`, 110);
}

function localizeMoonPhase(value: string | null | undefined, locale: DashboardLocale): string {
  const phase = compactWhitespace(value);
  if (!phase) {
    return '';
  }

  const normalized = slugify(phase).replace(/-/g, ' ');
  const map: Array<{ keys: string[]; tr: string; en: string }> = [
    { keys: ['new moon', 'yeni ay'], tr: 'Yeni Ay', en: 'New Moon' },
    { keys: ['waxing crescent', 'buyuyen hilal'], tr: 'Büyüyen Hilal', en: 'Waxing Crescent' },
    { keys: ['first quarter', 'ilk dordun'], tr: 'İlk Dördün', en: 'First Quarter' },
    { keys: ['waxing gibbous', 'buyuyen siskin ay', 'siskin ay'], tr: 'Büyüyen Şişkin Ay', en: 'Waxing Gibbous' },
    { keys: ['full moon', 'dolunay'], tr: 'Dolunay', en: 'Full Moon' },
    { keys: ['waning gibbous', 'kuculen siskin ay'], tr: 'Küçülen Şişkin Ay', en: 'Waning Gibbous' },
    { keys: ['last quarter', 'third quarter', 'son dordun'], tr: 'Son Dördün', en: 'Last Quarter' },
    { keys: ['waning crescent', 'kuculen hilal'], tr: 'Küçülen Hilal', en: 'Waning Crescent' },
  ];

  const matchedEntry = map.find((entry) => entry.keys.some((key) => normalized.includes(key)));
  if (!matchedEntry) {
    return phase;
  }

  return locale === 'en' ? matchedEntry.en : matchedEntry.tr;
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
      ? 'Trust your intuition over speed today, and give important messages one more careful pass.'
      : 'Bugün hızdan çok sezgine güven; önemli mesajları bir kez daha süzmek iyi gelebilir.';
  }
  if (retroCount === 1) {
    return isEnglish(locale)
      ? 'Today flows better when your words are clear and your plan stays simple.'
      : 'Bugün en rahat akış, net cümleler ve sade bir planla kuruluyor.';
  }
  if (moonSign) {
    return isEnglish(locale)
      ? `${moonSign} energy strengthens your inner balance and helps you gather focus around one intention.`
      : `${moonSign} bugün iç dengeni güçlendiriyor; odağını tek bir niyette toplaman kolaylaşabilir.`;
  }
  if (moonPhase) {
    return isEnglish(locale)
      ? `Under the ${moonPhase}, one small but clear step can shift the direction of your day.`
      : `${moonPhase} altında küçük ama net bir adım, günün akışını değiştirebilir.`;
  }
  return isEnglish(locale)
    ? 'When you gather your energy around one intention today, everything else can feel clearer.'
    : 'Bugün enerjini tek bir odakta toplaman, günün geri kalanını daha berrak kılabilir.';
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

  const fallbackDesc = (key: 'strength' | 'opportunity' | 'threat' | 'weakness', intensity: number) => {
    if (isEnglish(locale)) {
      if (key === 'strength') return intensity >= 60 ? 'Momentum is strong in this area this week.' : 'A stable source of support stays active this week.';
      if (key === 'opportunity') return intensity >= 60 ? 'A clear opening is worth acting on this week.' : 'Watch for smaller openings building in the background.';
      if (key === 'weakness') return intensity >= 60 ? 'Protect your energy in draining moments this week.' : 'Notice where your energy drops and keep your pace balanced.';
      return intensity >= 60 ? 'Move carefully around pressure points this week.' : 'Keep plans flexible and avoid forcing outcomes.';
    }

    if (key === 'strength') return intensity >= 60 ? 'Bu alan bu hafta güçlü destek alıyor.' : 'Bu alanda dengeli bir destek devam ediyor.';
    if (key === 'opportunity') return intensity >= 60 ? 'Bu hafta değerlendirmeye açık net bir fırsat var.' : 'Daha küçük ama anlamlı açılımlar birikiyor.';
    if (key === 'weakness') return intensity >= 60 ? 'Bu hafta enerji düşüren alanlarda ritmini koru.' : 'Enerji düşüşlerini fark edip temponu dengede tut.';
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
    {
      key: 'weakness',
      title: isEnglish(locale) ? 'Energy Drain' : 'Enerji Kaybı',
      desc: clampText(
        isEnglish(locale)
          ? fallbackDesc('weakness', swot.weakness.intensity)
          : swot.weakness.quickTip || swot.weakness.subtext || fallbackDesc('weakness', swot.weakness.intensity),
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
  cmsDaily: CmsDailyHoroscope | null,
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
  const cmsTheme = extractCmsTheme(cmsDaily, locale);
  const cmsAdvice = extractCmsAdvice(cmsDaily, locale);
  const transitHeadline = firstStrongText(
    locale,
    88,
    cmsTheme,
    homeBrief?.transitHeadline,
    homeBrief?.dailyEnergy,
    fallbackHeadline,
  );
  const transitAdvice = firstStrongText(
    locale,
    88,
    cmsAdvice,
    homeBrief?.actionMessage,
    homeBrief?.transitPoints?.[0],
    fallbackAdvice,
  );
  const heroInsight = buildHeroInsightFromDaily(
    user,
    cmsDaily,
    homeBrief,
    skyPulse,
    fallbackInsight,
    locale,
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
      insightText: heroInsight,
      ctaText: isEnglish(locale) ? 'See your sky' : 'Haritanı gör',
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

/**
 * Hızlı faz: Sadece skyPulse + weeklySwot (~1-2sn).
 * Oracle AI synthesis beklenmiyor; dashboard fallback içerikle anında render edilir.
 * Oracle verisi ayrı sorguda gelince üst katar olarak uygulanır.
 */
function buildCmsDailyPromise(
  user: UserProfile | null,
  locale: DashboardLocale,
): Promise<CmsDailyHoroscope | null> {
  const sunSlug = strictSignSlug(user?.zodiacSign);
  if (!sunSlug) return Promise.resolve(null);
  const today = new Date().toISOString().slice(0, 10);
  return fetchDailyHoroscopeFromCms(sunSlug, today, locale).catch(() => null);
}

function selectPublishedCmsDaily(value: CmsDailyHoroscope | null | undefined): CmsDailyHoroscope | null {
  if (!value || value.status !== 'PUBLISHED') return null;
  const hasContent = compactWhitespace(value.shortSummary).length > 0 || compactWhitespace(value.fullContent).length > 0;
  return hasContent ? value : null;
}

export async function fetchHomeDashboardFast({ user, locale }: FetchHomeDashboardParams): Promise<HomeDashboardResponse> {
  const resolvedLocale = normalizeLocale(locale ?? user?.preferredLanguage ?? 'tr');

  if (!envConfig.isApiConfigured) {
    return buildDashboardFromSources(user, null, null, null, null, resolvedLocale);
  }

  const [skyPulseResult, weeklySwotResult, cmsDailyResult] = await Promise.allSettled([
    fetchSkyPulse(resolvedLocale),
    (user?.id && user?.birthDate) ? fetchWeeklySwot(user.id, resolvedLocale) : Promise.resolve(null),
    buildCmsDailyPromise(user, resolvedLocale),
  ]);

  const skyPulse = skyPulseResult.status === 'fulfilled' ? skyPulseResult.value.data : null;
  const weeklySwot =
    weeklySwotResult.status === 'fulfilled'
      ? (weeklySwotResult.value && 'data' in weeklySwotResult.value ? weeklySwotResult.value.data : null)
      : null;
  const cmsDaily = cmsDailyResult.status === 'fulfilled' ? selectPublishedCmsDaily(cmsDailyResult.value) : null;

  if (skyPulseResult.status === 'rejected') {
    logApiError('home-dashboard-fast', skyPulseResult.reason, { source: 'sky-pulse' });
  }

  // skyPulse yoksa minimal dashboard; en kötü durumda statik quick actions gösterilir.
  return buildDashboardFromSources(user, null, skyPulse, weeklySwot, cmsDaily, resolvedLocale);
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
    return buildDashboardFromSources(user, null, null, null, null, resolvedLocale);
  }

  const [homeBriefResult, skyPulseResult, weeklySwotResult, cmsDailyResult] = await Promise.allSettled([
    fetchHomeBrief({
      name: user?.firstName || user?.name,
      birthDate: user?.birthDate,
      maritalStatus: user?.maritalStatus,
      locale: resolvedLocale,
    }),
    fetchSkyPulse(resolvedLocale),
    (user?.id && user?.birthDate) ? fetchWeeklySwot(user.id, resolvedLocale) : Promise.resolve(null),
    buildCmsDailyPromise(user, resolvedLocale),
  ]);

  const homeBrief = homeBriefResult.status === 'fulfilled' ? homeBriefResult.value.data : null;
  const skyPulse = skyPulseResult.status === 'fulfilled' ? skyPulseResult.value.data : null;
  const cmsDaily = cmsDailyResult.status === 'fulfilled' ? selectPublishedCmsDaily(cmsDailyResult.value) : null;
  const weeklySwot =
    weeklySwotResult.status === 'fulfilled'
      ? (weeklySwotResult.value && 'data' in weeklySwotResult.value ? weeklySwotResult.value.data : null)
      : null;

  if (homeBriefResult.status === 'rejected') {
    // ECONNABORTED = axios timeout; oracle yokken dashboard fallback içerikle render edilir.
    const isTimeout = (homeBriefResult.reason as any)?.code === 'ECONNABORTED';
    logApiError('home-dashboard', homeBriefResult.reason, {
      source: 'home-brief',
      timed_out: isTimeout,
    });
  }

  if (skyPulseResult.status === 'rejected') {
    logApiError('home-dashboard', skyPulseResult.reason, { source: 'sky-pulse' });
  }

  if (homeBriefResult.status === 'rejected' && skyPulseResult.status === 'rejected') {
    throw new Error('HOME_DASHBOARD_UPSTREAM_UNAVAILABLE');
  }

  return buildDashboardFromSources(user, homeBrief, skyPulse, weeklySwot, cmsDaily, resolvedLocale);
}
