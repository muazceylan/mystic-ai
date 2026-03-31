import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeScreen, Skeleton, SurfaceHeaderIconButton, TabHeader } from '../../components/ui';
import {
  HeroCard,
  QuickFactChip,
  RetroList,
  SectionCard,
  TransitItemCard,
} from '../../components/daily';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import { queryKeys } from '../../lib/queryKeys';
import { getDailyTransits, getTodayIsoDate, sendFeedback } from '../../services/daily.service';
import type { DailyFeedbackPayload, DailyTransitsDTO } from '../../types/daily.types';
import { trackEvent } from '../../services/analytics';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { getZodiacInfo } from '../../constants/zodiac';
import {
  DAILY_TRANSITS_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_IDS,
  TUTORIAL_SCREEN_KEYS,
  useTutorial,
  useTutorialTrigger,
} from '../../features/tutorial';
import { useTranslation } from 'react-i18next';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';

const SIX_HOURS = 1000 * 60 * 60 * 6;
const ONE_DAY = 1000 * 60 * 60 * 24;
const MAX_TODAY_ITEMS = 2;
const MAX_FOCUS_ITEMS = 3;
const MAX_TRANSITS_PER_THEME = 2;
const GROUP_STATE_STORAGE_PREFIX = 'dailyTransits:expandedThemes';
const THEME_ORDER: string[] = ['Ruh Hali', 'Enerji', 'İletişim', 'Aşk', 'İş'];


type TransitItem = DailyTransitsDTO['transits'][number];
type TransitThemeGroup = { theme: string; items: TransitItem[] };
type TransitTheme = TransitItem['theme'];
type HeroPersonalization = {
  seed: string;
  firstName?: string;
  sunSignName?: string;
  moonSignName?: string;
  risingSignName?: string;
  dominantElement?: string;
};

type DailyLocale = 'tr' | 'en';
type CanonicalTransitTheme = 'mood' | 'energy' | 'communication' | 'love' | 'work';

const THEME_METADATA: Record<
  CanonicalTransitTheme,
  {
    tr: string;
    en: string;
    trFocus: string;
    enFocus: string;
  }
> = {
  mood: { tr: 'Ruh Hali', en: 'Mood', trFocus: 'duygu dengesi', enFocus: 'emotional balance' },
  energy: { tr: 'Enerji', en: 'Energy', trFocus: 'enerji yönetimi', enFocus: 'energy management' },
  communication: { tr: 'İletişim', en: 'Communication', trFocus: 'iletişim akışı', enFocus: 'communication flow' },
  love: { tr: 'Aşk', en: 'Love', trFocus: 'ilişki dengesi', enFocus: 'relationship balance' },
  work: { tr: 'İş', en: 'Work', trFocus: 'iş akışı', enFocus: 'work flow' },
};

const THEME_SEQUENCE: CanonicalTransitTheme[] = ['mood', 'energy', 'communication', 'love', 'work'];

function resolveDailyLocale(locale?: string): DailyLocale {
  return locale?.toLowerCase().startsWith('en') ? 'en' : 'tr';
}

function normalizeDailyToken(value?: string | null): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };

  return (value ?? '')
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => trMap[char] ?? char)
    .join('')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function canonicalizeTheme(theme?: string | null): CanonicalTransitTheme {
  const token = normalizeDailyToken(theme);
  if (token.includes('iletisim') || token.includes('communication')) return 'communication';
  if (token.includes('ask') || token.includes('love') || token.includes('relationship')) return 'love';
  if (token === 'is' || token.includes('work') || token.includes('career')) return 'work';
  if (token.includes('enerji') || token.includes('energy')) return 'energy';
  return 'mood';
}

function localizeTheme(theme: string, locale: DailyLocale): string {
  return THEME_METADATA[canonicalizeTheme(theme)][locale];
}

function getThemeFocusText(theme: CanonicalTransitTheme, locale: DailyLocale): string {
  return locale === 'en' ? THEME_METADATA[theme].enFocus : THEME_METADATA[theme].trFocus;
}

function isCautionLabel(label?: string | null): boolean {
  const token = normalizeDailyToken(label);
  return token.includes('dikkat') || token.includes('caution');
}

function isSupportiveLabel(label?: string | null): boolean {
  const token = normalizeDailyToken(label);
  return token.includes('destekleyici') || token.includes('supportive');
}

function localizeTransitLabel(label: string, locale: DailyLocale): string {
  return isCautionLabel(label)
    ? (locale === 'en' ? 'Caution' : 'Dikkat')
    : (locale === 'en' ? 'Supportive' : 'Destekleyici');
}

function localizeMoodTag(tag: string, locale: DailyLocale): string {
  const token = normalizeDailyToken(tag);
  if (token.includes('sosyal') || token.includes('social')) return locale === 'en' ? 'Social' : 'Sosyal';
  if (token.includes('odak') || token.includes('focus')) return locale === 'en' ? 'Focus' : 'Odak';
  if (token.includes('duygusal') || token.includes('emotional')) return locale === 'en' ? 'Emotional' : 'Duygusal';
  if (token.includes('cesur') || token.includes('bold')) return locale === 'en' ? 'Bold' : 'Cesur';
  return locale === 'en' ? 'Calm' : 'Sakin';
}

function canonicalizeMoodTag(tag: string): 'social' | 'focus' | 'emotional' | 'bold' | 'calm' {
  const token = normalizeDailyToken(tag);
  if (token.includes('sosyal') || token.includes('social')) return 'social';
  if (token.includes('odak') || token.includes('focus')) return 'focus';
  if (token.includes('duygusal') || token.includes('emotional')) return 'emotional';
  if (token.includes('cesur') || token.includes('bold')) return 'bold';
  return 'calm';
}

function canonicalizeElement(element?: string | null): 'fire' | 'earth' | 'air' | 'water' | 'unknown' {
  const token = normalizeDailyToken(element);
  if (token.includes('ates') || token.includes('fire')) return 'fire';
  if (token.includes('toprak') || token.includes('earth')) return 'earth';
  if (token.includes('hava') || token.includes('air')) return 'air';
  if (token.includes('su') || token.includes('water')) return 'water';
  return 'unknown';
}

function localizeTransitItem(item: TransitItem, locale: DailyLocale): TransitItem {
  return {
    ...item,
    theme: localizeTheme(item.theme, locale) as TransitItem['theme'],
    label: localizeTransitLabel(item.label, locale) as TransitItem['label'],
  };
}

function formatDateLabel(dateIso: string, locale: string): string {
  const date = new Date(dateIso);
  if (Number.isNaN(date.getTime())) return dateIso;
  return date.toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US', { day: 'numeric', month: 'short' });
}

function hasTrailingEllipsis(text?: string): boolean {
  if (!text) return false;
  const value = text.trim();
  return value.endsWith('…') || value.endsWith('...');
}

