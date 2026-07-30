import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { SafeScreen, TabHeader } from '../../components/ui';
import {
  HeroInsightCard,
  PremiumStatusCard,
  SkyDataCard,
  TodayInfluenceLoadingState,
  TodayInfluenceMiniPlanCard,
  TodaySummaryCards,
  TransitCardsSection,
  getTodayInfluenceBackground,
  type InsightStatus,
  type TodayInfluenceViewModel,
  type TransitFilterKey,
  type TransitFilterOption,
} from '../../components/daily';
import { useTheme } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import { queryKeys } from '../../lib/queryKeys';
import { getDailyTransits, getTodayIsoDate, sendFeedback } from '../../services/daily.service';
import type { DailyFeedbackPayload, DailyTransitsDTO } from '../../types/daily.types';
import { getAnalyticsSessionDepth, trackEvent } from '../../services/analytics';
import { useAuthStore } from '../../store/useAuthStore';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { resolveUserScopeKey } from '../../store/userScopedPersist';
import { getZodiacInfo } from '../../constants/zodiac';
import {
  DAILY_TRANSITS_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_SCREEN_KEYS,
  useTutorialTrigger,
} from '../../features/tutorial';
import { useTranslation } from 'react-i18next';
import { useSmartBackNavigation } from '../../hooks/useSmartBackNavigation';
import { ProductEventName, trackProductEvent } from '../../services/productAnalytics';

const SIX_HOURS = 1000 * 60 * 60 * 6;
const ONE_DAY = 1000 * 60 * 60 * 24;
const MAX_TODAY_ITEMS = 2;
const MAX_FOCUS_ITEMS = 3;

type TransitItem = DailyTransitsDTO['transits'][number];
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
    risingSign?: string | null;
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

type ProcessedDailyContent = {
  todayItems: string[];
  focusItems: string[];
  transits: TransitItem[];
};

function ensureSentenceEnd(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) return '';
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function compactText(text: string, maxChars: number): string {
  const value = text.trim().replace(/\s+/g, ' ');
  if (value.length <= maxChars) return value;
  const truncated = value.slice(0, maxChars - 1).trimEnd();
  const lastSpace = truncated.lastIndexOf(' ');
  return `${truncated.slice(0, lastSpace > 40 ? lastSpace : truncated.length).trimEnd()}…`;
}

function compactSentencesFromText(text: string, maxSentences: number, maxChars: number): string {
  const sentences = splitSentences(text).map(ensureSentenceEnd);
  const selected = sentences.length > 0 ? sentences.slice(0, maxSentences).join(' ') : text;
  return compactText(selected, maxChars);
}

function localizedScreenTitle(locale: DailyLocale): string {
  return locale === 'en' ? "Today's Plan" : 'Bugünkü Planın';
}

