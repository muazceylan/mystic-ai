import api from './api';
import type {
  CrossAspect,
  SynastryAnalysisSection,
  SynastryDisplayMetric,
  SynastryResponse,
  SynastryScoreBreakdown,
} from './synastry.service';
import type {
  AspectDTO,
  AspectTone,
  AxisDTO,
  CategoryScoreDTO,
  GrowthAreaDTO,
  MatchDTO,
  MatchResultKind,
  MatchSeedDTO,
} from '../types/match';
import {
  localizeAspectName,
  localizeAspectType,
  localizeAstroText,
  localizePlanetName,
  parseLocalizedSignLabel,
} from '../utils/matchAstroLabels';

export interface TraitAxis {
  id: string;
  title?: string;
  leftLabel: string;
  rightLabel: string;
  score0to100: number;
  note?: string | null;
}

export interface CategoryGroup {
  id: string;
  title: string;
  items: TraitAxis[];
}

export interface MatchTraitsResponse {
  matchId: number;
  compatibilityScore: number | null;
  categories: CategoryGroup[];
  cardAxes: TraitAxis[];
  cardSummary?: string | null;
}

const MATCH_BASE = '/api/v1/match';

const TECHNICAL_TERMS: Array<{ term: string; replacement: string }> = [
  { term: 'açı', replacement: 'dinamik' },
  { term: 'orb', replacement: 'yakınlık payı' },
  { term: 'ev', replacement: 'alan' },
  { term: 'kavuşum', replacement: 'yakın temas' },
  { term: 'kare', replacement: 'ritim farkı' },
  { term: 'üçgen', replacement: 'doğal akış' },
  { term: 'opozisyon', replacement: 'karşıt ritim' },
];

const DEFAULT_LEFT_NAME = 'Aslı';
const DEFAULT_RIGHT_NAME = 'Muaz';

function clampScore(value: unknown, fallback = 50) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clampCount(value: unknown, fallback = 0) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.round(n));
}

function asString(value: unknown, fallback = '') {
  return typeof value === 'string' ? value.trim() || fallback : fallback;
}

function asObject(value: unknown): Record<string, any> {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, any>;
}

function asArray<T = unknown>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceStandaloneWord(text: string, term: string, replacement: string) {
  const WORD_CHARS = 'A-Za-z0-9ÇĞİÖŞÜçğıöşü';
  const regex = new RegExp(`(^|[^${WORD_CHARS}])(${escapeRegex(term)})(?=[^${WORD_CHARS}]|$)`, 'gi');
  return text.replace(regex, (_, leading: string) => `${leading}${replacement}`);
}

function sanitizePlainText(text: string, fallback: string) {
  const source = text.trim() || fallback;
  let next = source;
  for (const rule of TECHNICAL_TERMS) {
    next = replaceStandaloneWord(next, rule.term, rule.replacement);
  }
  return next.replace(/\s{2,}/g, ' ').trim();
}

function normalizeResult(value: unknown): MatchResultKind {
  if (typeof value === 'string') {
    const normalized = value.toUpperCase().replace(/\s+/g, '_');
    if (normalized.includes('UYUM')) return 'UYUMLU';
    if (normalized.includes('GELIS')) return 'GELISIM_ALANI';
    if (normalized.includes('DIKKAT') || normalized.includes('RISK')) return 'DIKKAT';
  }
  return 'GELISIM_ALANI';
}

function resolveResult(leftScore: number, rightScore: number): MatchResultKind {
  const delta = Math.abs(leftScore - rightScore);
  if (delta <= 16) return 'UYUMLU';
  if (delta <= 40) return 'GELISIM_ALANI';
  return 'DIKKAT';
}

function tipForResult(result: MatchResultKind) {
  if (result === 'UYUMLU') {
    return 'Bu akışı korumak için haftada 1 kez kısa check-in yapın.';
  }
  if (result === 'DIKKAT') {
    return 'Gerilim yükselince 10 dakika mola verip tek konuya geri dönün.';
  }
  return 'Konuya başlamadan önce niyetinizi tek cümleyle netleştirin.';
}

function prettifyAxisTitle(id: string, index: number) {
  const cleaned = id
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\bcross\b/gi, '')
    .trim();

  const lowered = cleaned.toLocaleLowerCase('tr-TR');
  if (/\bask\b/.test(lowered)) return `Aşk Dinamiği ${index + 1}`;
  if (/\biletisim\b/.test(lowered)) return `İletişim Dinamiği ${index + 1}`;
  if (/\bguven\b/.test(lowered)) return `Güven Dinamiği ${index + 1}`;
  if (/\btutku\b/.test(lowered)) return `Tutku Dinamiği ${index + 1}`;

  if (!cleaned) return `Karşılaştırma Ekseni ${index + 1}`;

  return cleaned
    .split(' ')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function humanizeAxisTitle(value: string, index: number) {
  const cleaned = value
    .replace(/\bcross\b/giu, '')
    .replace(/\bask\b/giu, 'Aşk')
    .replace(/\biletisim\b/giu, 'İletişim')
    .replace(/\bguven\b/giu, 'Güven')
    .replace(/\btutku\b/giu, 'Tutku')
    .replace(/\s{2,}/g, ' ')
    .trim();

  return cleaned || `Karşılaştırma Ekseni ${index + 1}`;
}

