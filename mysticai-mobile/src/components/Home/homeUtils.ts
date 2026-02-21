import type { ThemeColors } from '../../context/ThemeContext';
import {
  RETRO_CAUTION_KEYS,
  ACTION_MAP_FOCUS_KEYS,
  SECRET_PATTERN_FOCUS_KEYS,
} from './homeConstants';
import type { SwotPoint } from '../../services/astrology.service';

export function getMoonPhaseIcon(phase: string): string {
  if (phase.includes('Yeni Ay')) return '🌑';
  if (phase.includes('Hilal') && phase.includes('Buyuyen')) return '🌒';
  if (phase.includes('Ilk Dordun')) return '🌓';
  if (phase.includes('Sisken') && phase.includes('Buyuyen')) return '🌔';
  if (phase.includes('Dolunay')) return '🌕';
  if (phase.includes('Sisken') && phase.includes('Kuculen')) return '🌖';
  if (phase.includes('Son Dordun')) return '🌗';
  if (phase.includes('Hilal') && phase.includes('Kuculen')) return '🌘';
  return '🌙';
}

export function hashSeed(seed: string): number {
  return seed.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
}

export function normalizeFocus(rawFocus: string | null | undefined): string {
  const focus = (rawFocus ?? '').toLowerCase().trim();
  if (!focus) return 'genel';
  if (focus.includes('ask')) return 'ask';
  if (focus.includes('para')) return 'para';
  if (focus.includes('kariyer')) return 'kariyer';
  if (focus.includes('aile')) return 'aile';
  if (focus.includes('arkadas')) return 'arkadaslik';
  if (focus.includes('ticaret')) return 'ticaret';
  return 'genel';
}

function resolveRelationshipTone(maritalStatus: string | null | undefined, t: (k: string) => string): string {
  const status = (maritalStatus ?? '').toLowerCase();
  if (status.includes('evli')) return t('home.relationTone.married');
  if (status.includes('bekar')) return t('home.relationTone.single');
  if (status.includes('iliski')) return t('home.relationTone.relationship');
  return t('home.relationTone.default');
}

export function buildCuriousSecret(
  name: string,
  daySeed: number,
  focusKey: string,
  maritalStatus: string,
  t: (k: string) => string,
  secretSeed?: string | null
): string {
  const seedBase = `${name}-${daySeed}-${secretSeed ?? ''}`;
  const score = hashSeed(seedBase);
  const focus = SECRET_PATTERN_FOCUS_KEYS.includes(focusKey as any) ? focusKey : 'genel';
  const idx = score % 2;
  const pattern = t(`home.secretPatterns.${focus}.${idx}`);
  return `${name}, ${resolveRelationshipTone(maritalStatus, t)} ${pattern}`;
}

export function buildDailyComment(base: string, focusKey: string, maritalStatus: string, t: (k: string) => string): string {
  const focus = ACTION_MAP_FOCUS_KEYS.includes(focusKey as any) ? focusKey : 'genel';
  const lead = t(`home.focusLead.${focus}`);
  return `${lead} ${resolveRelationshipTone(maritalStatus, t)}, ${base.toLowerCase()}`;
}

export function getFocusLabel(focusKey: string, t: (k: string) => string): string {
  const focus = ACTION_MAP_FOCUS_KEYS.includes(focusKey as any) ? focusKey : 'genel';
  return t(`home.focusLabel.${focus}`);
}

export function normalizeAiCopy(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/\s+/g, ' ')
    .replace(/\b\d+\s*(°|derece|orb|ev|house|yasam yolu|yasam yolunda)\b/gi, '')
    .replace(/\b(kare|ucgen|kavusum|karsit|retrograde|retro)\b/gi, '')
    .replace(/[,:;]\s*$/g, '')
    .trim();
}

export function toSingleSentence(value: string, fallback: string, maxLength = 160): string {
  const normalized = normalizeAiCopy(value);
  const parts = normalized.split(/[.!?]/).map((part) => part.trim()).filter(Boolean);
  let sentence = parts[0] || fallback;
  if (sentence.length > maxLength) {
    sentence = sentence.slice(0, maxLength).replace(/\s+\S*$/, '').trim();
  }
  return sentence.endsWith('.') ? sentence : `${sentence}.`;
}

