import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { ChevronDown, ChevronUp, Heart, Info, Lightbulb, Sparkles } from 'lucide-react-native';
import { AccessibleText } from './ui';
import { ACCESSIBILITY, RADIUS, SPACING, TYPOGRAPHY } from '../constants/tokens';
import { useTheme } from '../context/ThemeContext';
import type {
  CompatibilityDimension,
  CompatibilityDimensionPerson,
  CompatibilityStatus,
  ComparisonCardDTO,
  Label,
  RelationshipType,
  ThemeGroup,
} from '../types/compare';

interface ComparisonCardProps {
  card: ComparisonCardDTO;
}

type StatusColors = {
  bg: string;
  border: string;
  text: string;
  soft: string;
  accent: string;
};

const STATUS_LABELS: Record<CompatibilityStatus, string> = {
  challenging: 'Zorlayıcı',
  attention: 'Dikkat',
  balanced: 'Dengelenebilir',
  compatible: 'Uyumlu',
  strong: 'Çok Güçlü',
};

function normalizeSearch(value: string | null | undefined): string {
  return String(value ?? '')
    .toLocaleLowerCase('tr-TR')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9çğıöşü\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function clampScore(score?: number | null): number | null {
  if (score == null || !Number.isFinite(score)) return null;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function normalizeRatio(value?: number | null): number | null {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getCompatibilityStatus(score?: number | null): CompatibilityStatus {
  const safeScore = clampScore(score);
  if (safeScore == null) return 'balanced';
  if (safeScore < 40) return 'challenging';
  if (safeScore < 60) return 'attention';
  if (safeScore < 75) return 'balanced';
  if (safeScore < 90) return 'compatible';
  return 'strong';
}

function getCompatibilityStatusLabel(status: CompatibilityStatus): string {
  return STATUS_LABELS[status];
}

function statusFromLabel(label?: Label): CompatibilityStatus {
  if (label === 'Dikkat') return 'attention';
  if (label === 'Uyumlu') return 'compatible';
  return 'balanced';
}

function resolveCompatibilityStatus(
  status: CompatibilityStatus | null | undefined,
  score: number | null,
  label?: Label,
): CompatibilityStatus {
  if (status) return status;
  if (score != null) return getCompatibilityStatus(score);
  return statusFromLabel(label);
}

function getCompatibilityStatusColors(
  status: CompatibilityStatus,
  colors: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
): StatusColors {
  if (status === 'challenging') {
    return {
      bg: isDark ? 'rgba(244, 63, 94, 0.16)' : colors.redBg,
      border: isDark ? 'rgba(251, 113, 133, 0.34)' : '#F7B7C2',
      text: isDark ? '#FDA4AF' : colors.redDark,
      soft: isDark ? 'rgba(244, 63, 94, 0.1)' : '#FFF3F6',
      accent: isDark ? '#FB7185' : colors.redDark,
    };
  }

  if (status === 'attention') {
    return {
      bg: isDark ? 'rgba(251, 146, 60, 0.16)' : colors.warningBg,
      border: isDark ? 'rgba(251, 191, 36, 0.34)' : '#F8D49A',
      text: isDark ? '#FDBA74' : colors.warningDark,
      soft: isDark ? 'rgba(251, 146, 60, 0.1)' : '#FFF8EA',
      accent: isDark ? '#FDBA74' : colors.orange,
    };
  }

  if (status === 'balanced') {
    return {
      bg: isDark ? colors.primarySoftBg : colors.violetBg,
      border: isDark ? colors.surfaceGlassBorder : '#DCCBFF',
      text: isDark ? colors.primaryLight : colors.violetText,
      soft: isDark ? 'rgba(124, 58, 237, 0.12)' : '#F7F1FF',
      accent: isDark ? colors.primaryLight : colors.violet,
    };
  }

  if (status === 'strong') {
    return {
      bg: isDark ? 'rgba(124, 58, 237, 0.2)' : '#F1E9FF',
      border: isDark ? 'rgba(167, 139, 250, 0.38)' : '#CDB8FF',
      text: isDark ? '#DDD6FE' : colors.primary700,
      soft: isDark ? 'rgba(124, 58, 237, 0.14)' : '#F8F4FF',
      accent: isDark ? '#C4B5FD' : colors.primary,
    };
  }

  return {
    bg: isDark ? 'rgba(34, 197, 94, 0.16)' : colors.successBg,
    border: isDark ? 'rgba(74, 222, 128, 0.34)' : '#B7E7C8',
    text: isDark ? '#BBF7D0' : colors.success,
    soft: isDark ? 'rgba(34, 197, 94, 0.1)' : '#F3FCF6',
    accent: isDark ? '#86EFAC' : colors.success,
  };
}

function safeName(name: string | null | undefined, fallback: string): string {
  const normalized = String(name ?? '').trim();
  return normalized || fallback;
}

export function getInitial(name?: string): string {
  const normalized = safeName(name, '').trim();
  if (!normalized) return '•';
  const parts = normalized.split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? parts[parts.length - 1]?.[0] ?? '' : '';
  return `${first}${last}`.toLocaleUpperCase('tr-TR') || '•';
}

function compactText(value: string | null | undefined, fallback: string, maxLen = 180): string {
  const normalized = String(value ?? '').trim().replace(/\s+/g, ' ');
  const source = normalized || fallback;
  if (source.length <= maxLen) return source;
  return `${source.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

function splitSentences(value: string | null | undefined): string[] {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .match(/[^.!?]+[.!?]?/g)
    ?.map((sentence) => sentence.trim())
    .filter(Boolean) ?? [];
}

function removePersonPrefix(value: string | null | undefined, name: string): string {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return String(value ?? '')
    .replace(new RegExp(`^${escaped}\\s*:\\s*`, 'i'), '')
    .replace(/^[^:]{1,32}:\s*/, '')
    .trim();
}

function themeMatches(themeGroup: ThemeGroup, title: string, pattern: RegExp): boolean {
  return pattern.test(normalizeSearch(`${themeGroup} ${title}`));
}

function roleTemplate(
  relationshipType: RelationshipType,
  themeGroup: ThemeGroup,
  title: string,
  side: 'A' | 'B',
): { need: string; challenge: string } | null {
  if (relationshipType === 'love') {
    if (themeMatches(themeGroup, title, /duygusal bag|sevgi dili|sefkat/)) {
      return side === 'A'
        ? { need: 'Netlik ve düzenli temas', challenge: 'Belirsizlikte daha çok çabalayabilir' }
        : { need: 'Güvenli alan ve zaman', challenge: 'Baskı hissettiğinde geri çekilebilir' };
    }

    if (themeMatches(themeGroup, title, /guven|baglilik/)) {
      return side === 'A'
        ? { need: 'Söz ve davranış tutarlılığı', challenge: 'Söylenenle yapılan farklı olduğunda güveni azalabilir' }
        : { need: 'Duygusal sıcaklık', challenge: 'Mesafe arttığında güven kurmakta zorlanabilir' };
    }

    if (themeMatches(themeGroup, title, /iletisim|konus|soz/)) {
      return side === 'A'
        ? { need: 'Daha sık ve net temas', challenge: 'İletişim azaldığında ilgiyi sorgulayabilir' }
        : { need: 'Alanı korunarak yakınlaşmak', challenge: 'Baskı hissettiğinde konuşmayı erteleyebilir' };
    }

    if (themeMatches(themeGroup, title, /yakinlik|ritim|tempo|alan/)) {
      return side === 'A'
        ? { need: 'Düzenli yakınlık', challenge: 'Temas azaldığında geri planda kalmış hissedebilir' }
        : { need: 'Kişisel alan ve kontrollü yakınlaşma', challenge: 'Yoğun talep geldiğinde geri çekilebilir' };
    }

    if (themeMatches(themeGroup, title, /tutku|cekim|romantik/)) {
      return side === 'A'
        ? { need: 'Görünür ilgi ve sıcaklık', challenge: 'Kıvılcım zayıfladığında mesafe hissedebilir' }
        : { need: 'Akış içinde büyüyen yakınlık', challenge: 'Acele edildiğinde duygusunu kapatabilir' };
    }

    if (themeMatches(themeGroup, title, /onarim|kirginlik/)) {
      return side === 'A'
        ? { need: 'Hızlı toparlanma ve açıklık', challenge: 'Konu uzadığında huzursuz olabilir' }
        : { need: 'Sakinleşmek için zaman', challenge: 'Hazır olmadan konuşunca kapanabilir' };
    }
  }

  if (relationshipType === 'work') {
    return side === 'A'
      ? { need: 'Net rol ve zamanlama', challenge: 'Belirsiz sorumlulukta yükü üstlenebilir' }
      : { need: 'Esnek alan ve güven', challenge: 'Aşırı takip edildiğinde verimi düşebilir' };
  }

  if (relationshipType === 'friend') {
    return side === 'A'
      ? { need: 'Görünür temas ve sahiplenme', challenge: 'Sessizlik uzadığında değeri sorgulayabilir' }
      : { need: 'Rahat ritim ve alan', challenge: 'Sık beklenti geldiğinde uzaklaşabilir' };
  }

  if (relationshipType === 'family') {
    return side === 'A'
      ? { need: 'Duygunun ve yükün görünür olması', challenge: 'Emek fark edilmediğinde içine atabilir' }
      : { need: 'Sınırına saygı duyulan destek', challenge: 'Fazla müdahalede kendini kapatabilir' };
  }

  return side === 'A'
    ? { need: 'Net kural ve erken hamle alanı', challenge: 'Belirsizlikte baskıyı artırabilir' }
    : { need: 'Kontrol ve doğru zamanlama', challenge: 'Acele baskısında geri çekilebilir' };
}

function inferNeedFromTrait(trait: string | null | undefined, name: string, fallback: string): string {
  const cleanTrait = removePersonPrefix(trait, name);
  return compactText(cleanTrait, fallback, 72).replace(/[.!?]$/, '');
}

function inferHeadline(card: ComparisonCardDTO, score: number | null): string {
  const status = getCompatibilityStatus(score);

  if (card.relationshipType === 'love') {
    if (themeMatches(card.themeGroup, card.title, /duygusal bag|yakinlik/)) return 'Yakınlığı kurma hızınız farklı.';
    if (themeMatches(card.themeGroup, card.title, /guven|baglilik/)) {
      return status === 'compatible' || status === 'strong'
        ? 'Güven alanında güçlü bir uyum var.'
        : 'Güven ihtiyacınız farklı biçimlerde çalışıyor.';
    }
    if (themeMatches(card.themeGroup, card.title, /iletisim|konus/)) {
      return status === 'compatible' || status === 'strong'
        ? 'İletişim ritminiz genel olarak uyumlu.'
        : 'Konuşma ve alan ihtiyacınız farklı hızda çalışıyor.';
    }
  }

  const [firstSentence] = splitSentences(card.intersection?.plain);
  return compactText(firstSentence, `${card.title} alanındaki ana ritim görünürleşiyor.`, 92);
}

function inferSummary(card: ComparisonCardDTO, leftName: string, rightName: string): string {
  if (card.relationshipType === 'love') {
    if (themeMatches(card.themeGroup, card.title, /duygusal bag|yakinlik/)) {
      return `${leftName} daha net ve düzenli temasla rahat ederken, ${rightName} açılmadan önce güvenli alan arıyor.`;
    }
    if (themeMatches(card.themeGroup, card.title, /guven|baglilik/)) {
      return `${leftName} söz ve davranış tutarlılığı ararken, ${rightName} duygusal sıcaklık sürdüğünde daha kolay güveniyor.`;
    }
    if (themeMatches(card.themeGroup, card.title, /iletisim|konus/)) {
      return 'İlgi gösterme biçiminiz ve güven ihtiyacınız birbirini destekliyor.';
    }
  }

  const sentences = splitSentences(card.intersection?.plain);
  const summary = sentences.slice(0, 2).join(' ');
  return compactText(summary, 'Bu başlıkta iki kişinin ihtiyaç ritmi birlikte değerlendiriliyor.', 180);
}

function inferRisk(card: ComparisonCardDTO): string | undefined {
  if (card.relationshipType === 'love') {
    if (themeMatches(card.themeGroup, card.title, /duygusal bag|yakinlik/)) {
      return 'Bu fark bazen bir tarafın daha çok çabaladığı, diğer tarafın ise geri çekildiği hissini oluşturabilir.';
    }
    if (themeMatches(card.themeGroup, card.title, /guven|baglilik/)) {
      return 'Biri güveni davranışla, diğeri duygusal yakınlıkla ölçtüğü için aynı ilişki iki tarafa farklı görünebilir.';
    }
    if (themeMatches(card.themeGroup, card.title, /iletisim|konus/)) {
      return 'Alan ihtiyacı korunmazsa iyi giden iletişim zaman zaman baskı gibi algılanabilir.';
    }
  }

  const sentences = splitSentences(card.intersection?.plain);
  return sentences[1] ? compactText(sentences[1], '', 150) : undefined;
}

function inferAdvice(card: ComparisonCardDTO): string {
  if (card.relationshipType === 'love') {
    if (themeMatches(card.themeGroup, card.title, /duygusal bag|yakinlik/)) {
      return 'Yakınlaşmayı tahmine bırakmayın. Küçük ama düzenli temas ritmi kurun.';
    }
    if (themeMatches(card.themeGroup, card.title, /guven|baglilik/)) {
      return 'Küçük ama görünür güven işaretleri oluşturun. Verdiğiniz sözleri davranışla destekleyin.';
    }
    if (themeMatches(card.themeGroup, card.title, /iletisim|konus/)) {
      return 'Kısa, net ve düzenli temas kurun. Yakınlığı korurken kişisel alanı da ihmal etmeyin.';
    }
  }

  const sentences = splitSentences(card.advicePlain);
  return compactText(sentences.slice(0, 2).join(' '), 'Bu alanda daha dengeli ilerlemek için küçük ve düzenli adımlar atın.', 170);
}

function inferBalanceLabel(card: ComparisonCardDTO): string {
  if (card.relationshipType === 'love') {
    if (themeMatches(card.themeGroup, card.title, /duygusal bag|yakinlik/)) return 'Yakınlık ihtiyacı dengesi';
    if (themeMatches(card.themeGroup, card.title, /guven|baglilik/)) return 'Güven kurma dengesi';
    if (themeMatches(card.themeGroup, card.title, /iletisim|konus/)) return 'İletişim ritmi dengesi';
    if (themeMatches(card.themeGroup, card.title, /tutku|cekim/)) return 'Yakınlaşma temposu dengesi';
  }

  if (card.relationshipType === 'work') return 'İş ritmi dengesi';
  if (card.relationshipType === 'friend') return 'Temas ritmi dengesi';
  if (card.relationshipType === 'family') return 'Aile içi denge';
  if (card.relationshipType === 'rival') return 'Rekabet ritmi dengesi';
  return `${card.title} dengesi`;
}

function inferBalanceSummary(card: ComparisonCardDTO, leftName: string, rightName: string): string {
  if (card.relationshipType === 'love') {
    if (themeMatches(card.themeGroup, card.title, /duygusal bag|yakinlik/)) {
      return `${leftName} teması biraz daha sık isterken, ${rightName} yakınlaşmayı daha kontrollü kuruyor.`;
    }
    if (themeMatches(card.themeGroup, card.title, /guven|baglilik/)) {
      return `${leftName} güveni tutarlılıkla ölçerken, ${rightName} duygusal sıcaklık sürdüğünde daha rahatlıyor.`;
    }
    if (themeMatches(card.themeGroup, card.title, /iletisim|konus/)) {
      return `${leftName} daha görünür temas ararken, ${rightName} alanı korunduğunda iletişime daha kolay geliyor.`;
    }
  }

  return `${leftName} ve ${rightName} bu başlıkta farklı ihtiyaç ritimlerini birlikte dengelemeye çalışıyor.`;
}

function getBalanceValues(card: ComparisonCardDTO): { left: number | null; right: number | null } {
  const rawLeft = normalizeRatio(card.leftValue);
  const rawRight = normalizeRatio(card.rightValue);
  if (rawLeft == null && rawRight == null) return { left: null, right: null };

  const left = rawLeft ?? (rawRight == null ? null : 100 - rawRight);
  const right = rawRight ?? (left == null ? null : 100 - left);
  if (left == null || right == null) return { left: null, right: null };

  const total = left + right;
  if (total <= 0) return { left: 50, right: 50 };

  return {
    left: Math.round((left / total) * 100),
    right: Math.round((right / total) * 100),
  };
}

export function mapCompatibilityDimension(raw: ComparisonCardDTO): CompatibilityDimension {
  const score = clampScore(raw.score);
  const status = resolveCompatibilityStatus(raw.status, score, raw.label);
  const leftName = safeName(raw.leftPerson?.name, 'Sen');
  const rightName = safeName(raw.rightPerson?.name, 'Partner');
  const balanceValues = getBalanceValues(raw);
  const leftTemplate = roleTemplate(raw.relationshipType, raw.themeGroup, raw.title, 'A');
  const rightTemplate = roleTemplate(raw.relationshipType, raw.themeGroup, raw.title, 'B');
  const risk = inferRisk(raw);
  const advice = inferAdvice(raw);
  const sourceSentences = splitSentences(raw.intersection?.plain);

  const personA: CompatibilityDimensionPerson = {
    name: leftName,
    initial: getInitial(leftName),
    need: leftTemplate?.need ?? inferNeedFromTrait(raw.leftPerson?.trait, leftName, 'Netlik ve düzenli temas'),
    challenge: leftTemplate?.challenge,
    ratio: balanceValues.left,
  };

  const personB: CompatibilityDimensionPerson = {
    name: rightName,
    initial: getInitial(rightName),
    need: rightTemplate?.need ?? inferNeedFromTrait(raw.rightPerson?.trait, rightName, 'Güvenli alan ve zaman'),
    challenge: rightTemplate?.challenge,
    ratio: balanceValues.right,
  };

  return {
    id: raw.id,
    title: compactText(raw.title, 'Uyum Başlığı', 64),
    score,
    status,
    headline: inferHeadline(raw, score),
    summary: inferSummary(raw, leftName, rightName),
    personA,
    personB,
    balanceLabel: inferBalanceLabel(raw),
    balanceSummary: inferBalanceSummary(raw, leftName, rightName),
    risk,
    advice,
    detail: sourceSentences.length > 1 || risk
      ? {
          why: compactText(sourceSentences[0], 'Bu başlık iki kişinin ihtiyaç ritmini birlikte okur.', 180),
          tension: risk ?? compactText(sourceSentences[1], '', 160),
          balance: advice,
        }
      : undefined,
  };
}

function statusReason(status: CompatibilityStatus): string {
  if (status === 'challenging') return 'Bu alanda ritim farkı ilişkiyi yorabilir.';
  if (status === 'attention') return 'İhtiyaç ritminizde fark var.';
  if (status === 'balanced') return 'Fark görünür ama dengelenebilir.';
  if (status === 'strong') return 'Bu başlık ilişkinin güçlü taraflarından biri.';
  return 'İhtiyaçlar büyük ölçüde birbirini tamamlıyor.';
}

function CompatibilityStatusBadge({
  status,
  colors: statusColors,
}: {
  status: CompatibilityStatus;
  colors: StatusColors;
}) {
  return (
    <View style={[styles.badge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
      <AccessibleText
        style={[styles.badgeText, { color: statusColors.text }]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {getCompatibilityStatusLabel(status)}
      </AccessibleText>
    </View>
  );
}

function PersonNeedCard({
  person,
  statusColors,
}: {
  person: CompatibilityDimensionPerson;
  statusColors: StatusColors;
}) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.personPanel,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? colors.surfaceGlassBorder : '#ECE6F4',
        },
      ]}
    >
      <View style={styles.personHeader}>
        <View style={[styles.initialBubble, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
          <AccessibleText
            style={[styles.initialText, { color: statusColors.text }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {person.initial ?? getInitial(person.name)}
          </AccessibleText>
        </View>
        <AccessibleText
          style={[styles.personName, { color: colors.text }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={2}
        >
          {person.name}
        </AccessibleText>
      </View>

      <View style={styles.needBlock}>
        <AccessibleText
          style={[styles.microLabel, { color: statusColors.accent }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          İhtiyacı
        </AccessibleText>
        <AccessibleText
          style={[styles.needText, { color: colors.text }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {person.need}
        </AccessibleText>
      </View>

      {person.challenge ? (
        <View style={styles.needBlock}>
          <AccessibleText
            style={[styles.microLabel, styles.challengeLabel, { color: isDark ? '#FDA4AF' : '#BE123C' }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            Zorlandığı yer
          </AccessibleText>
          <AccessibleText
            style={[styles.challengeText, { color: colors.textSoft }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {person.challenge}
          </AccessibleText>
        </View>
      ) : null}
    </View>
  );
}

function BalanceMeter({
  dimension,
  statusColors,
}: {
  dimension: CompatibilityDimension;
  statusColors: StatusColors;
}) {
  const { colors, isDark } = useTheme();
  const leftValue = normalizeRatio(dimension.personA.ratio);
  const rightValue = normalizeRatio(dimension.personB.ratio);
  if (leftValue == null || rightValue == null) return null;

  return (
    <View
      style={[
        styles.balancePanel,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? colors.surfaceGlassBorder : '#ECE6F4',
        },
      ]}
    >
      <View style={styles.balanceTitleRow}>
        <AccessibleText
          style={[styles.balanceTitle, { color: colors.text }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {dimension.balanceLabel}
        </AccessibleText>
        <Info size={15} color={statusColors.accent} />
      </View>

      <View style={styles.balanceLabels}>
        <AccessibleText
          style={[styles.balanceLabelText, { color: statusColors.accent }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={1}
        >
          {dimension.personA.name} %{leftValue}
        </AccessibleText>
        <AccessibleText
          style={[styles.balanceLabelText, { color: statusColors.accent }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          numberOfLines={1}
        >
          {dimension.personB.name} %{rightValue}
        </AccessibleText>
      </View>

      <View style={[styles.balanceTrack, { backgroundColor: isDark ? colors.surfaceAlt : '#EFE8FF' }]}>
        <View style={[styles.balanceFillLeft, { flex: Math.max(leftValue, 1), backgroundColor: statusColors.accent }]} />
        <View style={[styles.balanceFillRight, { flex: Math.max(rightValue, 1), backgroundColor: statusColors.bg }]} />
      </View>

      <AccessibleText
        style={[styles.balanceSummary, { color: colors.body }]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {dimension.balanceSummary}
      </AccessibleText>
    </View>
  );
}

function AdviceBox({ advice, statusColors }: { advice: string; statusColors: StatusColors }) {
  const { colors } = useTheme();

  return (
    <View style={[styles.adviceBox, { backgroundColor: statusColors.soft, borderColor: statusColors.border }]}>
      <View style={[styles.adviceIcon, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
        <Lightbulb size={16} color={statusColors.text} />
      </View>
      <View style={styles.adviceCopy}>
        <AccessibleText
          style={[styles.adviceTitle, { color: statusColors.text }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          Bugün deneyin
        </AccessibleText>
        <AccessibleText
          style={[styles.adviceText, { color: colors.body }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {advice}
        </AccessibleText>
      </View>
    </View>
  );
}

function ExpandableDetail({
  detail,
  isOpen,
  onToggle,
  statusColors,
}: {
  detail: CompatibilityDimension['detail'];
  isOpen: boolean;
  onToggle: () => void;
  statusColors: StatusColors;
}) {
  const { colors, isDark } = useTheme();

  if (!detail?.why && !detail?.tension && !detail?.balance) return null;

  return (
    <View style={[styles.detailWrap, { borderTopColor: isDark ? colors.surfaceGlassBorder : '#EFEAF6' }]}>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        style={styles.detailToggle}
      >
        <AccessibleText
          style={[styles.detailToggleText, { color: statusColors.accent }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {isOpen ? 'Detayı gizle' : 'Detayı gör'}
        </AccessibleText>
        {isOpen ? <ChevronUp size={17} color={statusColors.accent} /> : <ChevronDown size={17} color={statusColors.accent} />}
      </Pressable>

      {isOpen ? (
        <View
          style={[
            styles.detailPanel,
            {
              backgroundColor: isDark ? colors.surfaceAlt : '#FBFAFF',
              borderColor: isDark ? colors.surfaceGlassBorder : '#ECE6F4',
            },
          ]}
        >
          {detail.why ? <DetailRow title="Neden böyle?" body={detail.why} /> : null}
          {detail.tension ? <DetailRow title="Nerede zorlanabilir?" body={detail.tension} /> : null}
          {detail.balance ? <DetailRow title="Nasıl dengelenir?" body={detail.balance} /> : null}
        </View>
      ) : null}
    </View>
  );
}

function DetailRow({ title, body }: { title: string; body: string }) {
  const { colors, isDark } = useTheme();

  return (
    <View style={[styles.detailRow, { borderBottomColor: isDark ? colors.surfaceGlassBorder : '#EFEAF6' }]}>
      <AccessibleText
        style={[styles.detailTitle, { color: colors.text }]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {title}
      </AccessibleText>
      <AccessibleText
        style={[styles.detailBody, { color: colors.body }]}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {body}
      </AccessibleText>
    </View>
  );
}

function CompatibilityDimensionCard({ dimension }: { dimension: CompatibilityDimension }) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const [isDetailOpen, setDetailOpen] = useState(false);
  const status = dimension.status ?? getCompatibilityStatus(dimension.score);
  const statusColors = getCompatibilityStatusColors(status, colors, isDark);
  const isCompact = width < 390;
  const scoreText = dimension.score == null ? '--' : `%${dimension.score}`;

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: isDark ? colors.surfaceGlassBorder : '#E9E4F3',
          shadowColor: isDark ? '#000000' : '#1F0F3D',
          shadowOpacity: isDark ? 0.22 : 0.08,
        },
      ]}
    >
      <View style={styles.headerRow}>
        <View style={styles.titleCluster}>
          <View style={styles.titleLine}>
            <View style={[styles.titleIcon, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
              <Heart size={17} color={statusColors.text} />
            </View>
            <AccessibleText
              style={[styles.cardTitle, { color: colors.text }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {dimension.title}
            </AccessibleText>
          </View>

          <View style={styles.statusRow}>
            <CompatibilityStatusBadge status={status} colors={statusColors} />
            <AccessibleText
              style={[styles.statusReason, { color: colors.textSoft }]}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {statusReason(status)}
            </AccessibleText>
          </View>
        </View>

        <AccessibleText
          style={[styles.scoreText, { color: statusColors.accent }]}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {scoreText}
        </AccessibleText>
      </View>

      <View style={[styles.insightPanel, { backgroundColor: statusColors.soft, borderColor: statusColors.border }]}>
        <Sparkles size={17} color={statusColors.accent} />
        <View style={styles.insightCopy}>
          <AccessibleText
            style={[styles.headline, { color: colors.text }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {dimension.headline}
          </AccessibleText>
          <AccessibleText
            style={[styles.summary, { color: colors.body }]}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {dimension.summary}
          </AccessibleText>
        </View>
      </View>

      <View style={[styles.personPanels, isCompact ? styles.personPanelsStack : null]}>
        <PersonNeedCard person={dimension.personA} statusColors={statusColors} />
        <PersonNeedCard person={dimension.personB} statusColors={statusColors} />
      </View>

      <BalanceMeter dimension={dimension} statusColors={statusColors} />

      <AdviceBox advice={dimension.advice} statusColors={statusColors} />

      <ExpandableDetail
        detail={dimension.detail}
        isOpen={isDetailOpen}
        onToggle={() => setDetailOpen((current) => !current)}
        statusColors={statusColors}
      />
    </View>
  );
}

export default function ComparisonCard({ card }: ComparisonCardProps) {
  const dimension = useMemo(() => mapCompatibilityDimension(card), [card]);
  return <CompatibilityDimensionCard dimension={dimension} />;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: '#E9E4F3',
    padding: SPACING.lg,
    shadowColor: '#1F0F3D',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 4,
    gap: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  titleCluster: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.sm,
  },
  titleLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.smMd,
    minWidth: 0,
  },
  titleIcon: {
    width: 38,
    height: 38,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    ...TYPOGRAPHY.BodyLarge,
    color: '#1C181F',
    flex: 1,
    flexShrink: 1,
  },
  scoreText: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '900',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  badge: {
    minHeight: 28,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.smMd,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    ...TYPOGRAPHY.CaptionBold,
    fontWeight: '800',
  },
  statusReason: {
    ...TYPOGRAPHY.Caption,
    color: '#6F6B7A',
    flexShrink: 1,
  },
  insightPanel: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.smMd,
  },
  insightCopy: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  headline: {
    ...TYPOGRAPHY.SmallBold,
    color: '#1C181F',
  },
  summary: {
    ...TYPOGRAPHY.Small,
    color: '#514B5F',
  },
  personPanels: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: SPACING.md,
  },
  personPanelsStack: {
    flexDirection: 'column',
  },
  personPanel: {
    flex: 1,
    minWidth: 0,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#ECE6F4',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    gap: SPACING.md,
  },
  personHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    minWidth: 0,
  },
  initialBubble: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    ...TYPOGRAPHY.CaptionBold,
    fontWeight: '900',
  },
  personName: {
    ...TYPOGRAPHY.SmallBold,
    color: '#1C181F',
    flex: 1,
    minWidth: 0,
  },
  needBlock: {
    gap: SPACING.xs,
  },
  microLabel: {
    ...TYPOGRAPHY.CaptionBold,
    color: '#5B21B6',
    fontWeight: '900',
  },
  challengeLabel: {
    color: '#BE123C',
  },
  needText: {
    ...TYPOGRAPHY.Small,
    color: '#1F1B29',
  },
  challengeText: {
    ...TYPOGRAPHY.Caption,
    color: '#4B4655',
  },
  balancePanel: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#ECE6F4',
    backgroundColor: '#FFFFFF',
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  balanceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xsSm,
  },
  balanceTitle: {
    ...TYPOGRAPHY.SmallBold,
    color: '#1C181F',
    flex: 1,
  },
  balanceLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  balanceLabelText: {
    ...TYPOGRAPHY.CaptionBold,
    flex: 1,
  },
  balanceTrack: {
    height: 10,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    backgroundColor: '#EFE8FF',
    flexDirection: 'row',
  },
  balanceFillLeft: {
    height: 10,
  },
  balanceFillRight: {
    height: 10,
  },
  balanceSummary: {
    ...TYPOGRAPHY.Small,
    color: '#514B5F',
  },
  adviceBox: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.smMd,
  },
  adviceIcon: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adviceCopy: {
    flex: 1,
    minWidth: 0,
    gap: SPACING.xs,
  },
  adviceTitle: {
    ...TYPOGRAPHY.SmallBold,
    color: '#25146A',
    fontWeight: '900',
  },
  adviceText: {
    ...TYPOGRAPHY.Small,
    color: '#2F2938',
  },
  detailWrap: {
    borderTopWidth: 1,
    borderTopColor: '#EFEAF6',
    paddingTop: SPACING.sm,
  },
  detailToggle: {
    minHeight: ACCESSIBILITY.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.xsSm,
  },
  detailToggleText: {
    ...TYPOGRAPHY.CaptionBold,
    fontWeight: '900',
  },
  detailPanel: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: '#ECE6F4',
    backgroundColor: '#FBFAFF',
    overflow: 'hidden',
  },
  detailRow: {
    padding: SPACING.md,
    gap: SPACING.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#EFEAF6',
  },
  detailTitle: {
    ...TYPOGRAPHY.CaptionBold,
    color: '#1C181F',
    fontWeight: '900',
  },
  detailBody: {
    ...TYPOGRAPHY.Caption,
    color: '#514B5F',
  },
});