const THEME_FOCUS_TEXT: Record<string, string> = {
  'İletişim': 'iletişim akışı',
  'Aşk': 'ilişki dengesi',
  'İş': 'iş akışı',
  'Enerji': 'enerji yönetimi',
  'Ruh Hali': 'duygu dengesi',
};

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function pickBySeed<T>(items: readonly T[], seed: string): T {
  if (items.length === 0) {
    throw new Error('pickBySeed requires a non-empty list');
  }
  return items[hashString(seed) % items.length];
}

function toFirstName(input?: string | null): string | undefined {
  const value = input?.trim();
  if (!value) return undefined;
  return value.split(/\s+/)[0];
}

function resolveDominantElement(elements: string[]): string | undefined {
  if (elements.length === 0) return undefined;
  const counts = new Map<string, number>();
  elements.forEach((item) => counts.set(item, (counts.get(item) ?? 0) + 1));

  let best = elements[0];
  let bestCount = counts.get(best) ?? 0;
  counts.forEach((count, element) => {
    if (count > bestCount) {
      best = element;
      bestCount = count;
    }
  });
  return best;
}

function buildHeroPersonalization(
  user: {
    id?: number;
    firstName?: string;
    name?: string;
    maritalStatus?: string;
    relationshipStage?: string;
    zodiacSign?: string;
  } | null,
  chart: {
    calculatedAt?: string;
    sunSign?: string;
    moonSign?: string;
    risingSign?: string;
  } | null,
  locale: DailyLocale,
): HeroPersonalization | null {
  const firstName = toFirstName(user?.firstName) ?? toFirstName(user?.name);
  const unknownName = locale === 'en' ? 'Unknown' : 'Bilinmiyor';
  const sunInfo = getZodiacInfo(chart?.sunSign ?? user?.zodiacSign, locale);
  const moonInfo = getZodiacInfo(chart?.moonSign, locale);
  const risingInfo = getZodiacInfo(chart?.risingSign, locale);

  const sunSignName = sunInfo.name !== unknownName ? sunInfo.name : undefined;
  const moonSignName = moonInfo.name !== unknownName ? moonInfo.name : undefined;
  const risingSignName = risingInfo.name !== unknownName ? risingInfo.name : undefined;
  const dominantElement = resolveDominantElement(
    [sunInfo.element, moonInfo.element, risingInfo.element].filter((item) => item && item !== unknownName),
  );

  const seed = [
    user?.id ?? '',
    user?.maritalStatus ?? '',
    user?.relationshipStage ?? '',
    chart?.calculatedAt ?? '',
    sunSignName ?? '',
    moonSignName ?? '',
    risingSignName ?? '',
    dominantElement ?? '',
  ].join('|');

  if (!firstName && !sunSignName && !moonSignName && !risingSignName && !dominantElement) {
    return null;
  }

  return {
    seed,
    firstName,
    sunSignName,
    moonSignName,
    risingSignName,
    dominantElement,
  };
}

function buildPersonalizedLine(
  personalization: HeroPersonalization | null,
  focusText: string,
  baseSeed: string,
): string {
  if (!personalization) return '';
  const namePrefix = personalization.firstName ? `${personalization.firstName}, ` : '';
  const options: string[] = [];

  if (personalization.sunSignName) {
    options.push(
      `${namePrefix}${personalization.sunSignName} Güneş tonun bugün ${focusText} tarafında görünür adımları destekliyor.`,
      `${namePrefix}${personalization.sunSignName} etkisiyle ${focusText} alanında netlik kazanman daha kolay olabilir.`,
    );
  }
  if (personalization.moonSignName) {
    options.push(
      `${personalization.moonSignName} Ay ritmin duyguyu net ifade ettiğinde ${focusText} akışını güçlendirir.`,
      `${personalization.moonSignName} Ay yerleşimin, ${focusText} tarafında sezgiyle ilerlediğinde daha iyi çalışır.`,
    );
  }
  if (personalization.risingSignName) {
    options.push(
      `${personalization.risingSignName} yükselenin ilk teması sade tuttuğunda ${focusText} daha hızlı açılır.`,
      `${personalization.risingSignName} yükselen yaklaşımınla ${focusText} alanında küçük ama kararlı adımlar etkili olur.`,
    );
  }
  switch (personalization.dominantElement) {
    case 'Ateş':
      options.push(
        'Ateş elementi baskınlığın hızlı hamleyi destekliyor; kısa duraklarla tempo dengesini koru.',
        'Ateş ağırlığın ivme veriyor; enerjiyi tek önceliğe bağlamak verimi artırır.',
      );
      break;
    case 'Toprak':
      options.push(
        'Toprak elementi baskınlığın planı somutlaştırma gücü veriyor; adım adım ilerlemek bugün çok işe yarar.',
        'Toprak ağırlığın düzen kurmana yardım eder; küçük ama sürekli ilerleme bugün ana avantajın.',
      );
      break;
    case 'Hava':
      options.push(
        'Hava elementi baskınlığın fikir akışını hızlandırıyor; kısa ve net iletişimle etkiyi büyütebilirsin.',
        'Hava ağırlığın esnek düşünmeni kolaylaştırıyor; dağılmamak için öncelikleri görünür tut.',
      );
      break;
    case 'Su':
      options.push(
        'Su elementi baskınlığın sezgiyi güçlendiriyor; duygunu netleştirmek karar kalitesini artırır.',
        'Su ağırlığın empatiyi yükseltiyor; sınırlarını da net tuttuğunda gün daha dengeli ilerler.',
      );
      break;
    default:
      break;
  }

  if (options.length === 0) return '';
  return pickBySeed(options, `${baseSeed}|${personalization.seed}|personal`);
}

