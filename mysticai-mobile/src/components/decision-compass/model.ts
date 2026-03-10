import { Ionicons } from '@expo/vector-icons';
import type { DailyLifeGuideActivity } from '../../services/astrology.service';

export type CompassStatus = 'STRONG' | 'SUPPORTIVE' | 'BALANCED' | 'CAUTION' | 'HOLD';
export type CompassFilter = 'BEST' | 'CAUTION' | 'ALL';

export interface DecisionCategoryModel {
  id: string;
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

function deriveIcon(haystack: string): keyof typeof Ionicons.glyphMap {
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

export function scoreToStatus(score: number): CompassStatus {
  if (score >= 70) return 'STRONG';
  if (score >= 55) return 'SUPPORTIVE';
  if (score >= 40) return 'BALANCED';
  if (score >= 25) return 'CAUTION';
  return 'HOLD';
}

export function statusLabel(status: CompassStatus): string {
  switch (status) {
    case 'STRONG':
      return 'Güçlü fırsat';
    case 'SUPPORTIVE':
      return 'Destekleyici';
    case 'BALANCED':
      return 'Dengeli';
    case 'CAUTION':
      return 'Dikkat';
    case 'HOLD':
      return 'Beklet';
    default:
      return 'Dengeli';
  }
}

export function buildCategoryModels(activities: DailyLifeGuideActivity[] | null | undefined): DecisionCategoryModel[] {
  if (!activities?.length) return [];

  const grouped = new Map<string, DailyLifeGuideActivity[]>();
  for (const item of activities) {
    const existing = grouped.get(item.groupKey);
    if (existing) {
      existing.push(item);
      continue;
    }
    grouped.set(item.groupKey, [item]);
  }

  return Array.from(grouped.entries())
    .map(([id, entries]) => {
      const sorted = [...entries].sort((a, b) => b.score - a.score);
      const top = sorted[0];
      const score = Math.round(sorted.reduce((acc, item) => acc + item.score, 0) / Math.max(sorted.length, 1));
      const status = scoreToStatus(score);
      const title = top?.groupLabel || top?.activityLabel || 'Kategori';
      const activityLabel = top?.activityLabel || title;
      const subLabel = activityLabel !== title ? activityLabel : `${sorted.length} alt alan`;
      const summary = top?.shortAdvice?.trim() || 'Bugün bu alanda tek hedefe odaklanmak daha verimli olur.';
      const icon = deriveIcon(`${id} ${title} ${activityLabel}`.toLocaleLowerCase('tr-TR'));

      return {
        id,
        title,
        activityLabel,
        subLabel,
        score,
        status,
        shortSummary: summary,
        icon,
        itemCount: sorted.length,
        items: sorted,
      };
    })
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'tr'));
}

function trimSentence(input: string, maxLen = 58): string {
  const text = input.trim();
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

export function buildHeroModel(categories: DecisionCategoryModel[]): DecisionHeroModel {
  if (!categories.length) {
    return {
      headline: 'Bugün güçlü pencere: tek bir hedefe odaklan.',
      explanation: 'Kategori skorları güncellendiğinde bu alan otomatik olarak kişiselleşir.',
      doItems: ['Öncelikli tek işi tamamla', 'Kararını yazılı netleştir', 'Dikkati tek alanda tut'],
      avoidItems: ['Aynı anda çok başlık açma'],
      strongCategories: [],
    };
  }

  const top = categories[0];
  const strong = categories.filter((c) => c.status === 'STRONG' || c.status === 'SUPPORTIVE').slice(0, 2);
  const weak = categories.filter((c) => c.status === 'CAUTION' || c.status === 'HOLD').slice(0, 2);

  const doItems = [
    ...strong.map((c) => trimSentence(c.shortSummary, 52)),
    'Tek ana hedefe odaklan',
  ].filter(Boolean).slice(0, 3);

  const avoidItems = weak.length
    ? weak.map((c) => `Aşırı yükleme: ${c.title}`)
    : ['Aynı anda çok konu açma'];

  return {
    headline: `Bugün güçlü pencere: ${top.title} tarafında önemli adımı öne al.`,
    explanation: strong.length >= 2
      ? `${strong.map((c) => c.title).join(' ve ')} alanlarında destek yüksek, dağınık alanlarda tempo düşebilir.`
      : `${top.title} alanında destek yüksek, kararları sade tutmak avantaj sağlar.`,
    doItems,
    avoidItems: avoidItems.slice(0, 3),
    strongCategories: strong.map((c) => c.title),
  };
}
