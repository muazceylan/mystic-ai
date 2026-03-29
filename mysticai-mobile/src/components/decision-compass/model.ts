import { Ionicons } from '@expo/vector-icons';
import type { DailyLifeGuideActivity } from '../../services/astrology.service';
import type { CosmicCategoryDetail, CosmicDetailSubcategory } from '../../services/cosmic.service';

export type CompassStatus = 'STRONG' | 'SUPPORTIVE' | 'BALANCED' | 'CAUTION' | 'HOLD';
export type CompassFilter = 'ALL' | CompassStatus;
export type AllCategoriesFilter = CompassFilter;

export interface CompassFilterOption<TFilter extends string> {
  key: TFilter;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export interface DecisionCategoryModel {
  id: string;
  cosmicCategoryKey: string | null;
  title: string;
  activityLabel: string;
  subLabel: string;
  score: number;
  status: CompassStatus;
  shortSummary: string;
  icon: keyof typeof Ionicons.glyphMap;
  itemCount: number;
  items: DailyLifeGuideActivity[];
}

export interface DecisionHeroModel {
  headline: string;
  explanation: string;
  doItems: string[];
  avoidItems: string[];
  strongCategories: string[];
}

const SCORE_HINT_FALLBACK = 48;

function normalizeToken(value: string): string {
  return value
    .toLocaleLowerCase('tr-TR')
    .replace(/[İIı]/g, 'i')
    .replace(/[Ğğ]/g, 'g')
    .replace(/[Üü]/g, 'u')
    .replace(/[Şş]/g, 's')
    .replace(/[Öö]/g, 'o')
    .replace(/[Çç]/g, 'c')
    .replace(/[^a-z0-9]+/g, '');
}

function isMoonText(haystack: string): boolean {
  const normalized = haystack.toLocaleLowerCase('tr-TR');
  return normalized.includes(' moon') || normalized.includes('ay ') || normalized.includes(' ay') || normalized.includes('lunar');
}

function isTransitText(haystack: string): boolean {
  const normalized = haystack.toLocaleLowerCase('tr-TR');
  return normalized.includes('transit') || normalized.includes('retrog') || normalized.includes('göky') || normalized.includes('goky');
}

type TFn = (key: string) => string;

function statusFilterOptions(t: TFn): Array<CompassFilterOption<CompassStatus>> {
  return [
    { key: 'STRONG', label: t('decisionCompassScreen.statusStrong'), icon: 'sparkles-outline' },
    { key: 'SUPPORTIVE', label: t('decisionCompassScreen.statusSupportive'), icon: 'checkmark-circle-outline' },
    { key: 'BALANCED', label: t('decisionCompassScreen.statusBalanced'), icon: 'ellipse-outline' },
    { key: 'CAUTION', label: t('decisionCompassScreen.statusCaution'), icon: 'alert-circle-outline' },
    { key: 'HOLD', label: t('decisionCompassScreen.statusHold'), icon: 'pause-circle-outline' },
  ];
}

function deriveIcon(haystack: string): keyof typeof Ionicons.glyphMap {
  if (haystack.includes('ay') || haystack.includes('moon')) return 'moon-outline';
  if (haystack.includes('transit') || haystack.includes('gecis')) return 'planet-outline';
  if (haystack.includes('kariyer') || haystack.includes('iş') || haystack.includes('career') || haystack.includes('work')) return 'briefcase-outline';
  if (haystack.includes('güzellik') || haystack.includes('bakım') || haystack.includes('beauty')) return 'color-palette-outline';
  if (haystack.includes('finans') || haystack.includes('para') || haystack.includes('money') || haystack.includes('finance')) return 'wallet-outline';
  if (haystack.includes('aşk') || haystack.includes('ilişki') || haystack.includes('love') || haystack.includes('partner')) return 'heart-outline';
  if (haystack.includes('sağlık') || haystack.includes('health')) return 'fitness-outline';
  if (haystack.includes('sosyal') || haystack.includes('social')) return 'people-outline';
  if (haystack.includes('eğitim') || haystack.includes('education')) return 'school-outline';
  if (haystack.includes('ev') || haystack.includes('düzen') || haystack.includes('home')) return 'home-outline';
  if (haystack.includes('resmi') || haystack.includes('official')) return 'document-text-outline';
  return 'sparkles-outline';
}

export function isTransitCategory(category: DecisionCategoryModel): boolean {
  const key = (category.cosmicCategoryKey ?? category.id).toLocaleLowerCase('tr-TR');
  if (key.includes('transit')) return true;
  return `${category.id} ${category.title} ${category.subLabel}`.toLocaleLowerCase('tr-TR').includes('transit');
}

export function isMoonCategory(category: DecisionCategoryModel): boolean {
  const key = (category.cosmicCategoryKey ?? category.id).toLocaleLowerCase('tr-TR');
  if (key === 'moon' || key.includes('moon')) return true;
  const haystack = `${category.id} ${category.title} ${category.subLabel}`.toLocaleLowerCase('tr-TR');
  return /\bay\b/.test(haystack) || haystack.includes('moon');
}

export function matchesCompassFilter(category: DecisionCategoryModel, filter: CompassFilter): boolean {
  if (filter === 'ALL') return true;
  return category.status === filter;
}

export function matchesAllCategoriesFilter(category: DecisionCategoryModel, filter: AllCategoriesFilter): boolean {
  return matchesCompassFilter(category, filter);
}

export function buildDecisionCompassFilterOptions(
  categories: DecisionCategoryModel[],
  t?: TFn,
): Array<CompassFilterOption<CompassFilter>> {
  const allLabel = t ? t('decisionCompassScreen.filterAllLabel') : 'Tümü';
  const options = t ? statusFilterOptions(t) : [
    { key: 'STRONG' as CompassStatus, label: 'Güçlü fırsat', icon: 'sparkles-outline' as const },
    { key: 'SUPPORTIVE' as CompassStatus, label: 'Destekleyici', icon: 'checkmark-circle-outline' as const },
    { key: 'BALANCED' as CompassStatus, label: 'Dengeli', icon: 'ellipse-outline' as const },
    { key: 'CAUTION' as CompassStatus, label: 'Dikkat', icon: 'alert-circle-outline' as const },
    { key: 'HOLD' as CompassStatus, label: 'Beklet', icon: 'pause-circle-outline' as const },
  ];
  return [
    { key: 'ALL', label: allLabel, icon: 'apps-outline' },
    ...options.filter((option) =>
      categories.some((category) => matchesCompassFilter(category, option.key)),
    ),
  ];
}

export function buildAllCategoriesFilterOptions(
  categories: DecisionCategoryModel[],
  t?: TFn,
): Array<CompassFilterOption<AllCategoriesFilter>> {
  const allLabel = t ? t('decisionCompassScreen.filterAllLabel') : 'Tümü';
  const options = t ? statusFilterOptions(t) : [
    { key: 'STRONG' as CompassStatus, label: 'Güçlü fırsat', icon: 'sparkles-outline' as const },
    { key: 'SUPPORTIVE' as CompassStatus, label: 'Destekleyici', icon: 'checkmark-circle-outline' as const },
    { key: 'BALANCED' as CompassStatus, label: 'Dengeli', icon: 'ellipse-outline' as const },
    { key: 'CAUTION' as CompassStatus, label: 'Dikkat', icon: 'alert-circle-outline' as const },
    { key: 'HOLD' as CompassStatus, label: 'Beklet', icon: 'pause-circle-outline' as const },
  ];
  return [
    { key: 'ALL', label: allLabel, icon: 'apps-outline' },
    ...options.filter((option) =>
      categories.some((category) => matchesCompassFilter(category, option.key)),
    ),
  ];
}

function subLabelFromCosmic(detail: CosmicCategoryDetail | undefined): string | null {
  if (!detail?.subcategories?.length) return null;
  const labels = detail.subcategories
    .map((item) => item.label?.trim())
    .filter(Boolean) as string[];
  if (!labels.length) return null;
  return labels.slice(0, 3).join(' • ');
}

function resolveMoonCosmicKey(availableKeys: string[]): string | null {
  return availableKeys.find((item) => {
    const key = normalizeToken(item);
    return key === 'moon' || key.includes('moon') || key === 'ay';
  }) ?? null;
}

function resolveTransitCosmicKey(availableKeys: string[]): string | null {
  return availableKeys.find((item) => normalizeToken(item).includes('transit')) ?? null;
}

function resolveCosmicCategoryKey(
  id: string,
  title: string,
  activityLabel: string,
  availableKeys: string[],
): string | null {
  if (!availableKeys.length) return null;

  const idToken = normalizeToken(id);
  const direct = availableKeys.find((item) => normalizeToken(item) === idToken);
  if (direct) return direct;

  const haystack = `${id} ${title} ${activityLabel}`.toLocaleLowerCase('tr-TR');
  if (isMoonText(haystack)) {
    return resolveMoonCosmicKey(availableKeys);
  }
  if (isTransitText(haystack)) {
    return resolveTransitCosmicKey(availableKeys);
  }

  return null;
}

function scoreToTone(score: number): DailyLifeGuideActivity['tone'] {
  if (score >= 55) return 'positive';
  if (score >= 40) return 'neutral';
  return 'negative';
}

function buildActivityFromCosmicSubcategory(
  subcategory: CosmicDetailSubcategory,
  groupKey: string,
  groupLabel: string,
  fallbackScore: number,
): DailyLifeGuideActivity {
  const score = Number.isFinite(subcategory.score) ? Math.round(subcategory.score) : fallbackScore;
  return {
    groupKey,
    groupLabel,
    activityKey: subcategory.subCategoryKey || `${groupKey}-subcategory`,
    activityLabel: subcategory.label || 'Alt alan',
    icon: '',
    score,
    tone: scoreToTone(score),
    statusLabel: statusLabel(scoreToStatus(score)),
    shortAdvice: subcategory.shortAdvice || '',
    technicalExplanation: subcategory.technicalExplanation || '',
    insight: subcategory.insight || '',
    triggerNotes: subcategory.triggerNotes ?? [],
  };
}

function buildItemsFromCosmicCategory(
  detail: CosmicCategoryDetail | undefined,
  groupKey: string,
  groupLabel: string,
  fallbackItems: DailyLifeGuideActivity[],
  fallbackScore: number,
): DailyLifeGuideActivity[] {
  if (!detail?.subcategories?.length) {
    return fallbackItems;
  }

  return detail.subcategories.map((item) =>
    buildActivityFromCosmicSubcategory(item, groupKey, groupLabel, fallbackScore),
  );
}

function normalizeCategoryLabels(
  id: string,
  title: string,
  activityLabel: string,
  itemCount: number,
  dynamicSubLabel?: string | null,
) {
  const haystack = `${id} ${title} ${activityLabel}`.toLocaleLowerCase('tr-TR');
  const defaultSubLabel = dynamicSubLabel || (activityLabel !== title ? activityLabel : `${itemCount} alt alan`);

  if (isMoonText(haystack)) {
    return {
      title: 'Ay',
      activityLabel: 'Ay',
      subLabel: defaultSubLabel,
    };
  }

  if (isTransitText(haystack)) {
    return {
      title: 'Transit',
      activityLabel: activityLabel && activityLabel !== title ? activityLabel : 'Transit',
      subLabel: defaultSubLabel,
    };
  }

  return {
    title,
    activityLabel,
    subLabel: defaultSubLabel,
  };
}

function mapCosmicOnlyCategories(
  cosmicCategories: Record<string, CosmicCategoryDetail> | undefined,
  usedCosmicKeys: Set<string>,
): DecisionCategoryModel[] {
  if (!cosmicCategories) return [];

  const result: DecisionCategoryModel[] = [];
  for (const [cosmicKey, detail] of Object.entries(cosmicCategories)) {
    if (usedCosmicKeys.has(cosmicKey)) continue;

    const score = Number.isFinite(detail.score) ? Math.round(detail.score) : SCORE_HINT_FALLBACK;
    const dynamicSubLabel = subLabelFromCosmic(detail);
    const rawTitle = detail.categoryLabel?.trim() || cosmicKey;
    const normalized = normalizeCategoryLabels(cosmicKey, rawTitle, rawTitle, detail.subcategories?.length ?? 0, dynamicSubLabel);
    const items = buildItemsFromCosmicCategory(detail, cosmicKey, normalized.title, [], score);
    const summary = detail.reasoning?.trim() || detail.subcategories?.[0]?.shortAdvice?.trim() || 'Bugün bu alanda sade ve net ilerlemek daha verimli.';
    const icon = deriveIcon(`${cosmicKey} ${normalized.title} ${normalized.subLabel}`.toLocaleLowerCase('tr-TR'));

    result.push({
      id: cosmicKey,
      cosmicCategoryKey: cosmicKey,
      title: normalized.title,
      activityLabel: normalized.activityLabel,
      subLabel: normalized.subLabel,
      score,
      status: scoreToStatus(score),
      shortSummary: summary,
      icon,
      itemCount: items.length,
      items,
    });
  }

  return result;
}

export function scoreToStatus(score: number): CompassStatus {
  if (score >= 70) return 'STRONG';
  if (score >= 55) return 'SUPPORTIVE';
  if (score >= 40) return 'BALANCED';
  if (score >= 25) return 'CAUTION';
  return 'HOLD';
}

export function statusLabel(status: CompassStatus, t?: TFn): string {
  if (t) {
    switch (status) {
      case 'STRONG': return t('decisionCompassScreen.statusStrong');
      case 'SUPPORTIVE': return t('decisionCompassScreen.statusSupportive');
      case 'BALANCED': return t('decisionCompassScreen.statusBalanced');
      case 'CAUTION': return t('decisionCompassScreen.statusCaution');
      case 'HOLD': return t('decisionCompassScreen.statusHold');
      default: return t('decisionCompassScreen.statusBalanced');
    }
  }
  switch (status) {
    case 'STRONG': return 'Güçlü fırsat';
    case 'SUPPORTIVE': return 'Destekleyici';
    case 'BALANCED': return 'Dengeli';
    case 'CAUTION': return 'Dikkat';
    case 'HOLD': return 'Beklet';
    default: return 'Dengeli';
  }
}

export function buildCategoryModels(
  activities: DailyLifeGuideActivity[] | null | undefined,
  cosmicCategories?: Record<string, CosmicCategoryDetail> | null,
): DecisionCategoryModel[] {
  const grouped = new Map<string, DailyLifeGuideActivity[]>();
  for (const item of activities ?? []) {
    const existing = grouped.get(item.groupKey);
    if (existing) {
      existing.push(item);
      continue;
    }
    grouped.set(item.groupKey, [item]);
  }

  const cosmicMap = cosmicCategories ?? undefined;
  const availableCosmicKeys = Object.keys(cosmicMap ?? {});
  const usedCosmicKeys = new Set<string>();

  const baseCategories = Array.from(grouped.entries())
    .map(([id, entries]) => {
      const sorted = [...entries].sort((a, b) => b.score - a.score);
      const top = sorted[0];
      const rawScore = sorted.reduce((acc, item) => acc + item.score, 0) / Math.max(sorted.length, 1);
      const rawTitle = top?.groupLabel || top?.activityLabel || 'Kategori';
      const rawActivityLabel = top?.activityLabel || rawTitle;
      const matchedCosmicKey = resolveCosmicCategoryKey(id, rawTitle, rawActivityLabel, availableCosmicKeys);
      const cosmicDetail = matchedCosmicKey ? cosmicMap?.[matchedCosmicKey] : undefined;

      if (matchedCosmicKey) {
        usedCosmicKeys.add(matchedCosmicKey);
      }

      const score = Number.isFinite(cosmicDetail?.score) ? Math.round(cosmicDetail!.score) : Math.round(rawScore);
      const dynamicSubLabel = subLabelFromCosmic(cosmicDetail);
      const normalized = normalizeCategoryLabels(
        matchedCosmicKey ?? id,
        cosmicDetail?.categoryLabel?.trim() || rawTitle,
        rawActivityLabel,
        cosmicDetail?.subcategories?.length ?? sorted.length,
        dynamicSubLabel,
      );
      const items = buildItemsFromCosmicCategory(cosmicDetail, id, normalized.title, sorted, score);
      const summary = cosmicDetail?.reasoning?.trim()
        || top?.shortAdvice?.trim()
        || cosmicDetail?.subcategories?.[0]?.shortAdvice?.trim()
        || 'Bugün bu alanda tek hedefe odaklanmak daha verimli olur.';
      const icon = deriveIcon(
        `${id} ${matchedCosmicKey ?? ''} ${normalized.title} ${normalized.activityLabel}`.toLocaleLowerCase('tr-TR'),
      );

      return {
        id,
        cosmicCategoryKey: matchedCosmicKey ?? null,
        title: normalized.title,
        activityLabel: normalized.activityLabel,
        subLabel: normalized.subLabel,
        score,
        status: scoreToStatus(score),
        shortSummary: summary,
        icon,
        itemCount: items.length,
        items,
      };
    });

  const categories = [...baseCategories, ...mapCosmicOnlyCategories(cosmicMap, usedCosmicKeys)];

  const uniqueById = new Map<string, DecisionCategoryModel>();
  for (const item of categories) {
    const key = item.id.toLocaleLowerCase('tr-TR');
    const existing = uniqueById.get(key);
    if (!existing || item.score > existing.score) {
      uniqueById.set(key, item);
    }
  }

  return Array.from(uniqueById.values()).sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'tr'));
}