function parseSignLabel(label: string | undefined, fallback = 'Burç') {
  const parsed = parseLocalizedSignLabel(label, fallback);
  return { signIcon: parsed.icon, signLabel: parsed.label };
}

function fallbackCategoryScores(overallScore: number): CategoryScoreDTO[] {
  return [
    { id: 'love', label: 'Love', value: clampScore(overallScore + 6, 72) },
    { id: 'communication', label: 'Communication', value: clampScore(overallScore - 4, 67) },
    { id: 'trust', label: 'Trust', value: clampScore(overallScore - 2, 69) },
    { id: 'passion', label: 'Passion', value: clampScore(overallScore + 3, 71) },
  ];
}

function normalizeCategoryId(value: string): CategoryScoreDTO['id'] | null {
  const key = value.toLowerCase();
  if (key.includes('love') || key.includes('sevgi')) return 'love';
  if (key.includes('comm') || key.includes('ilet')) return 'communication';
  if (key.includes('trust') || key.includes('güven') || key.includes('guven')) return 'trust';
  if (key.includes('passion') || key.includes('tutku')) return 'passion';
  return null;
}

function normalizeCategories(value: unknown, overallScore: number): CategoryScoreDTO[] {
  const rawItems = asArray<any>(value);
  const byId = new Map<CategoryScoreDTO['id'], CategoryScoreDTO>();

  for (const raw of rawItems) {
    const obj = asObject(raw);
    const key = normalizeCategoryId(String(obj.id ?? obj.key ?? obj.label ?? ''));
    if (!key) continue;

    const defaultLabel = key === 'love'
      ? 'Love'
      : key === 'communication'
        ? 'Communication'
        : key === 'trust'
          ? 'Trust'
          : 'Passion';

    byId.set(key, {
      id: key,
      label: asString(obj.label, defaultLabel),
      value: clampScore(obj.value ?? obj.score ?? obj.percent ?? obj.percentage, overallScore),
    });
  }

  return fallbackCategoryScores(overallScore).map((fallback) => byId.get(fallback.id) ?? fallback);
}

function normalizeCategoriesFromGroups(groups: CategoryGroup[], overallScore: number): CategoryScoreDTO[] {
  if (!groups.length) return [];

  const byId = new Map<CategoryScoreDTO['id'], CategoryScoreDTO>();

  for (const group of groups) {
    const key = normalizeCategoryId(asString(group.id, asString(group.title, '')));
    if (!key) continue;

    const items = asArray<TraitAxis>(group.items);
    const harmonyScores = items
      .map((item) => {
        const axisScore = clampScore(item?.score0to100, 50);
        return clampScore(100 - Math.abs(axisScore - 50) * 2, overallScore);
      })
      .filter((value) => Number.isFinite(value));

    const avg = harmonyScores.length
      ? Math.round(harmonyScores.reduce((sum, value) => sum + value, 0) / harmonyScores.length)
      : overallScore;

    const label = key === 'love'
      ? 'Love'
      : key === 'communication'
        ? 'Communication'
        : key === 'trust'
          ? 'Trust'
          : 'Passion';

    byId.set(key, {
      id: key,
      label,
      value: clampScore(avg, overallScore),
    });
  }

  return fallbackCategoryScores(overallScore).map((fallback) => byId.get(fallback.id) ?? fallback);
}

function normalizeAxisFromTrait(item: TraitAxis, index: number): AxisDTO {
  const rightScore = clampScore(item.score0to100, 50);
  const leftScore = clampScore(100 - rightScore, 50);
  const result = resolveResult(leftScore, rightScore);
  const impactFallback = `${item.leftLabel} ile ${item.rightLabel} aynı konuda farklı hızda ilerleyebiliyor.`;

  return {
    id: asString(item.id, `axis-${index + 1}`),
    title: sanitizePlainText(
      humanizeAxisTitle(asString(item.title, prettifyAxisTitle(item.id, index)), index),
      `Karşılaştırma Ekseni ${index + 1}`,
    ),
    leftLabel: sanitizePlainText(asString(item.leftLabel, 'Netlik arar'), 'Netlik arar'),
    rightLabel: sanitizePlainText(asString(item.rightLabel, 'Düşünerek yaklaşır'), 'Düşünerek yaklaşır'),
    leftScore,
    rightScore,
    impactPlain: sanitizePlainText(asString(item.note, impactFallback), impactFallback),
    tipPlain: tipForResult(result),
    result,
  };
}

