export type TrialDurationUnit = 'day' | 'week' | 'month' | 'year';

export interface TrialDuration {
  count: number;
  unit: TrialDurationUnit;
  iso8601: string;
}

export interface FreeIntroOffer {
  period: string;
  cycles: number;
}

interface IntroPriceMetadata {
  price: number;
  period: string;
  cycles: number;
}

interface StoreProductIntroMetadata {
  introPrice: IntroPriceMetadata | null;
}

export function getFreeIntroOffer(product: StoreProductIntroMetadata): FreeIntroOffer | null {
  const introPrice = product.introPrice;
  if (!introPrice || introPrice.price !== 0 || !introPrice.period.trim()) {
    return null;
  }

  return {
    period: introPrice.period,
    cycles: Math.max(1, introPrice.cycles),
  };
}

export function parseTrialDuration(period: string, cycles = 1): TrialDuration | null {
  const match = /^P(\d+)([DWMY])$/i.exec(period.trim());
  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const cycleCount = Math.max(1, Math.trunc(cycles));
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const units: Record<string, TrialDurationUnit> = {
    D: 'day',
    W: 'week',
    M: 'month',
    Y: 'year',
  };
  const unit = units[match[2].toUpperCase()];
  if (!unit) {
    return null;
  }

  return {
    count: value * cycleCount,
    unit,
    iso8601: period,
  };
}