function buildPersonalizedLineLocalized(
  personalization: HeroPersonalization | null,
  focusText: string,
  baseSeed: string,
  locale: DailyLocale,
): string {
  if (!personalization) return '';
  const namePrefix = personalization.firstName ? `${personalization.firstName}, ` : '';
  const options: string[] = [];

  if (personalization.sunSignName) {
    options.push(
      locale === 'en'
        ? `${namePrefix}your ${personalization.sunSignName} Sun tone supports visible steps around ${focusText} today.`
        : `${namePrefix}${personalization.sunSignName} Güneş tonun bugün ${focusText} tarafında görünür adımları destekliyor.`,
      locale === 'en'
        ? `${namePrefix}${personalization.sunSignName} energy can make clarity easier to build around ${focusText} today.`
        : `${namePrefix}${personalization.sunSignName} etkisiyle ${focusText} alanında netlik kazanman daha kolay olabilir.`,
    );
  }
  if (personalization.moonSignName) {
    options.push(
      locale === 'en'
        ? `Your ${personalization.moonSignName} Moon rhythm strengthens ${focusText} when feelings are expressed clearly.`
        : `${personalization.moonSignName} Ay ritmin duyguyu net ifade ettiğinde ${focusText} akışını güçlendirir.`,
      locale === 'en'
        ? `Your ${personalization.moonSignName} Moon placement works better when you trust intuition around ${focusText}.`
        : `${personalization.moonSignName} Ay yerleşimin, ${focusText} tarafında sezgiyle ilerlediğinde daha iyi çalışır.`,
    );
  }
  if (personalization.risingSignName) {
    options.push(
      locale === 'en'
        ? `When your ${personalization.risingSignName} rising tone keeps the first move simple, ${focusText} opens faster.`
        : `${personalization.risingSignName} yükselenin ilk teması sade tuttuğunda ${focusText} daha hızlı açılır.`,
      locale === 'en'
        ? `With your ${personalization.risingSignName} rising approach, small but steady moves work well around ${focusText}.`
        : `${personalization.risingSignName} yükselen yaklaşımınla ${focusText} alanında küçük ama kararlı adımlar etkili olur.`,
    );
  }

  switch (canonicalizeElement(personalization.dominantElement)) {
    case 'fire':
      options.push(
        locale === 'en'
          ? 'Your fire emphasis supports quick action today; short pauses will keep the pace balanced.'
          : 'Ateş elementi baskınlığın hızlı hamleyi destekliyor; kısa duraklarla tempo dengesini koru.',
        locale === 'en'
          ? 'Your fire-heavy chart brings momentum; tying energy to one priority will improve efficiency.'
          : 'Ateş ağırlığın ivme veriyor; enerjiyi tek önceliğe bağlamak verimi artırır.',
      );
      break;
    case 'earth':
      options.push(
        locale === 'en'
          ? 'Your earth emphasis helps make plans tangible; moving step by step works especially well today.'
          : 'Toprak elementi baskınlığın planı somutlaştırma gücü veriyor; adım adım ilerlemek bugün çok işe yarar.',
        locale === 'en'
          ? 'Your earth-heavy chart supports structure; small but steady progress is your advantage today.'
          : 'Toprak ağırlığın düzen kurmana yardım eder; küçük ama sürekli ilerleme bugün ana avantajın.',
      );
      break;
    case 'air':
      options.push(
        locale === 'en'
          ? 'Your air emphasis speeds up ideas; short and clear communication can amplify the impact.'
          : 'Hava elementi baskınlığın fikir akışını hızlandırıyor; kısa ve net iletişimle etkiyi büyütebilirsin.',
        locale === 'en'
          ? 'Your air-heavy chart keeps thinking flexible; make priorities visible so you do not scatter.'
          : 'Hava ağırlığın esnek düşünmeni kolaylaştırıyor; dağılmamak için öncelikleri görünür tut.',
      );
      break;
    case 'water':
      options.push(
        locale === 'en'
          ? 'Your water emphasis strengthens intuition; clarifying your feelings improves decision quality today.'
          : 'Su elementi baskınlığın sezgiyi güçlendiriyor; duygunu netleştirmek karar kalitesini artırır.',
        locale === 'en'
          ? 'Your water-heavy chart raises empathy; the day stays steadier when you keep your boundaries clear.'
          : 'Su ağırlığın empatiyi yükseltiyor; sınırlarını da net tuttuğunda gün daha dengeli ilerler.',
      );
      break;
    default:
      break;
  }

  if (options.length === 0) return '';
  return pickBySeed(options, `${baseSeed}|${personalization.seed}|localized|${locale}`);
}

function resolvePrimaryTheme(hero: DailyTransitsDTO['hero'], transits: TransitItem[]): TransitTheme {
  if (transits.length > 0) {
    // Performance: only need the max confidence element.
    let strongest = transits[0];
    let bestConfidence = strongest.confidence;

    for (let i = 1; i < transits.length; i += 1) {
      const item = transits[i];
      if (item.confidence > bestConfidence) {
        bestConfidence = item.confidence;
        strongest = item;
      }
    }

    return strongest.theme;
  }

  switch (hero.icon) {
    case 'mercury':
      return 'İletişim';
    case 'venus':
      return 'Aşk';
    case 'saturn':
      return 'İş';
    case 'mars':
      return 'Enerji';
    default:
      return 'Ruh Hali';
  }
}

function buildHeroHeadline(data: DailyTransitsDTO, personalization: HeroPersonalization | null): string {
  const { hero, transits, retrogrades, date } = data;
  const primaryTheme = resolvePrimaryTheme(hero, transits);
  const focusText = THEME_FOCUS_TEXT[primaryTheme];
  const hasRetrogrades = retrogrades.length > 0;
  let supportiveCount = 0;
  let cautionCount = 0;
  for (const item of transits) {
    if (item.label === 'Destekleyici') supportiveCount += 1;
    if (item.label === 'Dikkat') cautionCount += 1;
  }
  const intensityBand = hero.intensity >= 75 ? 'high' : hero.intensity >= 55 ? 'mid' : 'low';

  const baseSeed = [
    date,
    hero.moodTag,
    primaryTheme,
    String(hero.intensity),
    transits.slice(0, 3).map((item) => `${item.id}:${item.label}`).join('|'),
  ].join('|');

  const baseLine = (() => {
    switch (hero.moodTag) {
      case 'Sosyal':
        return pickBySeed(
          [
            `Bugün ${focusText} üzerinden insanlarla temasın güçleniyor.`,
            `Sosyal tarafta ${focusText} günün ritmini belirleyecek.`,
            `${focusText} odaklı temaslar bugün kapı açabilir.`,
          ] as const,
          `${baseSeed}|base-social`,
        );
      case 'Odak':
        return pickBySeed(
          [
            `Bugün ${focusText} tarafına öncelik verirsen hızlanırsın.`,
            `${focusText} için tek hedefe odaklanmak verimi artırır.`,
            `${focusText} ekseninde sade bir planla daha hızlı ilerlersin.`,
          ] as const,
          `${baseSeed}|base-focus`,
        );
      case 'Cesur':
        return pickBySeed(
          [
            `${focusText} alanında cesur ama ölçülü adımlar avantaj sağlar.`,
            `Bugün ${focusText} tarafında kontrollü risk almak işe yarar.`,
            `${focusText} için net bir hamle günün yönünü değiştirebilir.`,
          ] as const,
          `${baseSeed}|base-bold`,
        );
      case 'Duygusal':
        return pickBySeed(
          [
            `${focusText} tarafında duyguların kararlarına güçlü etki edebilir.`,
            `Bugün ${focusText} alanında hassasiyet yüksek; ritmi yavaş tut.`,
            `${focusText} gündeminde iç sesini dinlemek daha doğru sonuç verir.`,
          ] as const,
          `${baseSeed}|base-emotional`,
        );
      default:
        return pickBySeed(
          [
            `Bugün ${focusText} tarafında dengeli kalmak işleri kolaylaştırır.`,
            `${focusText} alanında adım adım ilerlemek en sağlam seçenek.`,
            `${focusText} için sakin tempo gün boyu istikrar sağlar.`,
          ] as const,
          `${baseSeed}|base-default`,
        );
    }
  })();

  const paceLine = (() => {
    if (intensityBand === 'high') {
      return pickBySeed(
        [
          'Enerjin yüksekken kısa bloklarla ilerlemek daha iyi sonuç verir.',
          'Yüksek tempoyu tek önceliğe bağlarsan gün daha verimli akar.',
          'İvmen güçlü; aynı anda çok işe dağılmamak avantaj sağlar.',
        ] as const,
        `${baseSeed}|pace-high`,
      );
    }
    if (intensityBand === 'mid') {
      return pickBySeed(
        [
          'Ritmini koruyarak adım adım ilerlemek bugün daha kazançlı.',
          'Dengeli tempo kurduğunda verim ve sakinlik birlikte artar.',
          'Orta tempoda net önceliklerle gitmek gününü rahatlatır.',
        ] as const,
        `${baseSeed}|pace-mid`,
      );
    }
    return pickBySeed(
      [
        'Kendine küçük molalar açarak temponu sürdürülebilir tut.',
        'Enerjiyi korumak için işleri küçük parçalara bölmek faydalı olur.',
        'Sakin ama kararlı ilerlemek bugün en doğru strateji olur.',
      ] as const,
      `${baseSeed}|pace-low`,
    );
  })();

  const cautionLine = cautionCount > supportiveCount
    ? pickBySeed(
      [
        'Dikkat gerektiren başlıklar ağır basıyor; acele karar vermemek iyi olur.',
        'Zorlayıcı etkiler güçlü; net kontrol listesiyle ilerlemek riski düşürür.',
      ] as const,
      `${baseSeed}|caution`,
    )
    : pickBySeed(
      [
        'Destekleyici etkiler baskın; doğru zamanlamayla ivme yakalayabilirsin.',
        'Akış daha destekleyici görünüyor; fırsatları küçük adımlarla değerlendirebilirsin.',
      ] as const,
      `${baseSeed}|supportive`,
    );
  const personalizedLine = buildPersonalizedLine(personalization, focusText, baseSeed);

  const retroLine = hasRetrogrades
    ? pickBySeed(
      [
        'Retro etkisinde iletişimde kısa ve net cümleler tercih et.',
        'Retro varken detay kontrolünü iki kez yapmak kazandırır.',
        'Retro döneminde mesaj ve planları göndermeden önce bir kez daha gözden geçir.',
      ] as const,
      `${baseSeed}|retro`,
    )
    : '';

  return [baseLine, paceLine, personalizedLine, cautionLine, retroLine].filter(Boolean).join(' ');
}