function fallbackCopy(locale: DailyLocale) {
  return locale === 'en'
    ? {
        heroTitle: 'Move boldly, but with measure',
        heroSummary: 'Balanced energy management works in your favor today. Keep the first step simple and review plans before committing.',
        brave: 'Bold',
        supportiveFlow: 'Supportive Flow',
        retroCheck: 'Retro check',
        clearFlow: 'Clear flow',
        moodLabel: 'Mood',
        moodValue: 'Calm power',
        focusLabel: 'Focus Area',
        focusValue: 'Energy management',
        cautionLabel: 'Watch Point',
        cautionValue: 'Review plans',
        miniPlanTitle: 'Energy-focused mini plan',
        miniPlanItems: [
          'Refresh your energy with a short walk',
          'Use one supportive transit for a simple step',
          'Start a delayed task with a focused 15-minute block',
        ],
        cta: 'How should you move today?',
        retroCalm: 'Calm',
        retroCount: (count: number) => `${count} effect${count === 1 ? '' : 's'}`,
        all: 'All',
        supportive: 'Supportive',
        attention: 'Caution',
        meaningFallback: 'This influence shows where the day asks for a clearer rhythm and a more intentional response.',
        personalFallback: 'Your personal chart can feel this as a small but noticeable shift in daily priorities.',
        helpsAttention: ['Simplify one priority', 'Check details before sending or deciding', 'Use a short pause before reacting'],
        helpsSupportive: ['Use the opening with one small action', 'Keep communication short and clear', 'Let the day support a steady rhythm'],
        avoidAttention: ['Opening too many tasks at once', 'Reacting from the first emotion'],
        avoidSupportive: ['Waiting for perfect conditions', 'Scattering energy across small distractions'],
      }
    : {
        heroTitle: 'Cesur ama ölçülü ilerle',
        heroSummary: 'Enerjini dengeli yönetmek bugün avantaj sağlar. İlk adımı sade tuttuğunda akış hızlanır. Retro etkiler planlarını gözden geçirmeni istiyor.',
        brave: 'Cesur',
        supportiveFlow: 'Destekleyici Akış',
        retroCheck: 'Retro kontrolü',
        clearFlow: 'Net akış',
        moodLabel: 'Ruh Hali',
        moodValue: 'Sakin güç',
        focusLabel: 'Odak Alanı',
        focusValue: 'Enerji yönetimi',
        cautionLabel: 'Dikkat Noktası',
        cautionValue: 'Planları gözden geçir',
        miniPlanTitle: 'Enerji odaklı mini plan',
        miniPlanItems: [
          'Kısa bir yürüyüşle enerjini tazele',
          'Destekleyici bir etkiyi küçük bir adımla kullan',
          'Ertelediğin bir işi 15 dakikalık blokla başlat',
        ],
        cta: 'Bugün nasıl ilerlersin?',
        retroCalm: 'Sakin',
        retroCount: (count: number) => `${count} etki`,
        all: 'Tümü',
        supportive: 'Destekleyici',
        attention: 'Dikkat',
        meaningFallback: 'Bu etki, günün senden daha net bir ritim ve daha bilinçli bir tepki istediğini gösterir.',
        personalFallback: 'Kişisel haritanda bu tema günlük önceliklerinde küçük ama hissedilir bir yön değişimi yaratabilir.',
        helpsAttention: ['Tek önceliği sadeleştir', 'Karar veya mesaj öncesi detay kontrolü yap', 'Tepkiden önce kısa bir duraklama kullan'],
        helpsSupportive: ['Açılan alanı küçük bir adımla değerlendir', 'İletişimi kısa ve net tut', 'Günün ritmini dengeli ilerlet'],
        avoidAttention: ['Aynı anda çok başlık açmak', 'İlk duyguyla ani tepki vermek'],
        avoidSupportive: ['Mükemmel şartları beklemek', 'Enerjiyi küçük dikkat dağınıklıklarına bölmek'],
      };
}

function shortHeroTitle(
  hero: DailyTransitsDTO['hero'],
  primaryTheme: CanonicalTransitTheme,
  locale: DailyLocale,
): string {
  const firstSentence = splitSentences(hero.headline)[0] ?? hero.headline?.trim();
  if (firstSentence && firstSentence.length <= 58 && !hasTrailingEllipsis(firstSentence)) {
    return ensureSentenceEnd(firstSentence).replace(/[.]$/, '');
  }

  const mood = canonicalizeMoodTag(hero.moodTag);
  const byMood: Record<ReturnType<typeof canonicalizeMoodTag>, string> = locale === 'en'
    ? {
        bold: 'Move boldly, but with measure',
        focus: 'Keep one clear focus',
        emotional: 'Slow the feeling, find clarity',
        social: 'Keep connections simple',
        calm: 'Move with calm power',
      }
    : {
        bold: 'Cesur ama ölçülü ilerle',
        focus: 'Net odağını koru',
        emotional: 'Duyguyu yavaşlat, netleş',
        social: 'Bağlarını sade tut',
        calm: 'Sakin güçle ilerle',
      };

  if (mood !== 'calm') return byMood[mood];
  if (primaryTheme === 'energy') return locale === 'en' ? 'Manage your energy gently' : 'Enerjini yumuşak yönet';
  if (primaryTheme === 'communication') return locale === 'en' ? 'Say less, land clearer' : 'Az söyle, net ilerle';
  return byMood.calm;
}