function normalizeAxis(item: unknown, index: number): AxisDTO {
  const obj = asObject(item);

  if (typeof obj.score0to100 === 'number' && typeof obj.leftLabel === 'string' && typeof obj.rightLabel === 'string') {
    return normalizeAxisFromTrait(
      {
        id: asString(obj.id, `axis-${index + 1}`),
        leftLabel: asString(obj.leftLabel, 'Netlik arar'),
        rightLabel: asString(obj.rightLabel, 'Düşünerek yaklaşır'),
        score0to100: clampScore(obj.score0to100, 50),
        note: asString(obj.note, ''),
      },
      index,
    );
  }

  const leftScore = clampScore(obj.leftScore ?? obj.leftValue ?? (100 - clampScore(obj.score, 50)), 50);
  const rightScore = clampScore(obj.rightScore ?? obj.rightValue ?? obj.score ?? (100 - leftScore), 50);
  const result = obj.result ? normalizeResult(obj.result) : resolveResult(leftScore, rightScore);
  const leftLabel = sanitizePlainText(asString(obj.leftLabel, 'Daha net'), 'Daha net');
  const rightLabel = sanitizePlainText(asString(obj.rightLabel, 'Daha temkinli'), 'Daha temkinli');
  const impactFallback = `${leftLabel} ve ${rightLabel} yaklaşımı aynı konuda farklı ritim üretebiliyor.`;

  return {
    id: asString(obj.id, `axis-${index + 1}`),
    title: sanitizePlainText(
      humanizeAxisTitle(
        asString(obj.title, prettifyAxisTitle(asString(obj.id, `axis-${index + 1}`), index)),
        index,
      ),
      `Karşılaştırma Ekseni ${index + 1}`,
    ),
    leftLabel,
    rightLabel,
    leftScore,
    rightScore,
    impactPlain: sanitizePlainText(asString(obj.impactPlain ?? obj.impact ?? obj.note, impactFallback), impactFallback),
    tipPlain: sanitizePlainText(asString(obj.tipPlain, tipForResult(result)), tipForResult(result)),
    result,
  };
}

function normalizeAxes(value: unknown): AxisDTO[] {
  const directAxes = asArray(value);

  if (directAxes.length > 0) {
    return directAxes.map((axis, index) => normalizeAxis(axis, index)).slice(0, 12);
  }

  return [
    {
      id: 'iletisim-tarzi',
      title: 'İletişim Tarzı',
      leftLabel: 'Daha net konuşur',
      rightLabel: 'Önce düşünür',
      leftScore: 62,
      rightScore: 38,
      impactPlain: 'Aynı konuda farklı ifade hızları olunca konuşma temposu dalgalanabiliyor.',
      tipPlain: 'Konuya başlarken "şu an netlik mi destek mi?" diye sorun.',
      result: 'GELISIM_ALANI',
    },
    {
      id: 'duygusal-ritim',
      title: 'Duygusal Ritim',
      leftLabel: 'Hızlı paylaşır',
      rightLabel: 'İçe dönerek işler',
      leftScore: 54,
      rightScore: 46,
      impactPlain: 'Biriniz anında konuşmak isterken diğeriniz toparlanmak için süre isteyebilir.',
      tipPlain: 'Yoğun anlarda 15 dakika sakin alan tanıyıp tekrar buluşun.',
      result: 'UYUMLU',
    },
    {
      id: 'karar-ritmi',
      title: 'Karar Ritmi',
      leftLabel: 'Hızlı karar alır',
      rightLabel: 'Adım adım ilerler',
      leftScore: 70,
      rightScore: 30,
      impactPlain: 'Karar alma hızındaki fark, özellikle belirsiz zamanlarda gerilim yaratabiliyor.',
      tipPlain: 'Önemli kararlarda ortak bir zaman kutusu belirleyin: 20 dk konuşma + 10 dk netleştirme.',
      result: 'DIKKAT',
    },
  ];
}

function normalizeGrowthAreas(value: unknown, axes: AxisDTO[]): GrowthAreaDTO[] {
  const rawItems = asArray<any>(value);

  if (rawItems.length > 0) {
    return rawItems.slice(0, 4).map((item, index) => {
      const obj = asObject(item);
      const title = asString(obj.title, `Gelişim Alanı ${index + 1}`);
      const trigger = asString(obj.trigger, 'Yoğun bir gün sonrası konuşma anı');
      const pattern = asString(obj.pattern, 'Aynı anda çözüm ve duyguyu yönetmeye çalışma');
      const protocolSource = asArray<string>(obj.protocol)
        .map((step) => asString(step, ''))
        .filter(Boolean)
        .slice(0, 3);
      const protocol: [string, string, string] = [
        protocolSource[0] ?? 'Duyguyu adlandırın ve tek bir konu seçin.',
        protocolSource[1] ?? 'Sırayla 90 saniye konuşun, diğer kişi tekrar etsin.',
        protocolSource[2] ?? 'Günün sonuna tek bir küçük anlaşma yazın.',
      ];

      return {
        id: asString(obj.id, `growth-${index + 1}`),
        title,
        trigger,
        pattern,
        protocol,
        habitLabel: asString(obj.habitLabel ?? obj.habit, 'Bu hafta bir kez uygulayın'),
      };
    });
  }

  const priorityAxes = axes
    .filter((axis) => axis.result !== 'UYUMLU')
    .concat(axes.filter((axis) => axis.result === 'UYUMLU'))
    .slice(0, 3);

  return priorityAxes.map((axis, index) => ({
    id: `growth-${axis.id}`,
    title: axis.title,
    trigger: 'Yoğun bir gün sonrası konuşurken',
    pattern: `${axis.leftLabel} ve ${axis.rightLabel} ritim farkı aynı anda görünür olur.`,
    protocol: [
      `Önce niyeti söyleyin: "Bu konuşmada hedefim ${index === 0 ? 'yakınlaşmak' : 'netleşmek'}".`,
      'İki taraf da 90 saniye kesmeden konuşsun; diğer taraf sadece duyduğunu tekrar etsin.',
      'Konuşmayı tek bir mikro anlaşmayla kapatın ve ertesi gün kısa follow-up yapın.',
    ],
    habitLabel: 'Bu hafta dene: 10 dakikalık sakin başlangıç',
  }));
}

