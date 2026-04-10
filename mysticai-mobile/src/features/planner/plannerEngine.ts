import { GoalCategory, LuckyDateCard, PlannerCategory as BackendPlannerCategory } from '../../services/lucky-dates.service';
import { UserProfile } from '../../store/useAuthStore';

export type PlannerAudience = 'male' | 'female' | 'universal';
export type PlannerTone = 'warning' | 'luck' | 'spiritual';
export type PlannerLocale = 'tr' | 'en';
export type PlannerTag =
  | 'investment'
  | 'travel'
  | 'spiritual'
  | 'business'
  | 'grooming'
  | 'health'
  | 'social'
  | 'fitness'
  | 'vehicle'
  | 'romance'
  | 'family'
  | 'legal'
  | 'healing';

export type PlannerCategoryId =
  | 'transit'
  | 'moon'
  | 'date'
  | 'marriage'
  | 'partnerHarmony'
  | 'family'
  | 'jointFinance'
  | 'beauty'
  | 'health'
  | 'activity'
  | 'official'
  | 'spiritual'
  | 'color'
  | 'recommendations';

export interface PlannerCategoryDefinition {
  id: PlannerCategoryId;
  labelKey: string;
  descriptionKey: string;
  icon: string;
  audience: PlannerAudience;
  tags: PlannerTag[];
  tone: PlannerTone;
  plannerCategory: BackendPlannerCategory;
  backendGoal: GoalCategory;
  weights: {
    transit: number;
    house: number;
    natal: number;
  };
}

export interface PlannerSignals {
  transit: number;
  house: number;
  natal: number;
}

export interface PlannerInsight {
  score: number;
  tone: PlannerTone;
  source: 'backend' | 'predicted';
  reason: string;
  dos: string[];
  donts: string[];
  supportingAspects: string[];
  mercuryRetrograde: boolean;
  moonPhase: string;
  signals: PlannerSignals;
}

const DEFAULT_MOON_PHASES_EN = [
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
  'New Moon',
];

const DEFAULT_MOON_PHASES_TR = [
  'Hilal (Büyüyen)',
  'İlk Dördün',
  'Şişkin Ay (Büyüyen)',
  'Dolunay',
  'Şişkin Ay (Küçülen)',
  'Son Dördün',
  'Hilal (Küçülen)',
  'Yeni Ay',
];

const GOAL_ASPECT_LIBRARY: Record<GoalCategory, string[]> = {
  MARRIAGE: ['Venus Trine Moon', 'Jupiter Sextile Venus', 'Moon Conjunction Descendant'],
  CAREER: ['Sun Trine Midheaven', 'Mars Sextile Saturn', 'Jupiter Conjunction 10th House'],
  CONTRACT: ['Mercury Trine Jupiter', 'Saturn Sextile Mercury', 'Moon Trine 3rd House'],
  NEW_BEGINNING: ['Sun Conjunction Ascendant', 'Jupiter Trine Sun', 'Moon Sextile Mars'],
};