function summaryMoodValue(tag: string, locale: DailyLocale): string {
  const mood = canonicalizeMoodTag(tag);
  const values: Record<ReturnType<typeof canonicalizeMoodTag>, string> = locale === 'en'
    ? {
        bold: 'Measured courage',
        focus: 'Clear focus',
        emotional: 'Soft balance',
        social: 'Open contact',
        calm: 'Calm power',
      }
    : {
        bold: 'Ölçülü cesaret',
        focus: 'Net odak',
        emotional: 'Yumuşak denge',
        social: 'Açık temas',
        calm: 'Sakin güç',
      };
  return values[mood];
}

function focusTitleForTheme(theme: CanonicalTransitTheme, locale: DailyLocale): string {
  const focus = getThemeFocusText(theme, locale);
  return focus.charAt(0).toLocaleUpperCase(locale === 'tr' ? 'tr-TR' : 'en-US') + focus.slice(1);
}

function findQuickFactValue(data: DailyTransitsDTO, variants: string[]): string | undefined {
  const variantTokens = variants.map(normalizeDailyToken);
  const fact = data.quickFacts.find((item) => {
    const token = normalizeDailyToken(`${item.id} ${item.icon} ${item.label}`);
    return variantTokens.some((variant) => token.includes(variant));
  });
  return fact?.value?.trim() || undefined;
}

function buildHeroSummary(
  data: DailyTransitsDTO,
  hero: DailyTransitsDTO['hero'],
  processed: ProcessedDailyContent,
  locale: DailyLocale,
): string {
  const fallback = fallbackCopy(locale).heroSummary;
  const candidates = dedupeSentences([
    ...splitSentences(hero.supporting),
    ...processed.focusItems.slice(0, 1),
    ...splitSentences(data.todayCanDo.body).slice(0, 1),
    ...splitSentences(hero.headline).slice(0, 1),
  ]);
  const summary = candidates.map(ensureSentenceEnd).slice(0, 3).join(' ');
  return compactText(summary || fallback, 280);
}

function resolveHeroIcon(icon: DailyTransitsDTO['hero']['icon']): TodayInfluenceViewModel['hero']['icon'] {
  switch (icon) {
    case 'moon':
      return 'moon';
    case 'venus':
      return 'heart';
    case 'mars':
      return 'flash';
    case 'mercury':
      return 'chatbubble-ellipses';
    case 'jupiter':
    case 'sun':
      return 'sunny';
    case 'saturn':
    default:
      return 'planet';
  }
}

function buildTransitDetails(
  item: TransitItem,
  status: InsightStatus,
  locale: DailyLocale,
): TodayInfluenceViewModel['transits'][number]['details'] {
  const copy = fallbackCopy(locale);
  const technical = item.technical;
  const meaning = compactSentencesFromText(item.impactPlain || copy.meaningFallback, 2, 260);
  const technicalFacts = technical
    ? [
        { label: locale === 'en' ? 'Transit' : 'Transit', value: technical.transitPlanet },
        { label: locale === 'en' ? 'Natal Point' : 'Natal Nokta', value: technical.natalPoint },
        { label: locale === 'en' ? 'Aspect' : 'Açı', value: technical.aspect },
        ...(technical.house ? [{ label: locale === 'en' ? 'House' : 'Ev', value: technical.house }] : []),
      ].filter((fact) => fact.value && fact.value !== '-')
    : [];

  const personalEffect = technical
    ? (
        locale === 'en'
          ? `${technical.transitPlanet} touching ${technical.natalPoint} can make the ${localizeTheme(item.theme, locale).toLowerCase()} area more noticeable today.`
          : `${technical.transitPlanet} - ${technical.natalPoint} teması bugün ${localizeTheme(item.theme, locale).toLocaleLowerCase('tr-TR')} alanını daha görünür hale getirebilir.`
      )
    : copy.personalFallback;

  return {
    meaning,
    helps: status === 'attention' ? copy.helpsAttention : copy.helpsSupportive,
    avoid: status === 'attention' ? copy.avoidAttention : copy.avoidSupportive,
    personalEffect,
    facts: technicalFacts,
  };
}

