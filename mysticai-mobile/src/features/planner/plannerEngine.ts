import { GoalCategory, LuckyDateCard, PlannerCategory as BackendPlannerCategory } from '../../services/lucky-dates.service';
import { UserProfile } from '../../store/useAuthStore';

export type PlannerAudience = 'male' | 'female' | 'universal';
export type PlannerTone = 'warning' | 'luck' | 'spiritual';
export type PlannerTag =
  | 'investment'
  | 'travel'
  | 'spiritual'
  | 'business'
  | 'grooming'
  | 'health'
  | 'social'
  | 'fitness'
  | 'vehicle';

export type PlannerCategoryId =
  | 'transit'
  | 'moon'
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

const DEFAULT_MOON_PHASES = [
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full Moon',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
  'New Moon',
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

export function extractInterestTags(user: UserProfile | null): Set<PlannerTag> {
  const tags = new Set<PlannerTag>();
  const raw = `${user?.focusPoint ?? ''},${user?.maritalStatus ?? ''},${user?.gender ?? ''}`
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

  const scoped = PLANNER_CATEGORIES.filter((category) => {
    if (category.audience === 'universal') return true;
    if (audience === 'neutral') return true;
    return category.audience === audience;
  });

  const ranked = [...scoped].sort((a, b) => {
    const scoreA = getRelevanceScore(a, audience, interestTags);
    const scoreB = getRelevanceScore(b, audience, interestTags);
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
  return audienceScore + interestScore + spiritualScore;
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

function estimateMoonPhase(seed: number): string {
  return DEFAULT_MOON_PHASES[seed % DEFAULT_MOON_PHASES.length] ?? 'Waxing Crescent';
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
): string[] {
  const bank = GOAL_ASPECT_LIBRARY[category.backendGoal];
  const hash = hashSeed(seed);
  return [
    bank[hash % bank.length] ?? bank[0] ?? 'Sun Trine Moon',
    bank[(hash + 1) % bank.length] ?? bank[1] ?? 'Jupiter Sextile Venus',
  ];
}

function buildPredictedReason(
  date: Date,
  category: PlannerCategoryDefinition,
  score: number,
): string {
  const day = date.toLocaleDateString('en-US', { weekday: 'long' });
  if (score >= 80) {
    return `${day} carries high alignment for ${category.id.replace(/_/g, ' ')} actions.`;
  }
  if (score >= 55) {
    return `${day} supports gradual progress; use disciplined timing for ${category.id.replace(/_/g, ' ')}.`;
  }
  return `${day} is volatile for ${category.id.replace(/_/g, ' ')}. Prefer planning over action.`;
}

function buildPredictedActions(
  category: PlannerCategoryDefinition,
  score: number,
): { dos: string[]; donts: string[] } {
  const label = category.id.replace(/_/g, ' ');
  if (score >= 80) {
    return {
      dos: [
        `High-impact ${label} tasks can be executed today.`,
        'Time-block your first 90 minutes for one clear move.',
      ],
      donts: [
        'Do not split focus across too many priorities.',
        'Avoid impulsive decisions without a final review.',
      ],
    };
  }
  if (score >= 50) {
    return {
      dos: [
        `Use today to prepare and optimize your ${label} plan.`,
        'Run a quality check before critical commitments.',
      ],
      donts: [
        'Avoid over-committing to new items.',
        'Do not skip detail review on important tasks.',
      ],
    };
  }
  return {
    dos: [
      'Keep the day in observation and low-risk execution mode.',
      'Focus on one small but concrete improvement.',
    ],
    donts: [
      'Avoid irreversible signatures or high-risk spending.',
      `Do not force major ${label} decisions today.`,
    ],
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
}): PlannerInsight {
  const { date, category, userId, interestTags, cards, backendWindowEnd } = params;
  const dateKey = toDateKey(date);
  const seed = `${dateKey}:${category.id}:${userId ?? 0}`;
  const dayHash = hashSeed(seed);
  const card = date <= backendWindowEnd ? findLuckyDateCard(cards, date) : undefined;
  const moonPhase = card?.moonPhase ?? estimateMoonPhase(dayHash);
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
    moonPhase.toLowerCase().includes('new') ? 8
      : moonPhase.toLowerCase().includes('waxing') ? 4
        : moonPhase.toLowerCase().includes('full') ? -4
          : 0;
  const interestBoost = category.tags.some((tag) => interestTags.has(tag)) ? 6 : 0;
  const retroPenalty = mercuryRetrograde ? 10 : 0;

  const score = clamp(
    Math.round(baseScore * 0.52 + signalScore * 0.48 + moonBonus + interestBoost - retroPenalty),
  );
  const actionables = buildPredictedActions(category, score);

  return {
    score,
    tone: toneFromScore(score, category.tone),
    source: card ? 'backend' : 'predicted',
    reason: card?.reason ?? buildPredictedReason(date, category, score),
    dos: actionables.dos,
    donts: actionables.donts,
    supportingAspects: card?.supportingAspects?.length
      ? card.supportingAspects
      : buildPredictedAspects(category, seed),
    mercuryRetrograde,
    moonPhase,
    signals,
  };
}