export const PLANNER_CATEGORIES: PlannerCategoryDefinition[] = [
  {
    id: 'transit',
    labelKey: 'calendar.categories.transit',
    descriptionKey: 'calendar.categoryDescriptions.transit',
    icon: 'planet-outline',
    audience: 'universal',
    tags: ['business', 'social'],
    tone: 'luck',
    plannerCategory: 'TRANSIT',
    backendGoal: 'CAREER',
    weights: { transit: 0.52, house: 0.28, natal: 0.2 },
  },
  {
    id: 'moon',
    labelKey: 'calendar.categories.moon',
    descriptionKey: 'calendar.categoryDescriptions.moon',
    icon: 'moon-outline',
    audience: 'universal',
    tags: ['spiritual', 'health'],
    tone: 'spiritual',
    plannerCategory: 'MOON',
    backendGoal: 'NEW_BEGINNING',
    weights: { transit: 0.36, house: 0.28, natal: 0.36 },
  },
  {
    id: 'marriage',
    labelKey: 'calendar.categories.marriage',
    descriptionKey: 'calendar.categoryDescriptions.marriage',
    icon: 'diamond-outline',
    audience: 'universal',
    tags: ['romance', 'family', 'legal'],
    tone: 'warning',
    plannerCategory: 'MARRIAGE',
    backendGoal: 'MARRIAGE',
    weights: { transit: 0.44, house: 0.31, natal: 0.25 },
  },
  {
    id: 'partnerHarmony',
    labelKey: 'calendar.categories.partnerHarmony',
    descriptionKey: 'calendar.categoryDescriptions.partnerHarmony',
    icon: 'chatbubbles-outline',
    audience: 'universal',
    tags: ['romance', 'family', 'social'],
    tone: 'luck',
    plannerCategory: 'RELATIONSHIP_HARMONY',
    backendGoal: 'MARRIAGE',
    weights: { transit: 0.34, house: 0.29, natal: 0.37 },
  },
  {
    id: 'family',
    labelKey: 'calendar.categories.family',
    descriptionKey: 'calendar.categoryDescriptions.family',
    icon: 'people-outline',
    audience: 'universal',
    tags: ['family', 'social', 'health'],
    tone: 'luck',
    plannerCategory: 'FAMILY',
    backendGoal: 'NEW_BEGINNING',
    weights: { transit: 0.33, house: 0.37, natal: 0.3 },
  },
  {
    id: 'jointFinance',
    labelKey: 'calendar.categories.jointFinance',
    descriptionKey: 'calendar.categoryDescriptions.jointFinance',
    icon: 'wallet-outline',
    audience: 'universal',
    tags: ['investment', 'family', 'legal'],
    tone: 'warning',
    plannerCategory: 'FINANCE',
    backendGoal: 'CONTRACT',
    weights: { transit: 0.47, house: 0.29, natal: 0.24 },
  },
  {
    id: 'beauty',
    labelKey: 'calendar.categories.beauty',
    descriptionKey: 'calendar.categoryDescriptions.beauty',
    icon: 'cut-outline',
    audience: 'universal',
    tags: ['grooming', 'health'],
    tone: 'luck',
    plannerCategory: 'BEAUTY',
    backendGoal: 'NEW_BEGINNING',
    weights: { transit: 0.38, house: 0.33, natal: 0.29 },
  },
  {
    id: 'health',
    labelKey: 'calendar.categories.health',
    descriptionKey: 'calendar.categoryDescriptions.health',
    icon: 'heart-outline',
    audience: 'universal',
    tags: ['health', 'spiritual'],
    tone: 'warning',
    plannerCategory: 'HEALTH',
    backendGoal: 'MARRIAGE',
    weights: { transit: 0.35, house: 0.37, natal: 0.28 },
  },
  {
    id: 'activity',
    labelKey: 'calendar.categories.activity',
    descriptionKey: 'calendar.categoryDescriptions.activity',
    icon: 'briefcase-outline',
    audience: 'universal',
    tags: ['business', 'social', 'vehicle'],
    tone: 'luck',
    plannerCategory: 'ACTIVITY',
    backendGoal: 'CAREER',
    weights: { transit: 0.43, house: 0.34, natal: 0.23 },
  },
  {
    id: 'official',
    labelKey: 'calendar.categories.official',
    descriptionKey: 'calendar.categoryDescriptions.official',
    icon: 'business-outline',
    audience: 'universal',
    tags: ['business', 'investment'],
    tone: 'warning',
    plannerCategory: 'OFFICIAL',
    backendGoal: 'CONTRACT',
    weights: { transit: 0.46, house: 0.31, natal: 0.23 },
  },
  {
    id: 'spiritual',
    labelKey: 'calendar.categories.spiritual',
    descriptionKey: 'calendar.categoryDescriptions.spiritual',
    icon: 'leaf-outline',
    audience: 'universal',
    tags: ['spiritual', 'health'],
    tone: 'spiritual',
    plannerCategory: 'SPIRITUAL',
    backendGoal: 'NEW_BEGINNING',
    weights: { transit: 0.32, house: 0.24, natal: 0.44 },
  },
  {
    id: 'color',
    labelKey: 'calendar.categories.color',
    descriptionKey: 'calendar.categoryDescriptions.color',
    icon: 'color-palette-outline',
    audience: 'universal',
    tags: ['spiritual', 'social'],
    tone: 'spiritual',
    plannerCategory: 'COLOR',
    backendGoal: 'NEW_BEGINNING',
    weights: { transit: 0.28, house: 0.34, natal: 0.38 },
  },
  {
    id: 'recommendations',
    labelKey: 'calendar.categories.recommendations',
    descriptionKey: 'calendar.categoryDescriptions.recommendations',
    icon: 'thumbs-up-outline',
    audience: 'universal',
    tags: ['business', 'social', 'spiritual'],
    tone: 'luck',
    plannerCategory: 'RECOMMENDATIONS',
    backendGoal: 'NEW_BEGINNING',
    weights: { transit: 0.4, house: 0.29, natal: 0.31 },
  },
];

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