function mapTransitStatus(item: TransitItem): InsightStatus {
  if (isCautionLabel(item.label)) return 'attention';
  if (isSupportiveLabel(item.label)) return 'supportive';
  if (item.confidence >= 82) return 'intense';
  if (item.confidence <= 38) return 'low';
  return 'neutral';
}

function mapTodayInfluenceResponseToViewModel(
  data: DailyTransitsDTO,
  hero: DailyTransitsDTO['hero'],
  processed: ProcessedDailyContent,
  locale: DailyLocale,
): TodayInfluenceViewModel {
  const copy = fallbackCopy(locale);
  const primaryTheme = resolvePrimaryThemeLocalized(hero, processed.transits);
  const supportiveCount = processed.transits.filter((item) => isSupportiveLabel(item.label)).length;
  const cautionCount = processed.transits.filter((item) => isCautionLabel(item.label)).length;
  const cautionTitle = processed.transits.find((item) => isCautionLabel(item.label))?.titlePlain;
  const retroCount = data.retrogrades.length;
  const moonPhase = findQuickFactValue(data, ['moonPhase', 'moon phase', 'ay fazi']);
  const moonSign = findQuickFactValue(data, ['moonSign', 'zodiac', 'ay burcu']);
  const retroFact = findQuickFactValue(data, ['retro']);

  const miniPlanItems = dedupeSentences([
    ...processed.todayItems,
    processed.transits.find((item) => isSupportiveLabel(item.label))?.titlePlain ?? '',
    ...processed.focusItems,
    ...copy.miniPlanItems,
  ]).slice(0, 3);

  return {
    hero: {
      title: shortHeroTitle(hero, primaryTheme, locale) || copy.heroTitle,
      summary: buildHeroSummary(data, hero, processed, locale),
      score: typeof hero.intensity === 'number' ? hero.intensity : undefined,
      icon: resolveHeroIcon(hero.icon),
      chips: [
        { label: localizeMoodTag(hero.moodTag, locale) || copy.brave, type: 'neutral', icon: 'sparkles' },
        {
          label: supportiveCount >= cautionCount ? copy.supportiveFlow : copy.attention,
          type: supportiveCount >= cautionCount ? 'positive' : 'warning',
          icon: supportiveCount >= cautionCount ? 'leaf-outline' : 'alert-circle-outline',
        },
        {
          label: retroCount > 0 ? copy.retroCheck : copy.clearFlow,
          type: retroCount > 0 ? 'warning' : 'positive',
          icon: retroCount > 0 ? 'repeat' : 'checkmark-circle-outline',
        },
      ],
    },
    summaryCards: [
      {
        label: copy.moodLabel,
        value: summaryMoodValue(hero.moodTag, locale) || copy.moodValue,
        icon: 'moon',
      },
      {
        label: copy.focusLabel,
        value: focusTitleForTheme(primaryTheme, locale) || copy.focusValue,
        icon: 'locate',
      },
      {
        label: copy.cautionLabel,
        value: compactText(processed.focusItems[0] || cautionTitle || copy.cautionValue, 42),
        icon: 'alert-circle',
      },
    ],
    miniPlan: {
      title: data.todayCanDo.headline || copy.miniPlanTitle,
      items: miniPlanItems.length > 0 ? miniPlanItems : copy.miniPlanItems,
      ctaLabel: data.todayCanDo.ctaText || copy.cta,
    },
    skyData: {
      moonPhase,
      moonSign,
      retroLabel: retroCount > 0 ? copy.retroCount(retroCount) : (retroFact || copy.retroCalm),
    },
    transits: processed.transits.map((item) => {
      const status = mapTransitStatus(item);
      return {
        id: item.id,
        category: localizeTheme(item.theme, locale),
        status,
        title: item.titlePlain,
        description: compactSentencesFromText(item.impactPlain, 3, 280),
        timeWindow: item.timeWindow,
        details: buildTransitDetails(item, status, locale),
      };
    }),
  };
}

