import type { LevelTier, QualitativeLevel } from './types';
import type { NatalChartContext } from './types';

/**
 * Derives chart emphasis as explainable tiers instead of invented scores.
 *
 * Every tier here comes from a count the reader could make themselves: how many planets sit in an
 * element, how many aspects are supportive versus tense, how many planets sit on an angle. The
 * count travels with the tier as its `reason`, which is what makes "how was this determined?"
 * answerable — and is precisely what the old 0-100 radar could not do, because its numbers were
 * fixed constants nudged by the sign, not measurements of the chart.
 *
 * Nothing here is a prediction or a judgement. A "sensitive" tier means "few planets support this",
 * not "you are bad at it".
 */

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/** Four planets out of ten in one element is a genuine concentration, not noise. */
function tierFromElementCount(count: number): LevelTier {
  if (count >= 4) return 'veryStrong';
  if (count === 3) return 'strong';
  if (count >= 1) return 'balanced';
  return 'sensitive';
}

function tierFromRatio(part: number, whole: number): LevelTier {
  if (whole === 0) return 'balanced';
  const ratio = part / whole;
  if (ratio >= 0.6) return 'veryStrong';
  if (ratio >= 0.4) return 'strong';
  if (ratio >= 0.2) return 'balanced';
  return 'sensitive';
}

/**
 * Chart-wide emphasis, shown on the portrait screen.
 *
 * Returns an empty list when there is nothing measurable to show, so the caller can hide the
 * section rather than render a meaningless zeroed chart.
 */
export function buildChartLevels(
  context: NatalChartContext | null | undefined,
  t: TranslateFn,
): QualitativeLevel[] {
  if (!context) return [];

  const elements = context.elements ?? {};
  const modalities = context.modalities ?? {};
  const aspects = context.aspects ?? [];
  const totalAspects = aspects.length;

  const levels: QualitativeLevel[] = [];

  // --- Element emphasis: each is a direct planet count, so the reason is literally the count.
  (['Fire', 'Earth', 'Air', 'Water'] as const).forEach((element) => {
    const count = elements[element] ?? 0;
    levels.push({
      key: `element_${element.toLowerCase()}`,
      label: t(`natalPortrait.element.${element.toLowerCase()}`),
      tier: tierFromElementCount(count),
      reason: t('natalPortrait.levelReasonElement', { count }),
    });
  });

  // --- Ease vs. friction: the split between supportive and tense aspects.
  const supportive = aspects.filter((a) => a.tone === 'SUPPORTIVE').length;
  const tense = aspects.filter((a) => a.tone === 'TENSE').length;

  if (totalAspects > 0) {
    levels.push({
      key: 'flow',
      label: t('natalPortrait.levelFlow'),
      tier: tierFromRatio(supportive, totalAspects),
      reason: t('natalPortrait.levelReasonFlow', { supportive, total: totalAspects }),
    });
    levels.push({
      key: 'growth_pressure',
      label: t('natalPortrait.levelGrowthPressure'),
      tier: tierFromRatio(tense, totalAspects),
      reason: t('natalPortrait.levelReasonPressure', { tense, total: totalAspects }),
    });
  }

  // --- Visibility: angular planets are the ones other people actually notice.
  // Meaningless without a birth time, so it is omitted rather than guessed.
  if (context.birthTimeKnown) {
    const angular = (context.planets ?? []).filter((p) => p.angular).length;
    levels.push({
      key: 'visibility',
      label: t('natalPortrait.levelVisibility'),
      tier: angular >= 3 ? 'veryStrong' : angular === 2 ? 'strong' : angular === 1 ? 'balanced' : 'sensitive',
      reason: t('natalPortrait.levelReasonVisibility', { count: angular }),
    });
  }

  // --- Modality: how this person tends to start, hold or adapt.
  const dominantModality = context.emphasis?.dominantModality;
  if (dominantModality) {
    const count = modalities[dominantModality] ?? 0;
    levels.push({
      key: 'modality',
      label: t(`natalPortrait.modality.${dominantModality.toLowerCase()}`),
      tier: tierFromElementCount(count),
      reason: t('natalPortrait.levelReasonModality', { count }),
    });
  }

  return levels;
}

/**
 * The narrower emphasis shown inside a Big Three detail sheet.
 *
 * Scoped to that placement's own element and to the aspects that actually touch that planet — not
 * the whole chart — so the sheet says something specific about the Sun rather than repeating the
 * chart-level summary under a different heading.
 */
export function buildPlacementLevels(
  context: NatalChartContext | null | undefined,
  planetName: 'Sun' | 'Moon' | 'Ascendant',
  t: TranslateFn,
): QualitativeLevel[] {
  if (!context) return [];

  const levels: QualitativeLevel[] = [];

  if (planetName === 'Ascendant') {
    if (!context.birthTimeKnown || !context.ascendant) return [];
    const angular = (context.planets ?? []).filter((p) => p.angular).length;
    levels.push({
      key: 'first_impression',
      label: t('natalPortrait.levelVisibility'),
      tier: angular >= 3 ? 'veryStrong' : angular === 2 ? 'strong' : angular === 1 ? 'balanced' : 'sensitive',
      reason: t('natalPortrait.levelReasonVisibility', { count: angular }),
    });
    return levels;
  }

  const planet = (context.planets ?? []).find((p) => p.planet === planetName);
  if (!planet) return [];

  const touching = (context.aspects ?? []).filter(
    (a) => a.planet1 === planetName || a.planet2 === planetName,
  );
  const supportive = touching.filter((a) => a.tone === 'SUPPORTIVE').length;
  const tense = touching.filter((a) => a.tone === 'TENSE').length;

  levels.push({
    key: 'support',
    label: t('natalPortrait.levelFlow'),
    tier: tierFromRatio(supportive, Math.max(touching.length, 1)),
    reason: t('natalPortrait.levelReasonPlacementFlow', { supportive, total: touching.length }),
  });

  levels.push({
    key: 'pressure',
    label: t('natalPortrait.levelGrowthPressure'),
    tier: tierFromRatio(tense, Math.max(touching.length, 1)),
    reason: t('natalPortrait.levelReasonPlacementPressure', { tense, total: touching.length }),
  });

  if (context.birthTimeKnown && planet.angular) {
    levels.push({
      key: 'prominence',
      label: t('natalPortrait.levelVisibility'),
      tier: 'veryStrong',
      reason: t('natalPortrait.levelReasonAngular', { house: planet.house ?? 1 }),
    });
  }

  return levels;
}