export function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  return lines.filter((line) => {
    const key = line.toLowerCase();
    if (!line || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function getSwotItems(colors: ThemeColors, t: (k: string) => string) {
  return [
    { id: 'strength' as const, titleKey: 'home.strength', icon: '⚡', accent: colors.violetLight, surface: colors.primarySoftBg },
    { id: 'opportunity' as const, titleKey: 'home.opportunity', icon: '✨', accent: colors.trine, surface: colors.successLight },
    { id: 'threat' as const, titleKey: 'home.threat', icon: '🚫', accent: colors.error, surface: colors.cautionBg },
    { id: 'weakness' as const, titleKey: 'home.weakness', icon: '⚠️', accent: colors.warning, surface: colors.neutralBg },
  ];
}

export type TransitDigest = {
  title: string;
  energyType: 'lucky' | 'mixed' | 'caution';
  energyLabel: string;
  cautionItems: string[];
  actionItems: string[];
};

function getActionItems(t: (k: string) => string, focusKey: string, energyType: 'lucky' | 'mixed' | 'caution'): string[] {
  const focus = ACTION_MAP_FOCUS_KEYS.includes(focusKey as any) ? focusKey : 'genel';
  return [
    t(`home.actionMap.${focus}.${energyType}.0`),
    t(`home.actionMap.${focus}.${energyType}.1`),
  ];
}

export function buildTransitDigest(
  skyPulse: { moonPhase?: string; retrogradePlanets?: string[]; moonSignTurkish?: string } | null,
  natalChart: { sunSign?: string; risingSign?: string } | null,
  focusKey: string,
  aiInsightLines: string[],
  dailyVibeText: string,
  t: (k: string) => string
): TransitDigest {
  const moonSign = skyPulse?.moonSignTurkish ?? '';
  const risingSign = natalChart?.risingSign ?? '';
  const sunSign = natalChart?.sunSign ?? '';
  const identityTag = [sunSign, risingSign, moonSign].filter(Boolean).slice(0, 2).join(' - ');
  const retrogrades = skyPulse?.retrogradePlanets ?? [];
  const moonPhase = skyPulse?.moonPhase ?? '';

  const hasCriticalRetro = retrogrades.some((p: string) => p.includes('Merkür') || p.includes('Mars'));
  const isDolunay = moonPhase.includes('Dolunay') || moonPhase.includes('Son Dördün');
  const energyType: 'lucky' | 'mixed' | 'caution' =
    hasCriticalRetro || retrogrades.length >= 3
      ? 'caution'
      : retrogrades.length > 0 || isDolunay
        ? 'mixed'
        : 'lucky';

  let energyLabel: string;
  if (energyType === 'caution') {
    energyLabel = t('home.energyLabel.retroCaution', {
      planets: retrogrades.slice(0, 2).join(' ve '),
    });
  } else if (energyType === 'mixed' && retrogrades.length > 0) {
    energyLabel = t('home.energyLabel.retroMixed', {
      planet: retrogrades[0],
    });
  } else if (isDolunay) {
    energyLabel = t('home.energyLabel.dolunay', { phase: moonPhase });
  } else if (moonPhase) {
    energyLabel = t('home.energyLabel.moonPhase', { phase: moonPhase });
  } else {
    energyLabel = t('home.energyLabel.default');
  }

  const cautionItems: string[] = [];
  for (const planet of retrogrades) {
    for (const [key, tKey] of Object.entries(RETRO_CAUTION_KEYS)) {
      if (planet.includes(key)) {
        cautionItems.push(t(tKey));
        break;
      }
    }
  }
  if (cautionItems.length === 0 && isDolunay) {
    cautionItems.push(t('home.fullMoonCaution'));
  }

  const actionItems = getActionItems(t, focusKey, energyType);

  const headlineSource = aiInsightLines[0] || dailyVibeText;
  const dynamicTitle = identityTag
    ? `${identityTag} etkisi: ${toSingleSentence(headlineSource, headlineSource, 78).replace(/\.$/, '')}`
    : toSingleSentence(headlineSource, headlineSource, 78).replace(/\.$/, '');

  return {
    title: dynamicTitle,
    energyType,
    energyLabel,
    cautionItems: cautionItems.slice(0, 3),
    actionItems: actionItems.slice(0, 2),
  };
}

export function getDailyVibeFallback(daySeed: number, focusKey: string, maritalStatus: string, t: (k: string) => string): string {
  const idx = (daySeed % 4).toString() as '0' | '1' | '2' | '3';
  const fallback = t(`home.dailyVibeFallback.${idx}`);
  return buildDailyComment(fallback, focusKey, maritalStatus, t);
}
