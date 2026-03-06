import type { DistributionWarningKey } from '../types/compare';

export const DISTRIBUTION_WARNING_TEXTS: Record<Exclude<DistributionWarningKey, null>, string> = {
  scores_clustered:
    'Bu eşleşmede alanlar birbirine yakın görünüyor; sonuç daha çok genel ritimden etkileniyor.',
  low_confidence_damped:
    'Veri netliği sınırlı olduğu için skorlar daha temkinli yorumlanmıştır.',
  house_precision_limited:
    'Doğum saati belirsizliği ev bazlı hassasiyeti düşürebilir.',
};

export function mapDistributionWarningText(key: DistributionWarningKey): string | null {
  if (!key) return null;
  if (key === 'scores_clustered') return null;
  return DISTRIBUTION_WARNING_TEXTS[key] ?? null;
}

export function normalizeConfidenceLabel(label: string | null | undefined, confidence: number): string {
  const raw = (label ?? '').trim().toLocaleLowerCase('tr-TR');

  if (raw === 'yüksek' || raw === 'high') return 'Yüksek';
  if (raw === 'orta' || raw === 'medium') return 'Orta';
  if (raw === 'sınırlı' || raw === 'limited') return 'Sınırlı';

  if (confidence >= 0.75) return 'Yüksek';
  if (confidence >= 0.55) return 'Orta';
  return 'Sınırlı';
}

export function normalizeDataQualityLabel(value: string | null | undefined): string {
  const raw = (value ?? '').trim().toLowerCase();
  if (raw === 'high' || raw === 'yüksek') return 'Yüksek';
  if (raw === 'medium' || raw === 'orta') return 'Orta';
  if (raw === 'limited' || raw === 'sınırlı') return 'Sınırlı';
  return 'Orta';
}

export function formatExplainabilityGeneratedAt(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return 'Bilinmiyor';

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return raw;
  }

  return new Intl.DateTimeFormat('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatFactorsList(factors: string[] | null | undefined): string[] {
  if (!factors || !factors.length) return [];

  return factors
    .map((factor) => factor.trim())
    .filter(Boolean)
    .map((factor) => factor.replace(/[_-]+/g, ' '))
    .map((factor) => factor.charAt(0).toUpperCase() + factor.slice(1));
}