function normalizeAspectTone(item: Record<string, any>): AspectTone {
  if (typeof item.harmonious === 'boolean') {
    return item.harmonious ? 'DESTEKLEYICI' : 'ZORLAYICI';
  }

  const tone = String(item.tone ?? item.result ?? '').toUpperCase();
  if (tone.includes('DESTEK') || tone.includes('UYUM') || tone.includes('HARMONY')) return 'DESTEKLEYICI';
  return 'ZORLAYICI';
}

function normalizeAspects(value: unknown): AspectDTO[] {
  const rawItems = asArray<any>(value);

  return rawItems
    .map((item, index) => {
      const obj = asObject(item);
      const userPlanet = localizePlanetName(asString(obj.userPlanet, 'Kişi A'), 'Kişi A');
      const partnerPlanet = localizePlanetName(asString(obj.partnerPlanet, 'Kişi B'), 'Kişi B');
      const aspectName = localizeAspectType(asString(obj.aspectTurkish ?? obj.aspectType ?? obj.type, 'Dinamik')) ?? 'Dinamik';
      const nameFallback = `${userPlanet} ${aspectName} ${partnerPlanet}`;
      const normalizedName = localizeAspectName(asString(obj.name, nameFallback), nameFallback);
      const tone = normalizeAspectTone(obj);
      const fallbackTheme = tone === 'DESTEKLEYICI'
        ? 'Birlikte akışı kolaylaştıran bağ'
        : 'Enerji dengesini ayarlamayı isteyen bağ';

      return {
        id: asString(obj.id, `aspect-${index + 1}`),
        name: normalizedName,
        theme: localizeAstroText(asString(obj.theme, fallbackTheme), fallbackTheme),
        orb: Number.isFinite(Number(obj.orb)) ? Number(obj.orb) : 0,
        tone,
        house: obj.house ? localizeAstroText(asString(obj.house, ''), '') : undefined,
        aspectType: obj.aspectType ? localizeAspectType(asString(obj.aspectType, '')) : undefined,
      } as AspectDTO;
    })
    .filter((item) => Boolean(item.name));
}

function normalizeDailySuggestions(value: unknown): [string, string] {
  const items = asArray<string>(value)
    .map((entry) => asString(entry, ''))
    .filter(Boolean)
    .slice(0, 2);

  return [
    items[0] ?? 'Akşam 10 dakikalık “nasılsın?” check-in yapın.',
    items[1] ?? 'Yarın için tek bir ortak mini hedef belirleyin.',
  ];
}

function foldPlanetKey(value: string) {
  return value
    .toUpperCase()
    .replace(/[ÇĞİÖŞÜ]/g, (char) => {
      if (char === 'Ç') return 'C';
      if (char === 'Ğ') return 'G';
      if (char === 'İ') return 'I';
      if (char === 'Ö') return 'O';
      if (char === 'Ş') return 'S';
      if (char === 'Ü') return 'U';
      return char;
    })
    .replace(/[^A-Z0-9]/g, '');
}

function planetBehaviorLabel(planet: string, role: 'left' | 'right') {
  const key = foldPlanetKey(planet);
  const source: Record<string, { left: string; right: string }> = {
    SUN: { left: 'net yön verir', right: 'takdir gördüğünde açılır' },
    MOON: { left: 'duyguyu hızlı hisseder', right: 'güvende olunca açılır' },
    MERCURY: { left: 'konuyu netleştirir', right: 'düşünerek ifade eder' },
    VENUS: { left: 'yakınlık kurar', right: 'uyum arar' },
    MARS: { left: 'hızlı harekete geçer', right: 'anlık tepki verir' },
    JUPITER: { left: 'büyütür ve motive eder', right: 'iyimser yaklaşır' },
    SATURN: { left: 'sınır koyar', right: 'zaman ve düzen ister' },
    URANUS: { left: 'yenilik ister', right: 'özgür alan arar' },
    NEPTUNE: { left: 'sezgisel bağ kurar', right: 'ince hisleri takip eder' },
    PLUTO: { left: 'derinleşmek ister', right: 'yoğunlukla dönüşür' },
  };

  return source[key]?.[role] ?? (role === 'left' ? 'netlik arar' : 'alan ister');
}