function normalizeText(value: string | undefined): string {
  return (value ?? '').trim().toLowerCase();
}

function resolveAudience(gender: string | undefined): PlannerAudience | 'neutral' {
  const g = normalizeText(gender);
  if (['male', 'man', 'm', 'erkek', 'adam'].includes(g)) return 'male';
  if (['female', 'woman', 'f', 'kadin', 'kadn', 'kadinim', 'kadın'].includes(g)) return 'female';
  return 'neutral';
}

type RelationshipMode =
  | 'single_not_looking'
  | 'single_open'
  | 'dating'
  | 'serious'
  | 'engaged'
  | 'married'
  | 'separated'
  | 'divorced'
  | 'widowed';

const RELATIONSHIP_CATEGORY_BONUS: Record<RelationshipMode, Partial<Record<PlannerCategoryId, number>>> = {
  single_not_looking: {
    date: -9,
    marriage: -10,
    partnerHarmony: -2,
    family: 2,
    jointFinance: 1,
    recommendations: 2,
    spiritual: 2,
  },
  single_open: {
    date: 10,
    marriage: 3,
    partnerHarmony: 5,
    family: 1,
    beauty: 3,
    recommendations: 2,
  },
  dating: {
    date: 12,
    partnerHarmony: 8,
    marriage: 4,
    beauty: 2,
    recommendations: 2,
  },
  serious: {
    date: 8,
    partnerHarmony: 12,
    marriage: 7,
    family: 4,
    jointFinance: 3,
  },
  engaged: {
    marriage: 14,
    official: 5,
    jointFinance: 7,
    family: 8,
    partnerHarmony: 6,
    date: 4,
  },
  married: {
    partnerHarmony: 14,
    family: 12,
    jointFinance: 11,
    official: 3,
    date: -20,
    marriage: -20,
  },
  separated: {
    official: 9,
    spiritual: 6,
    health: 5,
    recommendations: 5,
    partnerHarmony: 2,
    date: -8,
    marriage: -12,
  },
  divorced: {
    official: 8,
    spiritual: 6,
    health: 5,
    recommendations: 4,
    date: -10,
    marriage: -16,
    partnerHarmony: -6,
  },
  widowed: {
    spiritual: 10,
    family: 7,
    health: 5,
    recommendations: 4,
    date: -12,
    marriage: -16,
    partnerHarmony: -4,
  },
};

const RELATIONSHIP_HIDDEN_CATEGORIES: Partial<Record<RelationshipMode, PlannerCategoryId[]>> = {};

const RELATIONSHIP_PINNED_CATEGORIES: Partial<Record<RelationshipMode, PlannerCategoryId[]>> = {
  single_open: ['date', 'partnerHarmony'],
  dating: ['date', 'partnerHarmony'],
  serious: ['partnerHarmony', 'date', 'family'],
  engaged: ['marriage', 'official', 'jointFinance', 'family'],
  married: ['partnerHarmony', 'family', 'jointFinance'],
  separated: ['official', 'health', 'spiritual'],
  divorced: ['official', 'health', 'spiritual'],
  widowed: ['spiritual', 'health', 'family'],
};