function resolveHeroHeadline(
  data: DailyTransitsDTO,
  personalization: HeroPersonalization | null,
): string {
  const hero = data.hero;
  const headline = hero.headline?.trim();
  if (!headline) return buildHeroHeadline(data, personalization);
  if (!hasTrailingEllipsis(headline)) return headline;
  return buildHeroHeadline(data, personalization);
}

function resolvePrimaryThemeLocalized(
  hero: DailyTransitsDTO['hero'],
  transits: TransitItem[],
): CanonicalTransitTheme {
  if (transits.length > 0) {
    // Performance: only need the max confidence element.
    let strongest = transits[0];
    let bestConfidence = strongest.confidence;

    for (let i = 1; i < transits.length; i += 1) {
      const item = transits[i];
      if (item.confidence > bestConfidence) {
        bestConfidence = item.confidence;
        strongest = item;
      }
    }

    return canonicalizeTheme(strongest.theme);
  }

  switch (hero.icon) {
    case 'mercury':
      return 'communication';
    case 'venus':
      return 'love';
    case 'saturn':
      return 'work';
    case 'mars':
      return 'energy';
    default:
      return 'mood';
  }
}

function buildHeroHeadlineLocalized(
  data: DailyTransitsDTO,
  personalization: HeroPersonalization | null,
  locale: DailyLocale,
): string {
  const { hero, transits, retrogrades, date } = data;
  const primaryTheme = resolvePrimaryThemeLocalized(hero, transits);
  const focusText = getThemeFocusText(primaryTheme, locale);
  const hasRetrogrades = retrogrades.length > 0;
  let supportiveCount = 0;
  let cautionCount = 0;
  for (const item of transits) {
    if (isSupportiveLabel(item.label)) supportiveCount += 1;
    if (isCautionLabel(item.label)) cautionCount += 1;
  }
  const intensityBand = hero.intensity >= 75 ? 'high' : hero.intensity >= 55 ? 'mid' : 'low';
  const moodTag = canonicalizeMoodTag(hero.moodTag);

  const baseSeed = [
    date,
    hero.moodTag,
    primaryTheme,
    String(hero.intensity),
    transits.slice(0, 3).map((item) => `${item.id}:${item.label}`).join('|'),
  ].join('|');

  const baseLine = (() => {
    switch (moodTag) {
      case 'social':
        return pickBySeed(
          locale === 'en'
            ? [
                `Today your contact with people grows stronger through ${focusText}.`,
                `On the social side, ${focusText} is likely to shape today's rhythm.`,
                `Connections centered on ${focusText} can open doors today.`,
              ] as const
            : [
                `Bugün ${focusText} üzerinden insanlarla temasın güçleniyor.`,
                `Sosyal tarafta ${focusText} günün ritmini belirleyecek.`,
                `${focusText} odaklı temaslar bugün kapı açabilir.`,
              ] as const,
          `${baseSeed}|base-social|${locale}`,
        );
      case 'focus':
        return pickBySeed(
          locale === 'en'
            ? [
                `You will speed up today if you prioritize ${focusText}.`,
                `Focusing on one target inside ${focusText} will improve efficiency.`,
                `A simpler plan around ${focusText} helps you move faster today.`,
              ] as const
            : [
                `Bugün ${focusText} tarafına öncelik verirsen hızlanırsın.`,
                `${focusText} için tek hedefe odaklanmak verimi artırır.`,
                `${focusText} ekseninde sade bir planla daha hızlı ilerlersin.`,
              ] as const,
          `${baseSeed}|base-focus|${locale}`,
        );
      case 'bold':
        return pickBySeed(
          locale === 'en'
            ? [
                `Bold but measured steps around ${focusText} can work in your favor today.`,
                `A controlled risk around ${focusText} may pay off today.`,
                `One clear move for ${focusText} could change the direction of your day.`,
              ] as const
            : [
                `${focusText} alanında cesur ama ölçülü adımlar avantaj sağlar.`,
                `Bugün ${focusText} tarafında kontrollü risk almak işe yarar.`,
                `${focusText} için net bir hamle günün yönünü değiştirebilir.`,
              ] as const,
          `${baseSeed}|base-bold|${locale}`,
        );
      case 'emotional':
        return pickBySeed(
          locale === 'en'
            ? [
                `Emotions may strongly influence your decisions around ${focusText} today.`,
                `Sensitivity is high around ${focusText} today, so keep the rhythm slow.`,
                `Listening to your inner voice around ${focusText} can lead to better choices.`,
              ] as const
            : [
                `${focusText} tarafında duyguların kararlarına güçlü etki edebilir.`,
                `Bugün ${focusText} alanında hassasiyet yüksek; ritmi yavaş tut.`,
                `${focusText} gündeminde iç sesini dinlemek daha doğru sonuç verir.`,
              ] as const,
          `${baseSeed}|base-emotional|${locale}`,
        );
      default:
        return pickBySeed(
          locale === 'en'
            ? [
                `Staying balanced around ${focusText} makes the day easier.`,
                `Step-by-step progress is the steadiest option for ${focusText}.`,
                `A calm pace around ${focusText} supports stability all day.`,
              ] as const
            : [
                `Bugün ${focusText} tarafında dengeli kalmak işleri kolaylaştırır.`,
                `${focusText} alanında adım adım ilerlemek en sağlam seçenek.`,
                `${focusText} için sakin tempo gün boyu istikrar sağlar.`,
              ] as const,
          `${baseSeed}|base-default|${locale}`,
        );
    }
  })();

  const paceLine = (() => {
    if (intensityBand === 'high') {
      return pickBySeed(
        locale === 'en'
          ? [
              'Short blocks work better when your energy is high.',
              'The day flows better when high tempo is tied to one priority.',
              'Your momentum is strong, so avoiding too many parallel tasks will help.',
            ] as const
          : [
              'Enerjin yüksekken kısa bloklarla ilerlemek daha iyi sonuç verir.',
              'Yüksek tempoyu tek önceliğe bağlarsan gün daha verimli akar.',
              'İvmen güçlü; aynı anda çok işe dağılmamak avantaj sağlar.',
            ] as const,
        `${baseSeed}|pace-high|${locale}`,
      );
    }
    if (intensityBand === 'mid') {
      return pickBySeed(
        locale === 'en'
          ? [
              'Step-by-step progress is more rewarding today.',
              'Balanced pacing increases both productivity and calm.',
              'Clear priorities at a moderate tempo can ease the day.',
            ] as const
          : [
              'Ritmini koruyarak adım adım ilerlemek bugün daha kazançlı.',
              'Dengeli tempo kurduğunda verim ve sakinlik birlikte artar.',
              'Orta tempoda net önceliklerle gitmek gününü rahatlatır.',
            ] as const,
        `${baseSeed}|pace-mid|${locale}`,
      );
    }
    return pickBySeed(
      locale === 'en'
        ? [
            'Open small pauses for yourself and keep the pace sustainable.',
            'Breaking tasks into smaller parts can protect your energy.',
            'A calm but steady rhythm is the best strategy today.',
          ] as const
        : [
            'Kendine küçük molalar açarak temponu sürdürülebilir tut.',
            'Enerjiyi korumak için işleri küçük parçalara bölmek faydalı olur.',
            'Sakin ama kararlı ilerlemek bugün en doğru strateji olur.',
          ] as const,
      `${baseSeed}|pace-low|${locale}`,
    );
  })();

  const cautionLine = cautionCount > supportiveCount
    ? pickBySeed(
        locale === 'en'
          ? [
              'Areas that require caution are heavier today, so avoid rushing decisions.',
              'Challenging signals are stronger; moving with a clear checklist will reduce risk.',
            ] as const
          : [
              'Dikkat gerektiren başlıklar ağır basıyor; acele karar vermemek iyi olur.',
              'Zorlayıcı etkiler güçlü; net kontrol listesiyle ilerlemek riski düşürür.',
            ] as const,
        `${baseSeed}|caution|${locale}`,
      )
    : pickBySeed(
        locale === 'en'
          ? [
              'Supportive signals are leading, so timing can help you build momentum.',
              'The flow looks more supportive today; small steps can help you use the openings well.',
            ] as const
          : [
              'Destekleyici etkiler baskın; doğru zamanlamayla ivme yakalayabilirsin.',
              'Akış daha destekleyici görünüyor; fırsatları küçük adımlarla değerlendirebilirsin.',
            ] as const,
        `${baseSeed}|supportive|${locale}`,
      );

  const personalizedLine = buildPersonalizedLineLocalized(personalization, focusText, baseSeed, locale);
  const retroLine = hasRetrogrades
    ? pickBySeed(
        locale === 'en'
          ? [
              'Keep messages short and clear while retrograde pressure is active.',
              'Double-checking details while retrogrades are active can pay off.',
              'Review messages and plans once more before sending them during retrograde periods.',
            ] as const
          : [
              'Retro etkisinde iletişimde kısa ve net cümleler tercih et.',
              'Retro varken detay kontrolünü iki kez yapmak kazandırır.',
              'Retro döneminde mesaj ve planları göndermeden önce bir kez daha gözden geçir.',
            ] as const,
        `${baseSeed}|retro|${locale}`,
      )
    : '';

  return [baseLine, paceLine, personalizedLine, cautionLine, retroLine].filter(Boolean).join(' ');
}