function planetDrive(planet: string) {
  const key = foldPlanetKey(planet);
  const map: Record<string, number> = {
    SUN: 10,
    MOON: -6,
    MERCURY: 4,
    VENUS: -2,
    MARS: 12,
    JUPITER: 2,
    SATURN: -10,
    URANUS: 6,
    NEPTUNE: -4,
    PLUTO: 8,
  };
  return map[key] ?? 0;
}

function resolveCrossAspectTheme(aspect: CrossAspect) {
  const left = foldPlanetKey(asString(aspect.userPlanet, ''));
  const right = foldPlanetKey(asString(aspect.partnerPlanet, ''));
  const pair = `${left} ${right} ${asString(aspect.aspectType, '')}`;

  if (/MERCURY|MERKUR/.test(pair)) return 'ILETISIM';
  if (/SATURN/.test(pair)) return 'GUVEN';
  if (/MARS|PLUTO/.test(pair)) return 'TUTKU';
  if (/VENUS|MOON|JUPITER/.test(pair)) return 'ASK';
  return 'ASK';
}

function resolveCrossImpact(theme: string, aspect: CrossAspect) {
  const left = localizePlanetName(asString(aspect.userPlanet, ''), 'Bir enerji');
  const right = localizePlanetName(asString(aspect.partnerPlanet, ''), 'Diğer enerji');
  if (aspect.harmonious) {
    if (theme === 'ILETISIM') {
      return `${left} ve ${right} aynı konuda birbirini daha kolay anlayabilir.`;
    }
    if (theme === 'GUVEN') {
      return `${left} ve ${right} güven duygusunu birlikte güçlendirebilir.`;
    }
    if (theme === 'TUTKU') {
      return `${left} ile ${right} arasında enerji ve motivasyon birlikte yükselebilir.`;
    }
    return `${left} ile ${right} arasında sıcaklık ve paylaşım akışı destekleniyor.`;
  }

  if (theme === 'ILETISIM') {
    return `${left} ile ${right} arasında konuşma temposu zaman zaman farklılaşabilir.`;
  }
  if (theme === 'GUVEN') {
    return `${left} ile ${right} güven dilini farklı yerlerden kurabilir.`;
  }
  if (theme === 'TUTKU') {
    return `${left} ve ${right} ritim farkında gerilim yaşayabilir.`;
  }
  return `${left} ile ${right} yakınlık beklentisini farklı anda yaşayabilir.`;
}

function resolveCrossRightScore(aspect: CrossAspect) {
  const leftDrive = planetDrive(asString(aspect.userPlanet, ''));
  const rightDrive = planetDrive(asString(aspect.partnerPlanet, ''));
  let score = 50 + (rightDrive - leftDrive) * 0.8;
  if (!aspect.harmonious) {
    score += score >= 50 ? 10 : -10;
  }
  if (Number.isFinite(aspect.orb)) {
    const orbPull = Math.max(0, 6 - Math.min(6, aspect.orb));
    score += aspect.harmonious ? orbPull * 1.1 : -orbPull * 0.8;
  }

  return Math.max(12, Math.min(88, Math.round(score)));
}

function normalizeCrossAspectsToTraitAxes(crossAspects: CrossAspect[]): TraitAxis[] {
  return crossAspects.slice(0, 10).map((aspect, index) => {
    const theme = resolveCrossAspectTheme(aspect);
    const userPlanet = localizePlanetName(asString(aspect.userPlanet, 'Kişi A'), 'Kişi A');
    const partnerPlanet = localizePlanetName(asString(aspect.partnerPlanet, 'Kişi B'), 'Kişi B');
    const rightScore = resolveCrossRightScore(aspect);

    return {
      id: `axis-${theme.toLowerCase()}-${index + 1}`,
      title: `${userPlanet} ve ${partnerPlanet}`,
      leftLabel: planetBehaviorLabel(userPlanet, 'left'),
      rightLabel: planetBehaviorLabel(partnerPlanet, 'right'),
      score0to100: rightScore,
      note: resolveCrossImpact(theme, aspect),
    };
  });
}

function normalizeSectionsToGrowthAreas(
  sections: SynastryAnalysisSection[] | null | undefined,
): Array<Record<string, unknown>> {
  if (!sections?.length) return [];

  return sections.slice(0, 4).map((section, index) => {
    const tone = asString(section.tone, 'NÖTR').toUpperCase();
    const challenging = tone.includes('ZOR');
    return {
      id: `section-growth-${section.id || index + 1}`,
      title: asString(section.title, `Gelişim Alanı ${index + 1}`),
      trigger: asString(section.subtitle, 'Yoğun bir konuşma anında'),
      pattern: asString(section.summary, 'İki farklı ritim aynı anda devreye giriyor.'),
      protocol: challenging
        ? [
            'Konuya önce duygu ve ihtiyaç cümlesiyle başlayın.',
            'Sırayla 90 saniye konuşup yalnızca duyduğunuzu tekrar edin.',
            '10 dakika mola sonrası tek bir küçük anlaşma belirleyin.',
          ]
        : [
            'İşe yarayan davranışı önce birlikte adlandırın.',
            'Bunu haftada 2 kez kısa bir ritüel olarak tekrarlayın.',
            'Hafta sonunda 5 dakika mini değerlendirme yapın.',
          ],
      habitLabel: challenging
        ? 'Bu hafta dene: 10 dakikalık sakin başlangıç'
        : 'Bu hafta dene: güçlü ritmi en az 2 kez tekrar et',
    };
  });
}