function resolveRelationshipMode(user: UserProfile | null): RelationshipMode {
  const marital = normalizeText(user?.maritalStatus);
  const stage = normalizeText(user?.relationshipStage);

  if (/(nisan|nişan|engaged|fiance|fiancé)/.test(marital) || /(engaged|fiance|fiancé|nisan|nişanlı)/.test(stage)) {
    return 'engaged';
  }
  if (/(evli|married)/.test(marital)) {
    if (/(separate|separated|ayri|ayrı|ayrilik|ayrılık)/.test(stage)) return 'separated';
    return 'married';
  }
  if (/(bosan|boşan|divorc)/.test(marital)) return 'divorced';
  if (/(dul|widow|widowed)/.test(marital)) return 'widowed';
  if (/(separate|separated|ayri|ayrı|ayrilik|ayrılık)/.test(marital) || /(separate|separated|ayri|ayrı)/.test(stage)) {
    return 'separated';
  }

  if (/(serious|ciddi|exclusive|committed)/.test(stage)) return 'serious';
  if (/(dating|flort|flört|seeing|talking)/.test(stage)) return 'dating';
  if (/(not.?looking|kapali|kapalı|yalniz|yalnız|self)/.test(stage)) return 'single_not_looking';
  if (/(open|date|dating|flort|flört|ask|aşk|love|iliski|ilişki)/.test(stage)) return 'single_open';
  return 'single_not_looking';
}

function getRelationshipHiddenSet(mode: RelationshipMode): Set<PlannerCategoryId> {
  return new Set(RELATIONSHIP_HIDDEN_CATEGORIES[mode] ?? []);
}

function getRelationshipCategoryBonus(mode: RelationshipMode, categoryId: PlannerCategoryId): number {
  return RELATIONSHIP_CATEGORY_BONUS[mode][categoryId] ?? 0;
}

export function extractInterestTags(user: UserProfile | null): Set<PlannerTag> {
  const tags = new Set<PlannerTag>();
  if (user?.hasChildren) {
    tags.add('family');
    tags.add('social');
  }
  const raw = `${user?.maritalStatus ?? ''},${user?.relationshipStage ?? ''},${user?.gender ?? ''},${user?.hasChildren ?? ''}`
    .toLowerCase();

  if (/(para|finans|money|yatirim|investment|borsa|trade|ticaret)/.test(raw)) {
    tags.add('investment');
    tags.add('business');
  }
  if (/(kariyer|career|is|iş|business|ticaret)/.test(raw)) {
    tags.add('business');
  }
  if (/(ask|aşk|love|iliski|relationship|evlilik|marriage|aile|social|arkadas)/.test(raw)) {
    tags.add('social');
  }
  if (/(ask|aşk|love|romance|date|dating|flort|flört|iliski|ilişki)/.test(raw)) {
    tags.add('romance');
  }
  if (/(aile|family|cocuk|çocuk|ebeveyn|parent)/.test(raw)) {
    tags.add('family');
  }
  if (/(hukuk|legal|evrak|resmi|official|sozlesme|sözleşme|nikah)/.test(raw)) {
    tags.add('legal');
  }
  if (/(iyiles|iyileş|healing|sifa|şifa|yas|yas süreci|grief)/.test(raw)) {
    tags.add('healing');
  }
  if (/(saglik|sağlık|health|fitness|spor|wellness)/.test(raw)) {
    tags.add('health');
    tags.add('fitness');
  }
  if (/(manevi|spiritual|dua|meditasyon|meditation)/.test(raw)) {
    tags.add('spiritual');
  }
  if (/(seyahat|travel|tatil|yolculuk)/.test(raw)) {
    tags.add('travel');
  }
  if (tags.size === 0) {
    tags.add('social');
    tags.add('business');
  }
  return tags;
}

export function buildPersonalizedCategories(
  user: UserProfile | null,
  hiddenIds: Set<PlannerCategoryId>,
): {
  available: PlannerCategoryDefinition[];
  visible: PlannerCategoryDefinition[];
  interestTags: Set<PlannerTag>;
} {
  const audience = resolveAudience(user?.gender);
  const interestTags = extractInterestTags(user);
  const relationshipMode = resolveRelationshipMode(user);
  const relationshipHidden = getRelationshipHiddenSet(relationshipMode);

  const scoped = PLANNER_CATEGORIES.filter((category) => {
    if (relationshipHidden.has(category.id)) return false;
    if (category.audience === 'universal') return true;
    if (audience === 'neutral') return true;
    return category.audience === audience;
  });

  const ranked = [...scoped].sort((a, b) => {
    const pinRankA = getRelationshipPinRank(relationshipMode, a.id);
    const pinRankB = getRelationshipPinRank(relationshipMode, b.id);
    if (pinRankA !== pinRankB) return pinRankA - pinRankB;

    const scoreA = getRelevanceScore(a, audience, interestTags, relationshipMode);
    const scoreB = getRelevanceScore(b, audience, interestTags, relationshipMode);
    if (scoreA !== scoreB) return scoreB - scoreA;
    return a.id.localeCompare(b.id);
  });

  let visible = ranked.filter((c) => !hiddenIds.has(c.id));
  if (visible.length === 0) {
    visible = ranked.slice(0, Math.min(6, ranked.length));
  }

  return { available: ranked, visible, interestTags };
}