function resolveHeroHeadlineLocalized(
  data: DailyTransitsDTO,
  personalization: HeroPersonalization | null,
  locale: DailyLocale,
): string {
  const headline = data.hero.headline?.trim();
  if (!headline || hasTrailingEllipsis(headline)) {
    return buildHeroHeadlineLocalized(data, personalization, locale);
  }
  return headline;
}

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?]\s+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeSentence(text: string): string {
  const trMap: Record<string, string> = {
    ç: 'c',
    ğ: 'g',
    ı: 'i',
    ö: 'o',
    ş: 's',
    ü: 'u',
  };

  return text
    .trim()
    .toLowerCase()
    .split('')
    .map((char) => trMap[char] ?? char)
    .join('')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function jaccardSimilarity(a: string, b: string): number {
  const left = new Set(a.split(' ').filter(Boolean));
  const right = new Set(b.split(' ').filter(Boolean));
  if (!left.size || !right.size) return 0;

  let intersection = 0;
  left.forEach((token) => {
    if (right.has(token)) intersection += 1;
  });
  const union = new Set([...left, ...right]).size;
  return union === 0 ? 0 : intersection / union;
}

function isSimilarSentence(leftText: string, rightText: string): boolean {
  const left = normalizeSentence(leftText);
  const right = normalizeSentence(rightText);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  return jaccardSimilarity(left, right) >= 0.78;
}

function dedupeSentences(items: string[], excluded: string[] = []): string[] {
  const result: string[] = [];
  for (const item of items) {
    const text = item.trim();
    if (!text) continue;
    if (excluded.some((candidate) => isSimilarSentence(candidate, text))) continue;
    if (result.some((candidate) => isSimilarSentence(candidate, text))) continue;
    result.push(text);
  }
  return result;
}

function transitIdentity(item: TransitItem): string {
  const technical = item.technical;
  if (technical) {
    return [
      normalizeSentence(item.theme),
      normalizeSentence(item.label),
      normalizeSentence(technical.transitPlanet),
      normalizeSentence(technical.natalPoint),
      normalizeSentence(technical.aspect),
      normalizeSentence(technical.house ?? ''),
      normalizeSentence(item.titlePlain),
      normalizeSentence(item.impactPlain),
    ].join('|');
  }

  return [
    normalizeSentence(item.theme),
    normalizeSentence(item.label),
    normalizeSentence(item.titlePlain),
    normalizeSentence(item.impactPlain),
  ].join('|');
}

function isDuplicateTransit(left: TransitItem, right: TransitItem): boolean {
  if (left.id === right.id) return true;
  if (transitIdentity(left) === transitIdentity(right)) return true;

  const sameTheme = normalizeSentence(left.theme) === normalizeSentence(right.theme);
  const sameLabel = normalizeSentence(left.label) === normalizeSentence(right.label);
  if (!(sameTheme && sameLabel)) return false;

  return (
    isSimilarSentence(left.titlePlain, right.titlePlain) &&
    isSimilarSentence(left.impactPlain, right.impactPlain)
  );
}

function dedupeTransits(items: TransitItem[]): TransitItem[] {
  const deduped: TransitItem[] = [];

  items.forEach((item) => {
    const duplicateIndex = deduped.findIndex((existing) => isDuplicateTransit(existing, item));
    if (duplicateIndex === -1) {
      deduped.push(item);
      return;
    }

    const existing = deduped[duplicateIndex];
    // Prefer the stronger candidate dynamically if duplicate payload arrives.
    if (item.confidence > existing.confidence) {
      deduped[duplicateIndex] = item;
    }
  });

  return deduped;
}

function parseTimeWindowStart(timeWindow?: string): number {
  if (!timeWindow) return Number.MAX_SAFE_INTEGER;
  const match = timeWindow.match(/(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return Number.MAX_SAFE_INTEGER;
  return hour * 60 + minute;
}

function compareTransitItems(left: TransitItem, right: TransitItem): number {
  const timeDiff = parseTimeWindowStart(left.timeWindow) - parseTimeWindowStart(right.timeWindow);
  if (timeDiff !== 0) return timeDiff;
  if (left.label !== right.label) {
    return isCautionLabel(left.label) ? -1 : 1;
  }
  return left.titlePlain.localeCompare(right.titlePlain, 'tr');
}

function groupTransits(items: TransitItem[], locale: DailyLocale): TransitThemeGroup[] {
  const byTheme = new Map<string, TransitItem[]>();
  items.forEach((item) => {
    const localizedTheme = localizeTheme(item.theme, locale);
    const current = byTheme.get(localizedTheme) ?? [];
    current.push(item);
    byTheme.set(localizedTheme, current);
  });

  const orderedThemeSequence = THEME_SEQUENCE.map((theme) => THEME_METADATA[theme][locale]);
  const orderedThemeSet = new Set(orderedThemeSequence);

  const orderedThemes = [
    ...orderedThemeSequence.filter((theme) => byTheme.has(theme)),
    ...Array.from(byTheme.keys())
      .filter((theme) => !orderedThemeSet.has(theme))
      .sort((a, b) => a.localeCompare(b, 'tr')),
  ];

  return orderedThemes.map((theme) => ({
    theme,
    items: (byTheme.get(theme) ?? []).slice().sort(compareTransitItems),
  }));
}

function LoadingState() {
  return (
    <View style={styles.loadingWrap}>
      <Skeleton height={180} borderRadius={RADIUS.lg} />
      <View style={styles.quickRow}>
        <Skeleton height={84} borderRadius={RADIUS.lg} style={{ flex: 1 }} />
        <Skeleton height={84} borderRadius={RADIUS.lg} style={{ flex: 1 }} />
        <Skeleton height={84} borderRadius={RADIUS.lg} style={{ flex: 1 }} />
      </View>
      <Skeleton height={132} borderRadius={RADIUS.lg} />
      <Skeleton height={152} borderRadius={RADIUS.lg} />
      <Skeleton height={164} borderRadius={RADIUS.lg} />
    </View>
  );
}

export default function DailyTransitsScreen() {
  const { t, i18n } = useTranslation();
  const resolvedLocale = useMemo<DailyLocale>(
    () => resolveDailyLocale(i18n.resolvedLanguage ?? i18n.language),
    [i18n.language, i18n.resolvedLanguage],
  );
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const goBack = useSmartBackNavigation({ fallbackRoute: '/(tabs)/home' });
  const user = useAuthStore((state) => state.user);
  const { reopenTutorialById } = useTutorial();
  const { triggerInitial: triggerInitialTutorials } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.DAILY_TRANSITS);
  const chart = useNatalChartStore((state) => state.chart);
  const date = useMemo(() => getTodayIsoDate(), []);
  const viewedEventSentRef = useRef<string | null>(null);
  const errorEventSentRef = useRef<string | null>(null);
  const loadEventSentRef = useRef<string | null>(null);
  const tutorialBootstrapRef = useRef<string | null>(null);
  const [expandedThemes, setExpandedThemes] = useState<Record<string, boolean>>({});

  const dailyTransitsQuery = useQuery({
    queryKey: queryKeys.dailyTransits(date, resolvedLocale),
    queryFn: () => getDailyTransits(date, resolvedLocale),
    staleTime: SIX_HOURS,
    gcTime: ONE_DAY,
  });

  useEffect(() => {
    let active = true;
    const key = `${GROUP_STATE_STORAGE_PREFIX}:${resolvedLocale}:${date}`;
    const restoreGroupState = async () => {
      try {
        const raw = await AsyncStorage.getItem(key);
        if (!active) return;
        if (!raw) {
          setExpandedThemes({});
          return;
        }
        const parsed = JSON.parse(raw) as Record<string, boolean> | null;
        if (parsed && typeof parsed === 'object') {
          setExpandedThemes(parsed);
          return;
        }
        setExpandedThemes({});
      } catch {
        if (active) {
          setExpandedThemes({});
        }
      }
    };
    void restoreGroupState();
    return () => {
      active = false;
    };
  }, [date, resolvedLocale]);

  useEffect(() => {
    const key = `${GROUP_STATE_STORAGE_PREFIX}:${resolvedLocale}:${date}`;
    void AsyncStorage.setItem(key, JSON.stringify(expandedThemes));
  }, [date, expandedThemes, resolvedLocale]);

  useEffect(() => {
    if (!dailyTransitsQuery.data) return;
    const eventKey = `${dailyTransitsQuery.data.date}:${resolvedLocale}`;
    if (loadEventSentRef.current === eventKey) return;
    loadEventSentRef.current = eventKey;
    trackEvent('daily_transits_load', {
      date: dailyTransitsQuery.data.date,
      surface: 'daily_transits',
      destination: 'daily_transits',
      result: dailyTransitsQuery.data.transits.length > 0 ? 'success' : 'fail',
      reason: dailyTransitsQuery.data.transits.length > 0 ? undefined : 'empty_payload',
      locale: resolvedLocale,
    });
  }, [dailyTransitsQuery.data, resolvedLocale]);

  useEffect(() => {
    if (!dailyTransitsQuery.data) return;
    if (dailyTransitsQuery.data.transits.length === 0) return;
    const eventKey = `${dailyTransitsQuery.data.date}:${resolvedLocale}`;
    if (viewedEventSentRef.current === eventKey) return;
    viewedEventSentRef.current = eventKey;
    trackEvent('daily_transits_viewed', {
      date: dailyTransitsQuery.data.date,
      transit_count: dailyTransitsQuery.data.transits.length,
      surface: 'daily_transits',
      destination: 'daily_transits',
      result: 'success',
      locale: resolvedLocale,
    });
  }, [dailyTransitsQuery.data, resolvedLocale]);

  useEffect(() => {
    if (!dailyTransitsQuery.isError) return;
    const eventKey = `${date}:${resolvedLocale}`;
    if (errorEventSentRef.current === eventKey) return;
    errorEventSentRef.current = eventKey;
    trackEvent('daily_transits_load', {
      date,
      surface: 'daily_transits',
      destination: 'daily_transits',
      result: 'fail',
      locale: resolvedLocale,
    });
  }, [dailyTransitsQuery.isError, date, resolvedLocale]);

  useEffect(() => {
    const scope = user?.id ? String(user.id) : null;
    if (!scope) {
      tutorialBootstrapRef.current = null;
      return;
    }

    if (tutorialBootstrapRef.current === scope) {
      return;
    }

    tutorialBootstrapRef.current = scope;
    void triggerInitialTutorials();
  }, [triggerInitialTutorials, user?.id]);

  const handleFeedback = async (payload: DailyFeedbackPayload) => {
    try {
      await sendFeedback(payload, resolvedLocale);
      trackEvent('feedback_sent', {
        date: payload.date,
        item_type: payload.itemType,
        item_id: payload.itemId,
        sentiment: payload.sentiment,
        surface: 'daily_transits',
        destination: 'daily_transits',
        result: 'success',
        locale: resolvedLocale,
      });
    } catch (error: any) {
      trackEvent('feedback_sent', {
        date: payload.date,
        item_type: payload.itemType,
        item_id: payload.itemId,
        sentiment: payload.sentiment,
        surface: 'daily_transits',
        destination: 'daily_transits',
        result: 'fail',
        locale: resolvedLocale,
      });
      Alert.alert(t('dailyTransits.feedbackFailedTitle'), error?.message ?? t('dailyTransits.feedbackRetryMsg'));
    }
  };

  const onRetry = () => {
    trackEvent('daily_transits_retry_tapped', {
      date,
      surface: 'daily_transits',
      destination: 'daily_transits',
      locale: resolvedLocale,
    });
    void dailyTransitsQuery.refetch();
  };

  const handlePressTutorialHelp = useCallback(() => {
    void reopenTutorialById(TUTORIAL_IDS.DAILY_TRANSITS_FOUNDATION, 'daily_transits');
  }, [reopenTutorialById]);

  const data = dailyTransitsQuery.data;
  const hasDailyData = Boolean(data);
  const isEmpty = !!data && data.transits.length === 0;
  const actionsRoute = '/(tabs)/today-actions';
  const heroPersonalization = useMemo(
    () => {
      // Avoid derived work until the fetch payload is available.
      if (!hasDailyData) return null;
      return buildHeroPersonalization(user, chart, resolvedLocale);
    },
    [
      hasDailyData,
      user?.id,
      user?.firstName,
      user?.name,
      user?.maritalStatus,
      user?.relationshipStage,
      user?.zodiacSign,
      chart?.calculatedAt,
      chart?.sunSign,
      chart?.moonSign,
      chart?.risingSign,
      resolvedLocale,
    ],
  );
  const heroForRender = useMemo(() => {
    if (!data) return null;
    return {
      ...data.hero,
      moodTag: localizeMoodTag(data.hero.moodTag, resolvedLocale) as DailyTransitsDTO['hero']['moodTag'],
      headline: resolveHeroHeadlineLocalized(data, heroPersonalization, resolvedLocale),
    };
  }, [data?.hero, data?.transits, data?.retrogrades, data?.date, heroPersonalization, resolvedLocale]);

  const processedContent = useMemo(() => {
    if (!data) {
      return {
        todayItems: [] as string[],
        focusItems: [] as string[],
        groupedTransits: [] as TransitThemeGroup[],
      };
    }

    const uniqueTransits = dedupeTransits(data.transits).map((item) => localizeTransitItem(item, resolvedLocale));

    const todayCandidates = splitSentences(data.todayCanDo.body);
    // Avoid intermediate `filter().map()` allocations.
    for (const item of uniqueTransits) {
      if (isSupportiveLabel(item.label)) {
        todayCandidates.push(item.titlePlain);
      }
    }
    const todayItems = dedupeSentences(todayCandidates).slice(0, MAX_TODAY_ITEMS);

    const focusCandidates = data.focusPoints.map((point) => point.text);
    const focusItems = dedupeSentences(focusCandidates, todayItems).slice(0, MAX_FOCUS_ITEMS);

    return {
      todayItems,
      focusItems,
      groupedTransits: groupTransits(uniqueTransits, resolvedLocale),
    };
  }, [data?.transits, data?.todayCanDo.body, data?.focusPoints, resolvedLocale]);

  const hasTransitCards = processedContent.groupedTransits.length > 0;

  const toggleThemeExpanded = useCallback((theme: string) => {
    setExpandedThemes((prev) => ({
      ...prev,
      [theme]: !prev[theme],
    }));
  }, []);

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ backgroundColor: colors.bg }}>
      <TabHeader
        title={data?.title ?? t('homeSurface.dailyTransits.title')}
        subtitle={formatDateLabel(data?.date ?? date, i18n.language)}
        onBack={goBack}
        rightActions={(
          <SpotlightTarget targetKey={DAILY_TRANSITS_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
            <SurfaceHeaderIconButton
              iconName="help-circle-outline"
              onPress={handlePressTutorialHelp}
              accessibilityLabel={t('dailyTransits.tutorialHelpA11y')}
            />
          </SpotlightTarget>
        )}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {dailyTransitsQuery.isLoading ? <LoadingState /> : null}

        {dailyTransitsQuery.isError ? (
          <View style={[styles.statusCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>{t('dailyTransits.errorTitle')}</Text>
            <Text style={[styles.statusBody, { color: colors.subtext }]}>{t('dailyTransits.errorBody')}</Text>
            <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={onRetry}>
              <Text style={styles.retryText}>{t('dailyTransits.retry')}</Text>
            </Pressable>
          </View>
        ) : null}

        {isEmpty || (data != null && !hasTransitCards) ? (
          <View style={[styles.statusCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : '#FFFFFF' }]}>
            <Text style={[styles.statusTitle, { color: colors.text }]}>{t('dailyTransits.emptyTitle')}</Text>
            <Text style={[styles.statusBody, { color: colors.subtext }]}>
              {t('dailyTransits.emptyBody')}
            </Text>
            <Pressable style={[styles.retryBtn, { backgroundColor: colors.primary }]} onPress={onRetry}>
              <Text style={styles.retryText}>{t('dailyTransits.refresh')}</Text>
            </Pressable>
          </View>
        ) : null}

        {data && !isEmpty && hasTransitCards ? (
          <>
            <SpotlightTarget targetKey={DAILY_TRANSITS_TUTORIAL_TARGET_KEYS.HERO_SUMMARY}>
              <HeroCard hero={heroForRender ?? data.hero} />
            </SpotlightTarget>

            <View style={styles.quickRow}>
              {data.quickFacts.map((fact) => (
                <QuickFactChip key={fact.id} item={fact} />
              ))}
            </View>

            <SectionCard title={data.todayCanDo.headline} icon="sunny-outline">
              {processedContent.todayItems.length > 0 ? (
                <View style={styles.todayList}>
                  {processedContent.todayItems.map((item, index) => (
                    <View key={`${item}-${index}`} style={styles.focusRow}>
                      <View style={[styles.focusDot, { backgroundColor: colors.primary }]} />
                      <Text style={[styles.focusText, { color: colors.subtext }]}>{item}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.sectionBody, { color: colors.subtext }]}>{t('dailyTransits.preparingExtra')}</Text>
              )}
              <Pressable
                style={[styles.ctaBtn, { backgroundColor: colors.primary }]}
                onPress={() => router.push(actionsRoute as never)}
              >
                <Text style={styles.ctaText}>{data.todayCanDo.ctaText}</Text>
                <Ionicons name="arrow-forward" size={15} color="#FFF" />
              </Pressable>
            </SectionCard>

            <SpotlightTarget targetKey={DAILY_TRANSITS_TUTORIAL_TARGET_KEYS.IMPACT_ZONES}>
              <SectionCard title={t('dailyTransits.cautionSectionTitle')} icon="flash">
                {processedContent.focusItems.length > 0 ? (
                  <View style={styles.focusList}>
                    {processedContent.focusItems.map((point, index) => (
                      <View key={`${point}-${index}`} style={styles.focusRow}>
                        <View style={[styles.focusDot, { backgroundColor: colors.primary }]} />
                        <Text style={[styles.focusText, { color: colors.subtext }]}>{point}</Text>
                      </View>
                    ))}
                  </View>
                ) : (
                  <Text style={[styles.sectionBody, { color: colors.subtext }]}>{t('dailyTransits.preparingExtra')}</Text>
                )}
              </SectionCard>
            </SpotlightTarget>

            <SectionCard title={t('dailyTransits.retroSectionTitle')} icon="repeat">
              <RetroList items={data.retrogrades} />
            </SectionCard>

            <SpotlightTarget targetKey={DAILY_TRANSITS_TUTORIAL_TARGET_KEYS.TRANSIT_CARDS}>
              <SectionCard title={t('dailyTransits.transitCardsSectionTitle')} icon="planet">
                <View style={styles.transitGroupsWrap}>
                  {processedContent.groupedTransits.map((group) => {
                    const themeKey = normalizeSentence(group.theme);
                    const expanded = Boolean(expandedThemes[themeKey]);
                    const canExpand = group.items.length > MAX_TRANSITS_PER_THEME;
                    const visibleItems =
                      canExpand && !expanded ? group.items.slice(0, MAX_TRANSITS_PER_THEME) : group.items;

                    return (
                      <View key={group.theme} style={styles.themeGroup}>
                        <View style={styles.themeHeaderRow}>
                          <Text style={[styles.themeHeaderText, { color: colors.text }]}>{group.theme}</Text>
                          {canExpand ? (
                            <Pressable
                              onPress={() => toggleThemeExpanded(themeKey)}
                              hitSlop={8}
                              style={styles.themeToggleBtn}
                              accessibilityRole="button"
                              accessibilityLabel={
                                expanded ? t('dailyTransits.collapseThemeA11y', { theme: group.theme }) : t('dailyTransits.expandThemeA11y', { theme: group.theme })
                              }
                            >
                              <Text style={[styles.themeToggleText, { color: colors.primary }]}>
                                {expanded ? t('dailyTransits.showLess') : t('dailyTransits.showAll')}
                              </Text>
                              <Ionicons
                                name={expanded ? 'chevron-up' : 'chevron-down'}
                                size={14}
                                color={colors.primary}
                              />
                            </Pressable>
                          ) : null}
                        </View>

                        <View style={styles.transitList}>
                          {visibleItems.map((item) => (
                            <TransitItemCard
                              key={item.id}
                              transit={item}
                              date={data.date}
                              onDetailOpened={(transitId) =>
                                trackEvent('transit_detail_opened', {
                                  date: data.date,
                                  transit_id: transitId,
                                  surface: 'daily_transits',
                                  destination: 'daily_transits_detail',
                                })}
                              onFeedback={handleFeedback}
                            />
                          ))}
                        </View>
                      </View>
                    );
                  })}

                  {processedContent.groupedTransits.length === 0 ? (
                    <Text style={[styles.sectionBody, { color: colors.subtext }]}>{t('dailyTransits.preparingExtra')}</Text>
                  ) : null}
                </View>
              </SectionCard>
            </SpotlightTarget>
          </>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  headerTitle: {
    ...TYPOGRAPHY.H2,
    fontSize: 22,
    lineHeight: 28,
  },
  headerDate: {
    ...TYPOGRAPHY.Small,
    fontSize: 15,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 120,
    gap: SPACING.md,
  },
  loadingWrap: {
    gap: SPACING.md,
  },
  quickRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  sectionBody: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 22,
  },
  todayList: {
    gap: SPACING.sm,
  },
  ctaBtn: {
    marginTop: SPACING.xsSm,
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.mdLg,
    paddingVertical: SPACING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xsSm,
  },
  ctaText: {
    ...TYPOGRAPHY.SmallBold,
    color: '#FFF',
    fontSize: 14,
  },
  focusList: {
    gap: SPACING.sm,
  },
  focusRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  focusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginTop: 8,
  },
  focusText: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  transitList: {
    gap: SPACING.sm,
  },
  transitGroupsWrap: {
    gap: SPACING.md,
  },
  themeGroup: {
    gap: SPACING.sm,
  },
  themeHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.sm,
  },
  themeHeaderText: {
    ...TYPOGRAPHY.BodyBold,
    fontSize: 17,
    lineHeight: 23,
  },
  themeToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: SPACING.xs,
    gap: SPACING.xs,
  },
  themeToggleText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 12,
  },
  statusCard: {
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  statusTitle: {
    ...TYPOGRAPHY.BodyBold,
    fontSize: 19,
  },
  statusBody: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 22,
  },
  retryBtn: {
    alignSelf: 'flex-start',
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.mdLg,
    paddingVertical: SPACING.sm,
    marginTop: SPACING.xsSm,
  },
  retryText: {
    ...TYPOGRAPHY.SmallBold,
    color: '#FFF',
    fontSize: 14,
  },
});
