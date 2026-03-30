import { i18n } from '../../../i18n';

const EN_TUTORIAL_ID_SUFFIX = '_en';

export function normalizeTutorialLocaleTag(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (normalized.startsWith('en')) {
    return 'en';
  }

  if (normalized.startsWith('tr')) {
    return 'tr';
  }

  return normalized;
}

export function resolveTutorialLocaleTag(): string {
  return normalizeTutorialLocaleTag(i18n.resolvedLanguage ?? i18n.language ?? 'tr') ?? 'tr';
}

export function getTutorialLocaleRank(locale: string | null | undefined, requestedLocale: string): number {
  const normalized = normalizeTutorialLocaleTag(locale);

  if (normalized === requestedLocale) {
    return 2;
  }

  if (normalized === null) {
    return 1;
  }

  return 0;
}

export function buildTutorialIdCandidates(tutorialId: string, locale?: string | null): string[] {
  const normalizedLocale = normalizeTutorialLocaleTag(locale) ?? 'tr';
  const isEnglishVariant = tutorialId.endsWith(EN_TUTORIAL_ID_SUFFIX);
  const baseTutorialId = isEnglishVariant
    ? tutorialId.slice(0, -EN_TUTORIAL_ID_SUFFIX.length)
    : tutorialId;
  const englishTutorialId = `${baseTutorialId}${EN_TUTORIAL_ID_SUFFIX}`;

  if (normalizedLocale === 'en') {
    return isEnglishVariant
      ? [tutorialId, baseTutorialId]
      : [englishTutorialId, baseTutorialId];
  }

  return isEnglishVariant
    ? [baseTutorialId, tutorialId]
    : [baseTutorialId];
}