function buildFilterOptions(viewModel: TodayInfluenceViewModel, locale: DailyLocale): TransitFilterOption[] {
  const categorySet = new Set(viewModel.transits.map((item) => item.category));
  const orderedCategories = [
    ...THEME_SEQUENCE.map((theme) => THEME_METADATA[theme][locale]).filter((theme) => categorySet.has(theme)),
    ...Array.from(categorySet)
      .filter((theme) => !THEME_SEQUENCE.map((item) => THEME_METADATA[item][locale]).includes(theme))
      .sort((a, b) => a.localeCompare(b, locale === 'tr' ? 'tr' : 'en')),
  ];
  const copy = fallbackCopy(locale);

  return [
    { key: 'all', label: copy.all },
    { key: 'supportive', label: copy.supportive, tone: 'supportive' },
    { key: 'attention', label: copy.attention, tone: 'attention' },
    ...orderedCategories.map((category) => ({
      key: `category:${category}` as TransitFilterKey,
      label: category,
    })),
  ];
}

function filterTransits(
  transits: TodayInfluenceViewModel['transits'],
  selectedFilter: TransitFilterKey,
): TodayInfluenceViewModel['transits'] {
  if (selectedFilter === 'supportive') return transits.filter((item) => item.status === 'supportive');
  if (selectedFilter === 'attention') return transits.filter((item) => item.status === 'attention');
  if (selectedFilter.startsWith('category:')) {
    const category = selectedFilter.slice('category:'.length);
    return transits.filter((item) => item.category === category);
  }
  return transits;
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
  const userScopeKey = resolveUserScopeKey(user);
  const { triggerInitial: triggerInitialTutorials } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.DAILY_TRANSITS);
  const chart = useNatalChartStore((state) => state.chart);
  const date = useMemo(() => getTodayIsoDate(), []);
  const viewedEventSentRef = useRef<string | null>(null);
  const errorEventSentRef = useRef<string | null>(null);
  const loadEventSentRef = useRef<string | null>(null);
  const tutorialBootstrapRef = useRef<string | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<TransitFilterKey>('all');

  const dailyTransitsQuery = useQuery({
    queryKey: queryKeys.dailyTransits(date, resolvedLocale, userScopeKey),
    queryFn: () => getDailyTransits(date, resolvedLocale, userScopeKey),
    enabled: Boolean(user?.id),
    staleTime: SIX_HOURS,
    gcTime: ONE_DAY,
  });

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
    trackEvent('astrology_context_opened', {
      date: dailyTransitsQuery.data.date,
      source: 'daily_plan',
      surface: 'daily_transits',
      locale: resolvedLocale,
    });
    trackProductEvent(ProductEventName.GUIDANCE_VIEWED, {
      'guidance type': 'daily_transits',
      'guidance date': dailyTransitsQuery.data.date,
      'is personalized': true,
      'source surface': 'daily_transits',
      'session depth': getAnalyticsSessionDepth(),
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

  useFocusEffect(
    useCallback(() => {
      const scope = user?.id ? String(user.id) : null;
      if (!scope) {
        tutorialBootstrapRef.current = null;
        return;
      }
      if (tutorialBootstrapRef.current === scope) {
        return;
      }
      tutorialBootstrapRef.current = scope;
      triggerInitialTutorials().then(() => {
        tutorialBootstrapRef.current = null;
      });
    }, [triggerInitialTutorials, user?.id]),
  );

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
      throw error;
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
        transits: [] as TransitItem[],
      };
    }

    const uniqueTransits = dedupeTransits(data.transits)
      .map((item) => localizeTransitItem(item, resolvedLocale))
      .sort(compareTransitItems);

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
      transits: uniqueTransits,
    };
  }, [data?.transits, data?.todayCanDo.body, data?.focusPoints, resolvedLocale]);

  const todayInfluenceViewModel = useMemo(() => {
    if (!data || !heroForRender) return null;
    return mapTodayInfluenceResponseToViewModel(data, heroForRender, processedContent, resolvedLocale);
  }, [data, heroForRender, processedContent, resolvedLocale]);

  const filterOptions = useMemo(
    () => (todayInfluenceViewModel ? buildFilterOptions(todayInfluenceViewModel, resolvedLocale) : []),
    [resolvedLocale, todayInfluenceViewModel],
  );

  useEffect(() => {
    if (selectedFilter === 'all') return;
    if (!filterOptions.some((option) => option.key === selectedFilter)) {
      setSelectedFilter('all');
    }
  }, [filterOptions, selectedFilter]);

  const filteredTransits = useMemo(
    () => todayInfluenceViewModel ? filterTransits(todayInfluenceViewModel.transits, selectedFilter) : [],
    [selectedFilter, todayInfluenceViewModel],
  );

  const hasTransitCards = (todayInfluenceViewModel?.transits.length ?? 0) > 0;
  const screenBackground = getTodayInfluenceBackground(colors, isDark);

  return (
    <SafeScreen
      edges={['top', 'left', 'right']}
      style={{ backgroundColor: screenBackground }}
      showStandardBackground={false}
    >
      <TabHeader
        title={localizedScreenTitle(resolvedLocale)}
        subtitle={formatDateLabel(data?.date ?? date, i18n.language)}
        onBack={goBack}
      />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {dailyTransitsQuery.isLoading ? <TodayInfluenceLoadingState /> : null}

        {dailyTransitsQuery.isError ? (
          <PremiumStatusCard
            icon="cloud-offline-outline"
            title={resolvedLocale === 'en' ? "Today's influences could not load" : 'Bugünün etkileri yüklenemedi'}
            body={resolvedLocale === 'en' ? 'You can try again shortly.' : 'Kısa süre sonra tekrar deneyebilirsin.'}
            buttonLabel={t('dailyTransits.retry')}
            onPress={onRetry}
          />
        ) : null}

        {isEmpty || (data != null && !hasTransitCards) ? (
          <PremiumStatusCard
            icon="moon-outline"
            title={resolvedLocale === 'en' ? 'No transits found for today' : 'Bugün için transit bulunamadı'}
            body={
              resolvedLocale === 'en'
                ? "The day's energy will appear here when it is ready."
                : 'Günün enerjisi hazır olduğunda burada görünecek.'
            }
            buttonLabel={t('dailyTransits.refresh')}
            onPress={onRetry}
          />
        ) : null}

        {data && todayInfluenceViewModel && !isEmpty && hasTransitCards ? (
          <>
            <View
              style={[
                styles.guidanceNotice,
                {
                  backgroundColor: colors.primarySoftBg,
                  borderColor: colors.border,
                },
              ]}
              accessibilityRole="summary"
            >
              <Text style={[styles.guidanceNoticeTitle, { color: colors.text }]}>
                {t('dailyTransits.planningNoticeTitle')}
              </Text>
              <Text style={[styles.guidanceNoticeBody, { color: colors.subtext }]}>
                {t('dailyTransits.planningNoticeBody')}
              </Text>
            </View>

            <SpotlightTarget targetKey={DAILY_TRANSITS_TUTORIAL_TARGET_KEYS.HERO_SUMMARY}>
              <HeroInsightCard hero={todayInfluenceViewModel.hero} />
            </SpotlightTarget>

            <TodaySummaryCards items={todayInfluenceViewModel.summaryCards} />

            <SpotlightTarget targetKey={DAILY_TRANSITS_TUTORIAL_TARGET_KEYS.IMPACT_ZONES}>
              <TodayInfluenceMiniPlanCard
                plan={todayInfluenceViewModel.miniPlan}
                onPressCta={() => router.push(actionsRoute as never)}
              />
            </SpotlightTarget>

            <SkyDataCard skyData={todayInfluenceViewModel.skyData} />

            <SpotlightTarget targetKey={DAILY_TRANSITS_TUTORIAL_TARGET_KEYS.TRANSIT_CARDS}>
              <TransitCardsSection
                transits={filteredTransits}
                filters={filterOptions}
                selectedFilter={selectedFilter}
                onSelectFilter={setSelectedFilter}
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
            </SpotlightTarget>
          </>
        ) : null}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: 132,
    gap: SPACING.md,
  },
  guidanceNotice: {
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.xs,
  },
  guidanceNoticeTitle: {
    ...TYPOGRAPHY.BodyBold,
  },
  guidanceNoticeBody: {
    ...TYPOGRAPHY.Caption,
    lineHeight: 19,
  },
});