function splitSentences(text: string) {
  return text
    .split(/[.!?]/g)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSynastryDailySuggestions(raw: SynastryResponse): [string, string] {
  const bucket = [
    ...splitSentences(asString(raw.cosmicAdvice, '')),
    ...splitSentences(asString(raw.harmonyInsight, '')),
    ...(raw.strengths ?? []).map((item) => asString(item, '')),
    ...(raw.challenges ?? []).map((item) => asString(item, '')),
  ].filter(Boolean);

  return [
    bucket[0] ?? 'Akşam 10 dakikalık sakin check-in yapın.',
    bucket[1] ?? 'Yarın için tek bir ortak mini karar belirleyin.',
  ];
}

function metricsFromScoreBreakdown(
  scoreBreakdown: SynastryScoreBreakdown | null | undefined,
  overallScore: number,
): SynastryDisplayMetric[] {
  const love = clampScore(scoreBreakdown?.love, clampScore(overallScore + 4, overallScore));
  const communication = clampScore(
    scoreBreakdown?.communication,
    clampScore(overallScore - 2, overallScore),
  );
  const trust = clampScore(
    scoreBreakdown?.overall != null ? scoreBreakdown.overall - 3 : overallScore - 3,
    clampScore(overallScore - 3, overallScore),
  );
  const passion = clampScore(scoreBreakdown?.spiritualBond, clampScore(overallScore + 2, overallScore));

  return [
    { id: 'love', label: 'Love', score: love },
    { id: 'communication', label: 'Communication', score: communication },
    { id: 'trust', label: 'Trust', score: trust },
    { id: 'passion', label: 'Passion', score: passion },
  ];
}

export function normalizeSynastryDTO(raw: SynastryResponse, seed: MatchSeedDTO): MatchDTO {
  const crossAspects = Array.isArray(raw.crossAspects) ? raw.crossAspects : [];
  const cardAxes = normalizeCrossAspectsToTraitAxes(crossAspects);
  const displayMetrics = (raw.displayMetrics ?? []).length
    ? (raw.displayMetrics as SynastryDisplayMetric[])
    : metricsFromScoreBreakdown(raw.scoreBreakdown, clampScore(raw.harmonyScore, 72));

  const legacyLike = {
    matchId: raw.id,
    compatibilityScore: raw.harmonyScore,
    displayMetrics,
    cardAxes,
    cardSummary: asString(raw.harmonyInsight, asString(raw.cosmicAdvice, '')),
    growthAreas: normalizeSectionsToGrowthAreas(raw.analysisSections),
    crossAspects,
    aspectsEvaluated: crossAspects.length,
    dailySuggestions: normalizeSynastryDailySuggestions(raw),
  };

  const normalized = normalizeLegacyResponse(legacyLike, seed);
  return {
    ...normalized,
    source: 'api',
  };
}

function flattenCategoryGroups(groups: CategoryGroup[]): TraitAxis[] {
  return groups.flatMap((group) => asArray<TraitAxis>(group.items));
}

function normalizeLegacyResponse(raw: Record<string, any>, seed: MatchSeedDTO): MatchDTO {
  const overallScore = clampScore(raw.compatibilityScore ?? seed.overallScore, 72);

  const rawGroups = asArray<CategoryGroup>(raw.categories).filter((item) => Array.isArray((item as any)?.items));
  const hasDisplayMetrics = asArray(raw.displayMetrics).length > 0;
  const categories = hasDisplayMetrics
    ? normalizeCategories(raw.displayMetrics, overallScore)
    : normalizeCategoriesFromGroups(rawGroups, overallScore);
  const legacyAxes = asArray<TraitAxis>(raw.cardAxes);
  const axesSource = legacyAxes.length > 0 ? legacyAxes : flattenCategoryGroups(rawGroups);
  const axes = normalizeAxes(axesSource);
  const growthAreas = normalizeGrowthAreas(raw.growthAreas, axes);
  const aspects = normalizeAspects(raw.crossAspects ?? raw.aspects);

  const leftSign = parseSignLabel(seed.personASignLabel, 'Akrep');
  const rightSign = parseSignLabel(seed.personBSignLabel, 'Balık');

  const headline = 'Siz birlikte ilerlemeyi öğrenen bir ikilisiniz';
  const bodyFallback = asString(raw.cardSummary, '') || asString(seed.summary, 'Farklı yaklaşım hızlarınızı doğru ritimde buluşturduğunuzda bağınız güçleniyor.');

  return {
    matchId: Number.isFinite(Number(raw.matchId)) ? Number(raw.matchId) : seed.matchId,
    overallScore,
    people: {
      left: {
        name: asString(seed.personAName, DEFAULT_LEFT_NAME),
        signIcon: leftSign.signIcon,
        signLabel: leftSign.signLabel,
      },
      right: {
        name: asString(seed.personBName, DEFAULT_RIGHT_NAME),
        signIcon: rightSign.signIcon,
        signLabel: rightSign.signLabel,
      },
    },
    categories,
    summaryPlain: {
      headline,
      body: sanitizePlainText(bodyFallback, 'Biriniz netliği, diğeriniz alanı öne çıkarıyor. Ritimleri konuşarak birleştirdiğinizde ilişkiniz daha akıcı ilerliyor.'),
    },
    axes,
    growthAreas,
    dailySuggestions: normalizeDailySuggestions(raw.dailySuggestions),
    aspectsEvaluated: clampCount(raw.aspectsEvaluated ?? aspects.length, aspects.length || 0),
    aspects,
    source: 'api',
  };
}

function normalizeModernResponse(raw: Record<string, any>, seed: MatchSeedDTO): MatchDTO {
  const peopleObj = asObject(raw.people);
  const leftObj = asObject(peopleObj.left);
  const rightObj = asObject(peopleObj.right);
  const leftSign = parseSignLabel(asString(leftObj.signLabel, seed.personASignLabel ?? ''), 'Akrep');
  const rightSign = parseSignLabel(asString(rightObj.signLabel, seed.personBSignLabel ?? ''), 'Balık');

  const overallScore = clampScore(raw.overallScore ?? seed.overallScore, 72);
  const axes = normalizeAxes(raw.axes);
  const categories = normalizeCategories(raw.categories, overallScore);
  const growthAreas = normalizeGrowthAreas(raw.growthAreas, axes);
  const aspects = normalizeAspects(raw.aspects);
  const summary = asObject(raw.summaryPlain);

  return {
    matchId: Number.isFinite(Number(raw.matchId)) ? Number(raw.matchId) : seed.matchId,
    overallScore,
    people: {
      left: {
        name: asString(leftObj.name, asString(seed.personAName, DEFAULT_LEFT_NAME)),
        signIcon: leftSign.signIcon,
        signLabel: leftSign.signLabel,
      },
      right: {
        name: asString(rightObj.name, asString(seed.personBName, DEFAULT_RIGHT_NAME)),
        signIcon: rightSign.signIcon,
        signLabel: rightSign.signLabel,
      },
    },
    categories,
    summaryPlain: {
      headline: sanitizePlainText(asString(summary.headline, 'Birlikte ritim kurduğunuzda güçleniyorsunuz'), 'Birlikte ritim kurduğunuzda güçleniyorsunuz'),
      body: sanitizePlainText(
        asString(summary.body, asString(seed.summary, 'İletişimde hızlarınız farklı olsa da ortak niyet belirlediğinizde daha akıcı ilerliyorsunuz.')),
        'İletişimde hızlarınız farklı olsa da ortak niyet belirlediğinizde daha akıcı ilerliyorsunuz.',
      ),
    },
    axes,
    growthAreas,
    dailySuggestions: normalizeDailySuggestions(raw.dailySuggestions),
    aspectsEvaluated: clampCount(raw.aspectsEvaluated ?? aspects.length, aspects.length || 0),
    aspects,
    source: 'api',
  };
}

export function buildMockMatchDTO(seed: MatchSeedDTO): MatchDTO {
  const overallScore = clampScore(seed.overallScore, 78);
  const leftSign = parseSignLabel(seed.personASignLabel, 'Akrep');
  const rightSign = parseSignLabel(seed.personBSignLabel, 'Balık');

  const axes: AxisDTO[] = [
    {
      id: 'iletisim-tarzi',
      title: 'İletişim Tarzı',
      leftLabel: 'Daha net ve direkt',
      rightLabel: 'Daha içe dönük ve sakin',
      leftScore: 66,
      rightScore: 34,
      impactPlain: 'Aslı daha netleşmek isterken Muaz önce içinde toparlanmayı seçebiliyor.',
      tipPlain: 'Konuya girmeden önce “şu an çözüm mü, anlaşılmak mı?” diye netleşin.',
      result: 'GELISIM_ALANI',
    },
    {
      id: 'duygusal-yakinlik',
      title: 'Duygusal Yakınlık',
      leftLabel: 'Hemen paylaşır',
      rightLabel: 'Zaman isteyerek açılır',
      leftScore: 58,
      rightScore: 42,
      impactPlain: 'Yakınlık ihtiyacı var ama açılma zamanınız farklı olabiliyor.',
      tipPlain: 'Yoğun günlerde konuşmayı iki kısa tura bölmek daha iyi çalışır.',
      result: 'UYUMLU',
    },
    {
      id: 'karar-ritmi',
      title: 'Karar Ritmi',
      leftLabel: 'Hızlı karar alır',
      rightLabel: 'Önce tartar sonra karar verir',
      leftScore: 72,
      rightScore: 28,
      impactPlain: 'Hız farkı, önemli konularda birinizin acele hissetmesine neden olabilir.',
      tipPlain: 'Önemli kararlar için ortak bir süre belirleyin ve o süre bitmeden karar almayın.',
      result: 'DIKKAT',
    },
    {
      id: 'guven-dili',
      title: 'Güven Dili',
      leftLabel: 'Açık konuşmayla güven duyar',
      rightLabel: 'Davranış sürekliliğiyle güven duyar',
      leftScore: 52,
      rightScore: 48,
      impactPlain: 'İkiniz de güven istiyorsunuz ama güveni anlama şekliniz farklı.',
      tipPlain: 'Haftalık küçük sözler verip takip etmek güven duygusunu hızla artırır.',
      result: 'UYUMLU',
    },
  ];

  return {
    matchId: seed.matchId,
    overallScore,
    people: {
      left: {
        name: asString(seed.personAName, DEFAULT_LEFT_NAME),
        signIcon: leftSign.signIcon,
        signLabel: leftSign.signLabel,
      },
      right: {
        name: asString(seed.personBName, DEFAULT_RIGHT_NAME),
        signIcon: rightSign.signIcon,
        signLabel: rightSign.signLabel,
      },
    },
    categories: fallbackCategoryScores(overallScore),
    summaryPlain: {
      headline: 'Birbirinizi tamamlayan ama ritim ayarı isteyen bir uyum',
      body: sanitizePlainText(
        asString(
          seed.summary,
          'Aslı daha hızlı netleşirken Muaz daha yumuşak geçişlerle ilerliyor. Aynı hedefte buluştuğunuzda ilişkiniz hem sıcak hem de dengeli ilerliyor.',
        ),
        'Aslı daha hızlı netleşirken Muaz daha yumuşak geçişlerle ilerliyor. Aynı hedefte buluştuğunuzda ilişkiniz hem sıcak hem de dengeli ilerliyor.',
      ),
    },
    axes,
    growthAreas: normalizeGrowthAreas([], axes),
    dailySuggestions: [
      'Akşam 10 dakikalık sakin check-in yapın.',
      'Yarın için tek bir ortak mini karar belirleyin.',
    ],
    aspectsEvaluated: 14,
    aspects: [
      {
        id: 'mock-asp-1',
        name: 'Venüs üçgen Ay',
        theme: 'Şefkatli bağ ve duygusal destek',
        orb: 1.8,
        tone: 'DESTEKLEYICI',
        aspectType: 'TRINE',
      },
      {
        id: 'mock-asp-2',
        name: 'Mars kare Merkür',
        theme: 'Tepki hızında farklılaşma',
        orb: 3.2,
        tone: 'ZORLAYICI',
        aspectType: 'SQUARE',
      },
      {
        id: 'mock-asp-3',
        name: 'Güneş kavuşum Jüpiter',
        theme: 'Birlikte büyüme motivasyonu',
        orb: 2.4,
        tone: 'DESTEKLEYICI',
        aspectType: 'CONJUNCTION',
      },
    ],
    source: 'mock',
  };
}

export function normalizeMatchDTO(raw: unknown, seed: MatchSeedDTO): MatchDTO {
  const obj = asObject(raw);

  if (!Object.keys(obj).length) {
    return buildMockMatchDTO(seed);
  }

  const looksModern = Array.isArray(obj.axes) || Boolean(obj.summaryPlain);
  const normalized = looksModern
    ? normalizeModernResponse(obj, seed)
    : normalizeLegacyResponse(obj, seed);

  const leftSignOverride = seed.personASignLabel
    ? parseSignLabel(seed.personASignLabel, normalized.people.left.signLabel)
    : {
        signIcon: normalized.people.left.signIcon,
        signLabel: normalized.people.left.signLabel,
      };

  const rightSignOverride = seed.personBSignLabel
    ? parseSignLabel(seed.personBSignLabel, normalized.people.right.signLabel)
    : {
        signIcon: normalized.people.right.signIcon,
        signLabel: normalized.people.right.signLabel,
      };

  return {
    ...normalized,
    matchId: seed.matchId,
    overallScore: seed.overallScore != null ? clampScore(seed.overallScore, normalized.overallScore) : normalized.overallScore,
    people: {
      left: {
        ...normalized.people.left,
        name: asString(seed.personAName, normalized.people.left.name),
        ...leftSignOverride,
      },
      right: {
        ...normalized.people.right,
        name: asString(seed.personBName, normalized.people.right.name),
        ...rightSignOverride,
      },
    },
    summaryPlain: {
      ...normalized.summaryPlain,
      body: sanitizePlainText(asString(seed.summary, normalized.summaryPlain.body), normalized.summaryPlain.body),
    },
  };
}

export function toTraitAxes(axes: AxisDTO[]): TraitAxis[] {
  return axes.map((axis) => ({
    id: axis.id,
    leftLabel: axis.leftLabel,
    rightLabel: axis.rightLabel,
    score0to100: clampScore(axis.rightScore, 50),
    note: axis.impactPlain,
  }));
}

export const getMatchTraits = (matchId: number) =>
  api.get<unknown>(`${MATCH_BASE}/${matchId}/traits`);