function getRelevanceScore(
  category: PlannerCategoryDefinition,
  audience: PlannerAudience | 'neutral',
  interests: Set<PlannerTag>,
  relationshipMode: RelationshipMode,
): number {
  const audienceScore =
    category.audience === 'universal'
      ? 1
      : audience === category.audience
        ? 3
        : audience === 'neutral'
          ? 2
          : 0;
  const interestScore = category.tags.reduce((acc, tag) => acc + (interests.has(tag) ? 2 : 0), 0);
  const spiritualScore = category.tone === 'spiritual' && interests.has('spiritual') ? 1 : 0;
  const relationshipBonus = getRelationshipCategoryBonus(relationshipMode, category.id);
  return audienceScore + interestScore + spiritualScore + relationshipBonus;
}

function getRelationshipPinRank(mode: RelationshipMode, categoryId: PlannerCategoryId): number {
  const pins = RELATIONSHIP_PINNED_CATEGORIES[mode];
  if (!pins) return Number.MAX_SAFE_INTEGER;
  const index = pins.indexOf(categoryId);
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

export function toDateKey(date: Date | string): string {
  if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return date;
  }
  const normalized = typeof date === 'string' ? new Date(date) : date;
  const year = normalized.getFullYear();
  const month = String(normalized.getMonth() + 1).padStart(2, '0');
  const day = String(normalized.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getBackendWindowEndDate(monthsAhead = 6): Date {
  const end = new Date();
  end.setMonth(end.getMonth() + monthsAhead);
  end.setHours(23, 59, 59, 999);
  return end;
}

function findLuckyDateCard(cards: LuckyDateCard[], date: Date): LuckyDateCard | undefined {
  const target = toDateKey(date);
  return cards.find((card) => toDateKey(card.date) === target);
}

function normalizePlannerLocale(locale?: string): PlannerLocale {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'tr';
}

function estimateMoonPhase(seed: number, locale: PlannerLocale): string {
  const phases = locale === 'en' ? DEFAULT_MOON_PHASES_EN : DEFAULT_MOON_PHASES_TR;
  return phases[seed % phases.length] ?? (locale === 'en' ? 'Waxing Crescent' : 'Hilal (Büyüyen)');
}

function isNewMoonPhase(phase: string): boolean {
  const p = phase.toLowerCase();
  return p.includes('new moon') || p.includes('yeni ay');
}

function isWaxingMoonPhase(phase: string): boolean {
  const p = phase.toLowerCase();
  return p.includes('waxing') || p.includes('büyüyen');
}

function isFullMoonPhase(phase: string): boolean {
  const p = phase.toLowerCase();
  return p.includes('full moon') || p.includes('dolunay');
}

function localizeCategoryIdForText(category: PlannerCategoryDefinition, locale: PlannerLocale): string {
  const id = category.id.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
  if (locale === 'en') return id;
  return ({
    transit: 'transit',
    moon: 'ay',
    date: 'date',
    marriage: 'evlilik',
    partnerHarmony: 'eş uyumu',
    family: 'aile',
    jointFinance: 'ortak finans',
    beauty: 'güzellik',
    health: 'sağlık',
    activity: 'aktivite',
    official: 'resmi',
    spiritual: 'manevi',
    color: 'renk',
    recommendations: 'öneriler',
  } as Record<string, string>)[category.id] ?? id;
}

function localizePredictedAspect(aspect: string, locale: PlannerLocale): string {
  if (locale === 'en') return aspect;
  return aspect
    .replaceAll('Sun', 'Güneş')
    .replaceAll('Moon', 'Ay')
    .replaceAll('Mercury', 'Merkür')
    .replaceAll('Venus', 'Venüs')
    .replaceAll('Jupiter', 'Jüpiter')
    .replaceAll('Saturn', 'Satürn')
    .replaceAll('Mars', 'Mars')
    .replaceAll('Midheaven', 'Tepe Noktası')
    .replaceAll('Descendant', 'Alçalan')
    .replaceAll('House', 'Ev')
    .replaceAll('Trine', 'Üçgen')
    .replaceAll('Sextile', 'Sekstil')
    .replaceAll('Conjunction', 'Kavuşum');
}

function countHouseSignals(reason: string): number {
  const matches = reason.match(/([1-9]|1[0-2])\.\s*ev/gi) ?? [];
  return matches.length;
}

function countPositiveAspects(aspects: string[]): number {
  return aspects.filter((aspect) => {
    const normalized = aspect.toLowerCase();
    return (
      normalized.includes('trine')
      || normalized.includes('sextile')
      || normalized.includes('conjunction')
      || normalized.includes('ucgen')
      || normalized.includes('altm')
      || normalized.includes('kav')
      || normalized.includes('tri')
      || normalized.includes('sex')
      || normalized.includes('conj')
    );
  }).length;
}

function deriveSignalsFromCard(
  card: LuckyDateCard,
  category: PlannerCategoryDefinition,
  hash: number,
): PlannerSignals {
  const houseSignals = countHouseSignals(card.reason);
  const positiveAspects = countPositiveAspects(card.supportingAspects);

  const transit = clamp(card.successScore + positiveAspects * 8 - (card.mercuryRetrograde ? 16 : 0));
  const house = clamp(42 + houseSignals * 18 + (hash % 12) - (card.mercuryRetrograde ? 10 : 0));
  const natal = clamp(46 + card.supportingAspects.length * 12 + Math.round(category.weights.natal * 10));

  return { transit, house, natal };
}

function derivePredictedSignals(
  seed: string,
  category: PlannerCategoryDefinition,
): PlannerSignals {
  const transitSeed = hashSeed(`${seed}:transit`);
  const houseSeed = hashSeed(`${seed}:house`);
  const natalSeed = hashSeed(`${seed}:natal`);

  const transit = clamp(36 + (transitSeed % 46) + Math.round(category.weights.transit * 10));
  const house = clamp(32 + (houseSeed % 52) + Math.round(category.weights.house * 10));
  const natal = clamp(35 + (natalSeed % 48) + Math.round(category.weights.natal * 10));

  return { transit, house, natal };
}

function buildPredictedAspects(
  category: PlannerCategoryDefinition,
  seed: string,
  locale: PlannerLocale,
): string[] {
  const bank = GOAL_ASPECT_LIBRARY[category.backendGoal];
  const hash = hashSeed(seed);
  return [
    localizePredictedAspect(bank[hash % bank.length] ?? bank[0] ?? 'Sun Trine Moon', locale),
    localizePredictedAspect(bank[(hash + 1) % bank.length] ?? bank[1] ?? 'Jupiter Sextile Venus', locale),
  ];
}

function buildPredictedReason(
  date: Date,
  category: PlannerCategoryDefinition,
  score: number,
  locale: PlannerLocale,
): string {
  const day = date.toLocaleDateString(locale === 'en' ? 'en-US' : 'tr-TR', { weekday: 'long' });
  const categoryText = localizeCategoryIdForText(category, locale);
  if (score >= 80) {
    return locale === 'en'
      ? `${day} carries high alignment for ${categoryText} actions.`
      : `${day} günü ${categoryText} alanında yüksek uyum taşıyor.`;
  }
  if (score >= 55) {
    return locale === 'en'
      ? `${day} supports gradual progress; use disciplined timing for ${categoryText}.`
      : `${day} günü kademeli ilerlemeyi destekler; ${categoryText} için disiplinli zamanlama kullan.`;
  }
  return locale === 'en'
    ? `${day} is volatile for ${categoryText}. Prefer planning over action.`
    : `${day} günü ${categoryText} için dalgalı olabilir. Eylem yerine planı öne al.`;
}

function buildPredictedActions(
  category: PlannerCategoryDefinition,
  score: number,
  locale: PlannerLocale,
): { dos: string[]; donts: string[] } {
  const label = localizeCategoryIdForText(category, locale);
  if (score >= 90) {
    return {
      dos: locale === 'en'
        ? [
          `High-impact ${label} tasks can be executed today.`,
          'Time-block your first 90 minutes for one clear move.',
          'Use the strongest window for visible outcomes or key conversations.',
        ]
        : [
          `${label} alanında yüksek etkili işleri bugün öne alabilirsin.`,
          'İlk 90 dakikayı tek net hamle için blokla.',
          'Güçlü pencereyi görünür çıktı veya önemli görüşme için kullan.',
        ],
      donts: locale === 'en'
        ? ['Do not skip final checks just because momentum is high.']
        : ['Momentum yüksek diye son kontrolleri atlama.'],
    };
  }
  if (score >= 70) {
    return {
      dos: locale === 'en'
        ? [
          `Use today to advance and optimize your ${label} plan.`,
          'Run a quality check before critical commitments.',
          'Bundle similar tasks to preserve focus.',
        ]
        : [
          `Bugünü ${label} planını ilerletmek ve optimize etmek için kullan.`,
          'Kritik taahhütlerden önce kalite kontrol yap.',
          'Odak kaybını azaltmak için benzer işleri grupla.',
        ],
      donts: locale === 'en'
        ? [
          'Avoid over-committing to new items.',
          'Do not skip detail review on important tasks.',
        ]
        : [
          'Yeni taahhütleri gereksiz artırma.',
          'Önemli işlerde detay kontrolünü atlama.',
        ],
    };
  }
  if (score >= 50) {
    return {
      dos: locale === 'en'
        ? [
          `Use today to prepare and optimize your ${label} plan.`,
          'Work with smaller steps and confirmations.',
        ]
        : [
          `Bugünü ${label} planını hazırlamak ve optimize etmek için kullan.`,
          'Küçük adımlar ve teyitlerle ilerle.',
        ],
      donts: locale === 'en'
        ? [
          'Avoid over-committing to new items.',
          'Do not skip detail review on important tasks.',
          'Do not rush decisions with incomplete information.',
        ]
        : [
          'Yeni taahhütleri gereksiz artırma.',
          'Önemli işlerde detay kontrolünü atlama.',
          'Eksik veriyle acele karar verme.',
        ],
    };
  }

  const lowScoreActivityCaution = category.id === 'activity'
    ? (locale === 'en'
      ? 'Avoid high-intensity activities; prefer light, restorative plans.'
      : 'Yüksek yoğunluklu aktivitelerden kaçın; hafif ve toparlayıcı planları tercih et.')
    : null;
  const lowScoreOfficialCaution = category.id === 'official'
    ? (locale === 'en'
      ? 'Postpone critical signatures and formal submissions if possible.'
      : 'Kritik imza ve resmi başvuruları mümkünse ertele.')
    : null;
  const lowScoreDateCaution = category.id === 'date'
    ? (locale === 'en'
      ? 'Avoid emotionally loaded first meetings; prefer short and low-pressure plans.'
      : 'Duygusal yükü yüksek ilk buluşmalardan kaçın; kısa ve düşük baskılı planları tercih et.')
    : null;
  const lowScoreMarriageCaution = category.id === 'marriage'
    ? (locale === 'en'
      ? 'Avoid locking wedding dates or family commitments without double confirmation.'
      : 'Düğün tarihi veya aile taahhütlerini çift teyit almadan netleştirme.')
    : null;
  const lowScorePartnerHarmonyCaution = category.id === 'partnerHarmony'
    ? (locale === 'en'
      ? 'Avoid score-keeping and unresolved topics late at night.'
      : 'Gece geç saatlerde hesap tutma ve çözümsüz konuları açmaktan kaçın.')
    : null;
  const lowScoreJointFinanceCaution = category.id === 'jointFinance'
    ? (locale === 'en'
      ? 'Avoid shared debt decisions or large joint purchases today.'
      : 'Bugün ortak borç kararları ve büyük ortak harcamalardan kaçın.')
    : null;

  const donts = locale === 'en'
    ? [
      'Avoid irreversible signatures or high-risk spending.',
      `Do not force major ${label} decisions today.`,
      'Avoid emotional overreactions and overloaded schedules.',
      ...(lowScoreActivityCaution ? [lowScoreActivityCaution] : []),
      ...(lowScoreOfficialCaution ? [lowScoreOfficialCaution] : []),
      ...(lowScoreDateCaution ? [lowScoreDateCaution] : []),
      ...(lowScoreMarriageCaution ? [lowScoreMarriageCaution] : []),
      ...(lowScorePartnerHarmonyCaution ? [lowScorePartnerHarmonyCaution] : []),
      ...(lowScoreJointFinanceCaution ? [lowScoreJointFinanceCaution] : []),
    ]
    : [
      'Geri dönüşü zor imza ve yüksek riskli harcamalardan kaçın.',
      `Bugün büyük ${label} kararlarını zorlamayın.`,
      'Duygusal aşırılık ve aşırı yoğun programa girme.',
      ...(lowScoreActivityCaution ? [lowScoreActivityCaution] : []),
      ...(lowScoreOfficialCaution ? [lowScoreOfficialCaution] : []),
      ...(lowScoreDateCaution ? [lowScoreDateCaution] : []),
      ...(lowScoreMarriageCaution ? [lowScoreMarriageCaution] : []),
      ...(lowScorePartnerHarmonyCaution ? [lowScorePartnerHarmonyCaution] : []),
      ...(lowScoreJointFinanceCaution ? [lowScoreJointFinanceCaution] : []),
    ];

  return {
    dos: locale === 'en'
      ? [
        'Keep the day in observation and low-risk execution mode.',
        'Focus on one small but concrete improvement.',
      ]
      : [
        'Günü gözlem ve düşük riskli uygulama modunda tut.',
        'Küçük ama somut bir iyileştirmeye odaklan.',
      ],
    donts,
  };
}

function toneFromScore(score: number, preferred: PlannerTone): PlannerTone {
  if (score >= 80) return 'luck';
  if (score < 50) return 'warning';
  if (preferred === 'spiritual') return 'spiritual';
  return score >= 65 ? 'luck' : 'warning';
}

export function buildPlannerInsight(params: {
  date: Date;
  category: PlannerCategoryDefinition;
  userId?: number;
  interestTags: Set<PlannerTag>;
  cards: LuckyDateCard[];
  backendWindowEnd: Date;
  locale?: string;
}): PlannerInsight {
  const { date, category, userId, interestTags, cards, backendWindowEnd } = params;
  const locale = normalizePlannerLocale(params.locale);
  const dateKey = toDateKey(date);
  const seed = `${dateKey}:${category.id}:${userId ?? 0}`;
  const dayHash = hashSeed(seed);
  const card = date <= backendWindowEnd ? findLuckyDateCard(cards, date) : undefined;
  const moonPhase = card?.moonPhase ?? estimateMoonPhase(dayHash, locale);
  const mercuryRetrograde = card?.mercuryRetrograde ?? (category.backendGoal === 'CONTRACT' && dayHash % 11 === 0);

  const signals = card
    ? deriveSignalsFromCard(card, category, dayHash)
    : derivePredictedSignals(seed, category);

  const signalScore = Math.round(
    signals.transit * category.weights.transit
    + signals.house * category.weights.house
    + signals.natal * category.weights.natal,
  );
  const baseScore = card?.successScore ?? Math.round((signals.transit + signals.house + signals.natal) / 3);
  const moonBonus =
    isNewMoonPhase(moonPhase) ? 8
      : isWaxingMoonPhase(moonPhase) ? 4
        : isFullMoonPhase(moonPhase) ? -4
          : 0;
  const interestBoost = category.tags.some((tag) => interestTags.has(tag)) ? 6 : 0;
  const retroPenalty = mercuryRetrograde ? 10 : 0;

  const score = clamp(
    Math.round(baseScore * 0.52 + signalScore * 0.48 + moonBonus + interestBoost - retroPenalty),
  );
  const actionables = buildPredictedActions(category, score, locale);

  return {
    score,
    tone: toneFromScore(score, category.tone),
    source: card ? 'backend' : 'predicted',
    reason: card?.reason ?? buildPredictedReason(date, category, score, locale),
    dos: actionables.dos,
    donts: actionables.donts,
    supportingAspects: card?.supportingAspects?.length
      ? card.supportingAspects
      : buildPredictedAspects(category, seed, locale),
    mercuryRetrograde,
    moonPhase,
    signals,
  };
}