function firstClause(input: string | undefined): string {
  const text = (input ?? '').trim();
  if (!text) return '';
  const clause = text.split(/[,.!;:]/)[0]?.trim() ?? '';
  return clause || text;
}

function compactDoCopy(category: DecisionCategoryModel): string {
  const title = category.title.trim();
  const fromAdvice = firstClause(category.shortSummary);
  if (fromAdvice && fromAdvice.length <= 54) return fromAdvice;
  return `${title} için ana adımı netleştir`;
}

function compactAvoidCopy(category: DecisionCategoryModel): string {
  const title = category.title.trim();
  return `${title} alanında aşırı yüklenme`;
}

export function buildHeroModel(categories: DecisionCategoryModel[]): DecisionHeroModel {
  if (!categories.length) {
    return {
      headline: 'Bugün güçlü pencere: tek bir hedefe odaklan.',
      explanation: 'Kategori skorları güncellendiğinde bu alan otomatik olarak kişiselleşir.',
      doItems: ['Öncelikli tek işi tamamla', 'Kararını yazılı netleştir', 'Dikkati tek alanda tut'],
      avoidItems: ['Aynı anda çok konu açma'],
      strongCategories: [],
    };
  }

  const top = categories[0];
  const strong = categories.filter((c) => c.status === 'STRONG' || c.status === 'SUPPORTIVE').slice(0, 2);
  const weak = categories.filter((c) => c.status === 'CAUTION' || c.status === 'HOLD').slice(0, 2);

  const doItems = [
    compactDoCopy(top),
    ...strong.filter((c) => c.id !== top.id).map((c) => compactDoCopy(c)),
    'Tek ana hedefe odaklan',
  ].filter(Boolean).slice(0, 3);

  const avoidItems = weak.length
    ? weak.map((c) => compactAvoidCopy(c))
    : ['Aynı anda çok konu açma', 'Kararları gereksiz dağıtma'];

  return {
    headline: `Bugün güçlü pencere: ${top.title} alanında senin için fırsatlar var`,
    explanation: strong.length >= 2
      ? `${strong.map((c) => c.title).join(' ve ')} alanlarında destek yüksek.`
      : `${top.title} alanında destek yüksek, kararları sade tutmak avantaj sağlar.`,
    doItems,
    avoidItems: avoidItems.slice(0, 3),
    strongCategories: [top.title],
  };
}
