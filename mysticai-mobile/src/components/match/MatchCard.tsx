import React, { memo, useMemo } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
  Circle,
  Defs,
  Line,
  Path,
  RadialGradient as SvgRadialGradient,
  Stop,
} from 'react-native-svg';
import type { TraitAxis } from '../../services/match.api';
import type { RelationshipType, SynastryDisplayMetric, SynastryScoreBreakdown } from '../../services/synastry.service';

export interface MatchCardProps {
  user1Name: string;
  user2Name: string;
  user1Sign: string;
  user2Sign: string;
  compatibilityScore: number;
  relationshipType?: RelationshipType;
  relationLabel?: string;
  aiSummary: string;
  cardSummary?: string | null;
  traitAxes?: TraitAxis[];
  aspectsCount: number;
  scoreBreakdown?: Pick<SynastryScoreBreakdown, 'overall' | 'love' | 'communication' | 'spiritualBond'> | null;
  displayMetrics?: SynastryDisplayMetric[] | null;
}

type CardMetric = {
  icon: string;
  label: string;
  value: number;
};

type CardPanel = {
  icon: string;
  title: string;
  lines: string[];
  emphasis?: string | null;
  variant?: 'generic' | 'duo' | 'bond' | 'focus' | 'trust';
  duoRows?: Array<{ name: string; text: string }>;
  leadLabel?: string | null;
  leadText?: string | null;
  calloutLabel?: string | null;
  calloutText?: string | null;
  footnote?: string | null;
};

type CardVisualTheme = {
  cardGradient: [string, string, string];
  scoreGradient: [string, string];
  scoreBorder: string;
  scoreShadow: string;
  headerText: string;
  headerLine: string;
  nameText: string;
  connectorText: string;
  sublineText: string;
  metricBg: string;
  metricBorder: string;
  metricText: string;
  metricValue: string;
  panelBg: string;
  panelBorder: string;
  panelTitle: string;
  panelBody: string;
  panelSoftText: string;
  panelBubble: string;
  summaryBg: string;
  summaryBorder: string;
  summaryMainText: string;
  summarySubText: string;
  footerBg: string;
  footerBorder: string;
  footerMainText: string;
  footerSoftText: string;
  glowMain: string;
  glowAltA: string;
  glowAltB: string;
  cloudA: string;
  cloudB: string;
  showHearts: boolean;
};

type CardCopyBudget = {
  summary: number;
  summaryLine: number;
  traitList: number;
  axisNote: number;
  scoreHint: number;
  duoRow: number;
  panelEmphasis: number;
  panelLead: number;
  panelCallout: number;
  panelFootnote: number;
  genericLead: number;
  genericBullet: number;
  strongest: number;
  caution: number;
};

const DISPLAY_SCRIPT = Platform.select({
  ios: 'Snell Roundhand',
  android: 'serif',
  default: undefined,
});

const DISPLAY_SERIF = Platform.select({
  ios: 'Baskerville-SemiBold',
  android: 'serif',
  default: undefined,
});

const UI_FONT = Platform.select({
  ios: 'AvenirNext-Medium',
  android: 'sans-serif-medium',
  default: undefined,
});

const UI_FONT_BOLD = Platform.select({
  ios: 'AvenirNext-Bold',
  android: 'sans-serif',
  default: undefined,
});

function clampScore(value: number | null | undefined, fallback = 50) {
  const raw = typeof value === 'number' ? value : fallback;
  if (Number.isNaN(raw)) return fallback;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

function avg(values: Array<number | null | undefined>, fallback = 50) {
  const nums = values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  if (!nums.length) return fallback;
  return Math.round(nums.reduce((sum, v) => sum + v, 0) / nums.length);
}

function clip(text: string | null | undefined, max = 88) {
  const normalized = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  if (normalized.length <= max) return normalized;
  return `${normalized.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

function concise(text: string | null | undefined, max = 52) {
  const normalized = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!normalized) return '';
  const firstSentence = normalized.split(/(?<=[.!?])\s+/)[0] || normalized;
  const firstClause = firstSentence.split(/[,:;]/)[0]?.trim() || firstSentence;
  const compacted = firstClause
    .replace(/\b(aynı zamanda|oldukça|genellikle|özellikle)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  const candidate = compacted || firstClause;
  if (candidate.length <= max) return candidate;

  const trimWordSafe = (value: string, limit: number) => {
    if (value.length <= limit) return value;
    const slice = value.slice(0, limit + 1);
    const boundary = slice.lastIndexOf(' ');
    const shortened = (boundary > 10 ? slice.slice(0, boundary) : value.slice(0, limit)).trim();
    return shortened;
  };

  const shortCandidate = trimWordSafe(candidate, max);
  if (shortCandidate.length >= Math.max(12, Math.floor(max * 0.55))) return shortCandidate;

  const shortSentence = trimWordSafe(firstSentence, max);
  if (shortSentence.length >= Math.max(12, Math.floor(max * 0.55))) return shortSentence;

  const shortNormalized = trimWordSafe(normalized, max);
  if (shortNormalized.length >= Math.max(12, Math.floor(max * 0.55))) return shortNormalized;

  return trimWordSafe('Denge korunuyor', max);
}

function relationCopyBudget(type?: RelationshipType): CardCopyBudget {
  if (type === 'LOVE') {
    return {
      summary: 64,
      summaryLine: 40,
      traitList: 40,
      axisNote: 38,
      scoreHint: 38,
      duoRow: 24,
      panelEmphasis: 32,
      panelLead: 32,
      panelCallout: 28,
      panelFootnote: 30,
      genericLead: 34,
      genericBullet: 32,
      strongest: 24,
      caution: 26,
    };
  }
  if (type === 'FRIENDSHIP') {
    return {
      summary: 68,
      summaryLine: 44,
      traitList: 42,
      axisNote: 40,
      scoreHint: 40,
      duoRow: 26,
      panelEmphasis: 34,
      panelLead: 34,
      panelCallout: 30,
      panelFootnote: 32,
      genericLead: 36,
      genericBullet: 34,
      strongest: 24,
      caution: 28,
    };
  }
  if (type === 'BUSINESS') {
    return {
      summary: 62,
      summaryLine: 38,
      traitList: 38,
      axisNote: 36,
      scoreHint: 36,
      duoRow: 23,
      panelEmphasis: 30,
      panelLead: 30,
      panelCallout: 27,
      panelFootnote: 29,
      genericLead: 32,
      genericBullet: 30,
      strongest: 22,
      caution: 26,
    };
  }
  if (type === 'FAMILY') {
    return {
      summary: 64,
      summaryLine: 40,
      traitList: 40,
      axisNote: 38,
      scoreHint: 38,
      duoRow: 24,
      panelEmphasis: 32,
      panelLead: 32,
      panelCallout: 28,
      panelFootnote: 30,
      genericLead: 34,
      genericBullet: 32,
      strongest: 24,
      caution: 28,
    };
  }
  if (type === 'RIVAL') {
    return {
      summary: 60,
      summaryLine: 36,
      traitList: 36,
      axisNote: 34,
      scoreHint: 34,
      duoRow: 22,
      panelEmphasis: 28,
      panelLead: 28,
      panelCallout: 26,
      panelFootnote: 28,
      genericLead: 30,
      genericBullet: 28,
      strongest: 22,
      caution: 24,
    };
  }
  return {
    summary: 62,
    summaryLine: 40,
    traitList: 40,
    axisNote: 38,
    scoreHint: 38,
    duoRow: 24,
    panelEmphasis: 32,
    panelLead: 32,
    panelCallout: 28,
    panelFootnote: 30,
    genericLead: 34,
    genericBullet: 32,
    strongest: 24,
    caution: 26,
  };
}

function relationTheme(type?: RelationshipType, relationLabel?: string): {
  title: string;
  cardKind: string;
  connector: string;
  footerCta: string;
  visual: CardVisualTheme;
} {
  switch (type) {
    case 'LOVE':
      return {
        title: 'AŞK UYUMU',
        cardKind: 'SYNASTRY KARTI',
        connector: '♡',
        footerCta: 'Kendi uyum kartını oluştur',
        visual: {
          cardGradient: ['#F8F1FF', '#F0E3FB', '#E6D3F6'],
          scoreGradient: ['rgba(197,146,243,0.96)', 'rgba(152,103,214,0.96)'],
          scoreBorder: 'rgba(255,255,255,0.58)',
          scoreShadow: '#B06DE4',
          headerText: '#725394',
          headerLine: 'rgba(126, 86, 170, 0.18)',
          nameText: '#7C49B4',
          connectorText: '#9E6BD4',
          sublineText: '#6D5A8F',
          metricBg: 'rgba(255,255,255,0.58)',
          metricBorder: 'rgba(255,255,255,0.66)',
          metricText: '#66468C',
          metricValue: '#563381',
          panelBg: 'rgba(255,255,255,0.52)',
          panelBorder: 'rgba(255,255,255,0.74)',
          panelTitle: '#6A4595',
          panelBody: '#654D87',
          panelSoftText: '#7A629B',
          panelBubble: 'rgba(227, 202, 246, 0.46)',
          summaryBg: 'rgba(255,255,255,0.56)',
          summaryBorder: 'rgba(255,255,255,0.72)',
          summaryMainText: '#603F89',
          summarySubText: '#6E518F',
          footerBg: 'rgba(255,255,255,0.46)',
          footerBorder: 'rgba(255,255,255,0.64)',
          footerMainText: '#64448C',
          footerSoftText: '#73569A',
          glowMain: '#FFFFFF',
          glowAltA: '#F5CFFF',
          glowAltB: '#E7D7FF',
          cloudA: 'rgba(242, 221, 255, 0.75)',
          cloudB: 'rgba(225, 194, 247, 0.72)',
          showHearts: true,
        },
      };
    case 'FRIENDSHIP':
      return {
        title: 'ARKADAŞLIK UYUMU',
        cardKind: 'SYNASTRY KARTI',
        connector: '♡',
        footerCta: 'Kendi arkadaşlık kartını oluştur',
        visual: {
          cardGradient: ['#FFF2FE', '#F9E5FF', '#EED5FB'],
          scoreGradient: ['rgba(240,116,209,0.94)', 'rgba(164,90,226,0.94)'],
          scoreBorder: 'rgba(255,255,255,0.62)',
          scoreShadow: '#D152B2',
          headerText: '#7A4798',
          headerLine: 'rgba(154, 95, 181, 0.2)',
          nameText: '#A038A1',
          connectorText: '#C16AC9',
          sublineText: '#744F8D',
          metricBg: 'rgba(255,255,255,0.58)',
          metricBorder: 'rgba(255,255,255,0.7)',
          metricText: '#6A3E88',
          metricValue: '#9138A4',
          panelBg: 'rgba(255,255,255,0.56)',
          panelBorder: 'rgba(255,255,255,0.76)',
          panelTitle: '#7B4699',
          panelBody: '#654D87',
          panelSoftText: '#805F9D',
          panelBubble: 'rgba(245, 198, 244, 0.52)',
          summaryBg: 'rgba(255,255,255,0.58)',
          summaryBorder: 'rgba(255,255,255,0.74)',
          summaryMainText: '#6B418C',
          summarySubText: '#744E92',
          footerBg: 'rgba(255,255,255,0.5)',
          footerBorder: 'rgba(255,255,255,0.66)',
          footerMainText: '#734691',
          footerSoftText: '#825DA0',
          glowMain: '#FFE6FF',
          glowAltA: '#FFB3F0',
          glowAltB: '#F0D4FF',
          cloudA: 'rgba(255, 216, 245, 0.77)',
          cloudB: 'rgba(240, 188, 241, 0.72)',
          showHearts: true,
        },
      };
    case 'BUSINESS':
      return {
        title: 'İŞ ORTAKLIĞI UYUMU',
        cardKind: 'SYNASTRY KARTI',
        connector: '✦',
        footerCta: 'Kendi iş uyum kartını oluştur',
        visual: {
          cardGradient: ['#EEF4FF', '#E3ECFF', '#D4E3FF'],
          scoreGradient: ['rgba(105,153,239,0.95)', 'rgba(67,116,206,0.95)'],
          scoreBorder: 'rgba(255,255,255,0.64)',
          scoreShadow: '#5C87D2',
          headerText: '#4A648C',
          headerLine: 'rgba(88, 124, 176, 0.24)',
          nameText: '#3E5B93',
          connectorText: '#5F76B2',
          sublineText: '#566985',
          metricBg: 'rgba(255,255,255,0.66)',
          metricBorder: 'rgba(255,255,255,0.8)',
          metricText: '#4B5F82',
          metricValue: '#3D5480',
          panelBg: 'rgba(255,255,255,0.62)',
          panelBorder: 'rgba(255,255,255,0.8)',
          panelTitle: '#4A6392',
          panelBody: '#4F607D',
          panelSoftText: '#617391',
          panelBubble: 'rgba(197, 219, 255, 0.6)',
          summaryBg: 'rgba(255,255,255,0.64)',
          summaryBorder: 'rgba(255,255,255,0.8)',
          summaryMainText: '#415C8A',
          summarySubText: '#536A8C',
          footerBg: 'rgba(255,255,255,0.58)',
          footerBorder: 'rgba(255,255,255,0.74)',
          footerMainText: '#45608E',
          footerSoftText: '#5D7398',
          glowMain: '#ECF4FF',
          glowAltA: '#C3D8FF',
          glowAltB: '#BFD1F9',
          cloudA: 'rgba(215, 229, 255, 0.78)',
          cloudB: 'rgba(193, 213, 247, 0.72)',
          showHearts: false,
        },
      };
    case 'FAMILY':
      return {
        title: 'AİLE UYUMU',
        cardKind: 'SYNASTRY KARTI',
        connector: '♡',
        footerCta: 'Kendi aile uyum kartını oluştur',
        visual: {
          cardGradient: ['#FFF5F7', '#FDEAF1', '#F6DDEB'],
          scoreGradient: ['rgba(232,133,181,0.94)', 'rgba(186,102,157,0.94)'],
          scoreBorder: 'rgba(255,255,255,0.62)',
          scoreShadow: '#C3719A',
          headerText: '#8C5074',
          headerLine: 'rgba(181, 117, 152, 0.2)',
          nameText: '#A14C80',
          connectorText: '#BD6C98',
          sublineText: '#805E73',
          metricBg: 'rgba(255,255,255,0.6)',
          metricBorder: 'rgba(255,255,255,0.74)',
          metricText: '#7D506B',
          metricValue: '#914A77',
          panelBg: 'rgba(255,255,255,0.56)',
          panelBorder: 'rgba(255,255,255,0.74)',
          panelTitle: '#8E4D74',
          panelBody: '#74576D',
          panelSoftText: '#8A6880',
          panelBubble: 'rgba(247, 206, 226, 0.6)',
          summaryBg: 'rgba(255,255,255,0.58)',
          summaryBorder: 'rgba(255,255,255,0.74)',
          summaryMainText: '#7D4E68',
          summarySubText: '#87627A',
          footerBg: 'rgba(255,255,255,0.5)',
          footerBorder: 'rgba(255,255,255,0.68)',
          footerMainText: '#83506E',
          footerSoftText: '#916C82',
          glowMain: '#FFECEF',
          glowAltA: '#F8C8DD',
          glowAltB: '#F1D9F6',
          cloudA: 'rgba(251, 225, 236, 0.78)',
          cloudB: 'rgba(241, 205, 223, 0.72)',
          showHearts: true,
        },
      };
    case 'RIVAL':
      return {
        title: 'REKABET DİNAMİĞİ',
        cardKind: 'SYNASTRY KARTI',
        connector: '✦',
        footerCta: 'Kendi rekabet kartını oluştur',
        visual: {
          cardGradient: ['#FFF1F6', '#F8E2EC', '#EBD8E9'],
          scoreGradient: ['rgba(220,100,146,0.95)', 'rgba(124,88,180,0.95)'],
          scoreBorder: 'rgba(255,255,255,0.6)',
          scoreShadow: '#8E5B9D',
          headerText: '#704760',
          headerLine: 'rgba(144, 94, 129, 0.22)',
          nameText: '#8A436C',
          connectorText: '#A65D88',
          sublineText: '#6B5567',
          metricBg: 'rgba(255,255,255,0.62)',
          metricBorder: 'rgba(255,255,255,0.76)',
          metricText: '#6B4B67',
          metricValue: '#7F3D6A',
          panelBg: 'rgba(255,255,255,0.58)',
          panelBorder: 'rgba(255,255,255,0.76)',
          panelTitle: '#754A73',
          panelBody: '#6A576A',
          panelSoftText: '#7F6A7D',
          panelBubble: 'rgba(232, 201, 230, 0.62)',
          summaryBg: 'rgba(255,255,255,0.6)',
          summaryBorder: 'rgba(255,255,255,0.74)',
          summaryMainText: '#6B4268',
          summarySubText: '#775A76',
          footerBg: 'rgba(255,255,255,0.54)',
          footerBorder: 'rgba(255,255,255,0.68)',
          footerMainText: '#704A6F',
          footerSoftText: '#856A84',
          glowMain: '#FFE9F1',
          glowAltA: '#F0BDD6',
          glowAltB: '#E0CCF0',
          cloudA: 'rgba(243, 221, 234, 0.78)',
          cloudB: 'rgba(226, 198, 220, 0.72)',
          showHearts: false,
        },
      };
    default:
      return {
        title: (relationLabel || 'UYUM').toUpperCase(),
        cardKind: 'SYNASTRY KARTI',
        connector: '✦',
        footerCta: 'Kendi yıldız kartını oluştur',
        visual: {
          cardGradient: ['#F8F1FF', '#F0E3FB', '#E6D3F6'],
          scoreGradient: ['rgba(197,146,243,0.96)', 'rgba(152,103,214,0.96)'],
          scoreBorder: 'rgba(255,255,255,0.58)',
          scoreShadow: '#B06DE4',
          headerText: '#725394',
          headerLine: 'rgba(126, 86, 170, 0.18)',
          nameText: '#7C49B4',
          connectorText: '#9E6BD4',
          sublineText: '#6D5A8F',
          metricBg: 'rgba(255,255,255,0.58)',
          metricBorder: 'rgba(255,255,255,0.66)',
          metricText: '#66468C',
          metricValue: '#563381',
          panelBg: 'rgba(255,255,255,0.52)',
          panelBorder: 'rgba(255,255,255,0.74)',
          panelTitle: '#6A4595',
          panelBody: '#654D87',
          panelSoftText: '#7A629B',
          panelBubble: 'rgba(227, 202, 246, 0.46)',
          summaryBg: 'rgba(255,255,255,0.56)',
          summaryBorder: 'rgba(255,255,255,0.72)',
          summaryMainText: '#603F89',
          summarySubText: '#6E518F',
          footerBg: 'rgba(255,255,255,0.46)',
          footerBorder: 'rgba(255,255,255,0.64)',
          footerMainText: '#64448C',
          footerSoftText: '#73569A',
          glowMain: '#FFFFFF',
          glowAltA: '#F5CFFF',
          glowAltB: '#E7D7FF',
          cloudA: 'rgba(242, 221, 255, 0.75)',
          cloudB: 'rgba(225, 194, 247, 0.72)',
          showHearts: true,
        },
      };
  }
}

function deriveMetrics(
  relationshipType: RelationshipType | undefined,
  overall: number,
  scoreBreakdown: MatchCardProps['scoreBreakdown'],
  traitAxes: TraitAxis[],
): CardMetric[] {
  const love = clampScore(scoreBreakdown?.love, avg([overall, traitAxes[0]?.score0to100], overall));
  const communication = clampScore(scoreBreakdown?.communication, avg([overall, traitAxes[1]?.score0to100], overall));
  const trustBase = clampScore(scoreBreakdown?.spiritualBond, avg([overall, traitAxes[2]?.score0to100], overall));
  const axisBlend = avg(traitAxes.slice(0, 4).map((a) => a?.score0to100), overall);

  if (relationshipType === 'LOVE') {
    return [
      { icon: '💗', label: 'Aşk', value: love },
      { icon: '💬', label: 'İletişim', value: communication },
      { icon: '🛡️', label: 'Güven', value: trustBase },
      { icon: '🔥', label: 'Tutku', value: clampScore(avg([love, overall, axisBlend])) },
    ];
  }
  if (relationshipType === 'FRIENDSHIP') {
    return [
      { icon: '⭐', label: 'Eğlence', value: clampScore(avg([overall, axisBlend + 4])) },
      { icon: '💬', label: 'İletişim', value: communication },
      { icon: '🛡️', label: 'Güven', value: trustBase },
      { icon: '💞', label: 'Destek', value: clampScore(avg([trustBase, overall])) },
    ];
  }
  if (relationshipType === 'BUSINESS') {
    return [
      { icon: '📈', label: 'İş Birliği', value: clampScore(avg([overall, communication])) },
      { icon: '💬', label: 'İletişim', value: communication },
      { icon: '🧭', label: 'Strateji', value: clampScore(avg([communication, axisBlend])) },
      { icon: '🛡️', label: 'Güven', value: trustBase },
    ];
  }
  if (relationshipType === 'FAMILY') {
    return [
      { icon: '💞', label: 'Şefkat', value: clampScore(avg([overall, trustBase])) },
      { icon: '💬', label: 'İletişim', value: communication },
      { icon: '🛡️', label: 'Güven', value: trustBase },
      { icon: '🤝', label: 'Dayanışma', value: clampScore(avg([overall, axisBlend, trustBase])) },
    ];
  }
  if (relationshipType === 'RIVAL') {
    return [
      { icon: '⚔️', label: 'Rekabet', value: clampScore(avg([overall, axisBlend])) },
      { icon: '🧠', label: 'Strateji', value: clampScore(avg([communication, overall])) },
      { icon: '🎯', label: 'Odak', value: clampScore(avg([axisBlend, overall])) },
      { icon: '⚡', label: 'Gerilim', value: clampScore(avg([100 - trustBase, 100 - communication, overall])) },
    ];
  }
  return [
    { icon: '⭐', label: 'Genel', value: overall },
    { icon: '💬', label: 'İletişim', value: communication },
    { icon: '🛡️', label: 'Güven', value: trustBase },
    { icon: '💞', label: 'Destek', value: clampScore(avg([trustBase, overall])) },
  ];
}

function iconForMetric(metricId: string, relationshipType?: RelationshipType) {
  const key = String(metricId || '').toLowerCase();
  if (key.includes('communication')) return '💬';
  if (key.includes('trust')) return '🛡️';
  if (key.includes('support')) return '💞';
  if (key.includes('love')) return '💗';
  if (key.includes('passion')) return '🔥';
  if (key.includes('fun')) return '⭐';
  if (key.includes('cooperation')) return '📈';
  if (key.includes('strategy')) return '🧭';
  if (key.includes('compassion')) return '💞';
  if (key.includes('solidarity')) return '🤝';
  if (key.includes('competition')) return '⚔️';
  if (key.includes('focus')) return '🎯';
  if (key.includes('tension')) return '⚡';
  if (relationshipType === 'FRIENDSHIP') return '⭐';
  if (relationshipType === 'LOVE') return '💗';
  return '✦';
}

function normalizeOfficialMetrics(
  displayMetrics: SynastryDisplayMetric[] | null | undefined,
  relationshipType: RelationshipType | undefined,
): CardMetric[] {
  if (!displayMetrics?.length) return [];
  return displayMetrics
    .filter((m) => typeof m?.score === 'number' && m.label)
    .slice(0, 4)
    .map((m) => ({
      icon: iconForMetric(m.id, relationshipType),
      label: m.label,
      value: clampScore(m.score, 50),
    }));
}

function axisDirection(axis?: TraitAxis | null) {
  if (!axis) return null;
  const score = clampScore(axis.score0to100, 50);
  return {
    score,
    dominant: score >= 50 ? axis.rightLabel : axis.leftLabel,
    balancing: score >= 50 ? axis.leftLabel : axis.rightLabel,
  };
}

function compactTraitLabel(label?: string | null, fallback = 'Denge') {
  const cleaned = String(label ?? '')
    .replace(/[._]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return fallback;
  return clip(cleaned, 16);
}

function traitPair(a?: string | null, b?: string | null, fallbackA = 'İlgi', fallbackB = 'Destek') {
  return `${compactTraitLabel(a, fallbackA)} + ${compactTraitLabel(b, fallbackB)}`;
}

function combineTraitList(values: Array<string | null | undefined>, fallback: string, max = 46) {
  const unique = Array.from(
    new Set(
      values
        .map((v) => String(v ?? '').trim())
        .filter(Boolean),
    ),
  );
  if (!unique.length) return fallback;
  return concise(unique.map((v) => compactTraitLabel(v)).join(', '), max);
}

function relationPanelTemplates(type?: RelationshipType): Array<{ icon: string; title: string }> {
  switch (type) {
    case 'LOVE':
      return [
        { icon: '💗', title: 'Sevgi Dili' },
        { icon: '💬', title: 'Duygusal Bağ' },
        { icon: '🔥', title: 'Çekim & Tutku' },
        { icon: '🛡️', title: 'Güven & Bağlılık' },
      ];
    case 'FRIENDSHIP':
      return [
        { icon: '⭐', title: 'Ortak İlgi' },
        { icon: '🎉', title: 'Eğlence Tarzı' },
        { icon: '🛡️', title: 'Güven & Sırlar' },
        { icon: '💞', title: 'Destek & Şefkat' },
      ];
    case 'BUSINESS':
      return [
        { icon: '📈', title: 'Ortak Hedef' },
        { icon: '💬', title: 'Karar & İletişim' },
        { icon: '🧩', title: 'Rol Dağılımı' },
        { icon: '🛡️', title: 'Güven & Sorumluluk' },
      ];
    case 'FAMILY':
      return [
        { icon: '💞', title: 'Şefkat Dili' },
        { icon: '🏡', title: 'Ev İçi Ritim' },
        { icon: '💬', title: 'Duygu & İletişim' },
        { icon: '🤝', title: 'Dayanışma' },
      ];
    case 'RIVAL':
      return [
        { icon: '⚔️', title: 'Rekabet Dili' },
        { icon: '🧠', title: 'Zihinsel Oyun' },
        { icon: '⚡', title: 'Gerilim Noktası' },
        { icon: '🎯', title: 'Kazanma Stratejisi' },
      ];
    default:
      return [
        { icon: '⭐', title: 'Ortak Tema' },
        { icon: '💬', title: 'İletişim' },
        { icon: '🛡️', title: 'Güven' },
        { icon: '💞', title: 'Destek' },
      ];
  }
}

function buildPanels(
  relationshipType: RelationshipType | undefined,
  user1Name: string,
  user2Name: string,
  traitAxes: TraitAxis[],
  summary: string,
  overallScore: number,
  budget: CardCopyBudget,
): CardPanel[] {
  const templates = relationPanelTemplates(relationshipType);
  const linesFromSummary = summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => concise(s, budget.summaryLine))
    .filter(Boolean);

  if (relationshipType === 'LOVE') {
    const d0 = axisDirection(traitAxes[0]);
    const d1 = axisDirection(traitAxes[1]);
    const d2 = axisDirection(traitAxes[2]);
    const d3 = axisDirection(traitAxes[3]);
    const trustScore = d2?.score ?? clampScore(overallScore, 70);
    const passionScore = clampScore(avg([overallScore, d0?.score, d3?.score], overallScore));
    const attractionTone =
      passionScore >= 85
        ? 'Romantik çekim çok canlı.'
        : passionScore >= 70
          ? 'Çekim doğal akıyor; yakınlıkla güçleniyor.'
          : 'Çekim, zaman ve güvenle açılıyor.';
    const trustTone =
      trustScore >= 85
        ? '“Yanındayım” refleksiniz bağı güçlendiriyor.'
        : trustScore >= 70
          ? 'Güven gelişiyor; tutarlılık bağı güçlendirir.'
          : 'Güven yavaş açılır; netlik ve sabır anahtar.';

    return [
      {
        icon: '💗',
        title: 'Sevgi Dili',
        lines: [],
        variant: 'duo',
        duoRows: [
          {
            name: user1Name,
            text: traitPair(d0?.dominant, d1?.dominant, 'İlgi', 'Sözler'),
          },
          {
            name: user2Name,
            text: traitPair(d0?.balancing, d1?.balancing, 'Destek', 'Dokunuş'),
          },
        ],
        emphasis: concise(linesFromSummary[0] || 'Sevgi ritminiz birbirine iyi geliyor.', budget.panelEmphasis),
      },
      {
        icon: '💬',
        title: 'Duygusal Bağ',
        lines: [],
        variant: 'bond',
        leadLabel: 'Güçlü yanlarınız',
        leadText: combineTraitList(
          [d0?.dominant, d1?.dominant, d2?.dominant, d3?.dominant],
          'Şefkat, destek, teslimiyet',
          budget.traitList,
        ),
        calloutLabel: 'Altın kural',
        calloutText: concise(linesFromSummary[1] || 'Önce duygu, sonra çözüm.', budget.panelCallout),
        footnote: concise(traitAxes[1]?.note || 'Kırgınlık varsa önce onu duyun.', budget.panelFootnote),
      },
      {
        icon: '🔥',
        title: 'Çekim & Tutku',
        lines: [],
        variant: 'focus',
        leadText: concise(attractionTone, budget.panelLead),
        calloutLabel: 'Dikkat',
        calloutText: concise(`${compactTraitLabel(d3?.balancing, 'Rutin')} ihmal edilirse gerginlik artar.`, budget.panelCallout),
        footnote: concise(traitAxes[3]?.note || 'Açık konuşma çekimi korur.', budget.panelFootnote),
      },
      {
        icon: '🛡️',
        title: 'Güven & Bağlılık',
        lines: [],
        variant: 'trust',
        leadText: concise(trustTone, budget.panelLead),
        calloutLabel: 'İstikrarı besleyen anahtar',
        calloutText: concise(
          `${compactTraitLabel(d2?.dominant, 'Samimi açıklık')} + ${compactTraitLabel(d2?.balancing, 'Netlik')}`,
          budget.panelCallout,
        ),
        footnote: concise(traitAxes[2]?.note || 'Söz-eylem uyumu bağı sakinleştirir.', budget.panelFootnote),
      },
    ];
  }

  if (relationshipType === 'FRIENDSHIP') {
    const d0 = axisDirection(traitAxes[0]);
    const d1 = axisDirection(traitAxes[1]);
    const d2 = axisDirection(traitAxes[2]);
    const d3 = axisDirection(traitAxes[3]);
    const funScore = clampScore(avg([overallScore, d0?.score, d1?.score], overallScore));
    const trustScore = d2?.score ?? clampScore(overallScore, 70);
    const supportScore = clampScore(avg([overallScore, d2?.score, d3?.score], overallScore));

    return [
      {
        icon: '⭐',
        title: 'Ortak İlgi',
        lines: [],
        variant: 'duo',
        duoRows: [
          {
            name: user1Name,
            text: traitPair(d0?.dominant, d1?.dominant, 'Merak', 'Sohbet'),
          },
          {
            name: user2Name,
            text: traitPair(d0?.balancing, d1?.balancing, 'Neşe', 'Destek'),
          },
        ],
        emphasis: concise(linesFromSummary[0] || 'Birlikte keşfetmeyi seviyorsunuz.', budget.panelEmphasis),
      },
      {
        icon: '🎉',
        title: 'Eğlence Tarzı',
        lines: [],
        variant: 'bond',
        leadLabel: 'Birlikte akış',
        leadText:
          funScore >= 85
            ? 'Spontane planlar size çok iyi gelir.'
            : funScore >= 70
              ? 'Aynı ritmi bulunca keyif hızla artar.'
              : 'Kısa planlar eğlence akışını toparlar.',
        calloutLabel: 'Mini not',
        calloutText: concise(linesFromSummary[1] || 'Kısa kaçamaklar bağınızı canlandırır.', budget.panelCallout),
        footnote: concise(traitAxes[1]?.note || 'Tempo farkında sırayla aktivite seçin.', budget.panelFootnote),
      },
      {
        icon: '🛡️',
        title: 'Güven & Sırlar',
        lines: [],
        variant: 'trust',
        leadText:
          trustScore >= 85
            ? 'Sır saklama ve kollama refleksiniz güçlü.'
            : trustScore >= 70
              ? 'Güven hızla oturur; düzenli temas iyi gelir.'
              : 'Güven yavaş açılır; baskısız iletişim daha iyi çalışır.',
        calloutLabel: 'Hızlı güven',
        calloutText: concise(
          `${compactTraitLabel(d2?.dominant, 'Yanında olma')} + ${compactTraitLabel(d2?.balancing, 'Tutarlılık')}`,
          budget.panelCallout,
        ),
        footnote: concise(traitAxes[2]?.note || 'Yargısız dinlemek güveni artırır.', budget.panelFootnote),
      },
      {
        icon: '💞',
        title: 'Destek & Şefkat',
        lines: [],
        variant: 'focus',
        leadText:
          supportScore >= 85
            ? 'Birbirinizi yumuşak bir dille destekliyorsunuz.'
            : supportScore >= 70
              ? 'Destek gücünüz iyi; zamanlama ile daha da artar.'
              : 'Destek var; beklentiyi açık konuşmak işleri kolaylaştırır.',
        calloutLabel: 'Altın anahtar',
        calloutText: concise(`${compactTraitLabel(d3?.dominant, 'Empati')} + pozitif yaklaşım`, budget.panelCallout),
        footnote: concise(traitAxes[3]?.note || 'Zor anda ihtiyaç sorusu çok işe yarar.', budget.panelFootnote),
      },
    ];
  }

  if (relationshipType === 'BUSINESS') {
    const d0 = axisDirection(traitAxes[0]);
    const d1 = axisDirection(traitAxes[1]);
    const d2 = axisDirection(traitAxes[2]);
    const d3 = axisDirection(traitAxes[3]);
    const strategyScore = clampScore(avg([overallScore, d1?.score, d2?.score], overallScore));
    const trustScore = d3?.score ?? clampScore(overallScore, 65);

    return [
      {
        icon: '📈',
        title: 'Ortak Hedef',
        lines: [],
        variant: 'duo',
        duoRows: [
          { name: user1Name, text: traitPair(d0?.dominant, d1?.dominant, 'Vizyon', 'İcra') },
          { name: user2Name, text: traitPair(d0?.balancing, d1?.balancing, 'Plan', 'Takip') },
        ],
        emphasis: concise(linesFromSummary[0] || 'Net hedef koyunca verim artar.', budget.panelEmphasis),
      },
      {
        icon: '💬',
        title: 'Karar & İletişim',
        lines: [],
        variant: 'bond',
        leadLabel: 'Karar ritmi',
        leadText: combineTraitList([d1?.dominant, d1?.balancing, d2?.dominant], 'Netlik, hız, koordinasyon', budget.traitList),
        calloutLabel: 'Toplantı kuralı',
        calloutText: concise(linesFromSummary[1] || 'Önce hedef, sonra seçenek.', budget.panelCallout),
        footnote: concise(traitAxes[1]?.note || 'Rol netliği sürtünmeyi azaltır.', budget.panelFootnote),
      },
      {
        icon: '🧩',
        title: 'Rol Dağılımı',
        lines: [],
        variant: 'focus',
        leadText:
          strategyScore >= 80
            ? 'Rol paylaşımı doğruysa iş akışı hızlanır.'
            : 'Rol sınırları netleşince verim artar.',
        calloutLabel: 'Dikkat',
        calloutText: concise(`${compactTraitLabel(d2?.balancing, 'Yetki')} belirsizliği yavaşlatır.`, budget.panelCallout),
        footnote: concise(traitAxes[2]?.note || 'Sorumlulukları yazılı netleştirin.', budget.panelFootnote),
      },
      {
        icon: '🛡️',
        title: 'Güven & Sorumluluk',
        lines: [],
        variant: 'trust',
        leadText:
          trustScore >= 80
            ? 'Takip ve tutarlılık profesyonel güven kuruyor.'
            : 'Güven için zamanında teslim ve görünür iletişim kritik.',
        calloutLabel: 'Anahtar',
        calloutText: concise(`${compactTraitLabel(d3?.dominant, 'Takip')} + ${compactTraitLabel(d3?.balancing, 'Şeffaflık')}`, budget.panelCallout),
        footnote: concise(traitAxes[3]?.note || 'Teslim tarihi netliği güven kurar.', budget.panelFootnote),
      },
    ];
  }

  if (relationshipType === 'FAMILY') {
    const d0 = axisDirection(traitAxes[0]);
    const d1 = axisDirection(traitAxes[1]);
    const d2 = axisDirection(traitAxes[2]);
    const d3 = axisDirection(traitAxes[3]);
    const careScore = clampScore(avg([overallScore, d0?.score, d2?.score], overallScore));
    const solidarityScore = clampScore(avg([overallScore, d3?.score, d2?.score], overallScore));

    return [
      {
        icon: '💞',
        title: 'Şefkat Dili',
        lines: [],
        variant: 'duo',
        duoRows: [
          { name: user1Name, text: traitPair(d0?.dominant, d2?.dominant, 'İlgi', 'Yakınlık') },
          { name: user2Name, text: traitPair(d0?.balancing, d2?.balancing, 'Destek', 'Sabır') },
        ],
        emphasis: concise(linesFromSummary[0] || 'Şefkat diliniz farklı, niyetiniz ortak.', budget.panelEmphasis),
      },
      {
        icon: '🏡',
        title: 'Ev İçi Ritim',
        lines: [],
        variant: 'bond',
        leadLabel: 'Günlük akış',
        leadText:
          careScore >= 80
            ? 'Düzen ve temas bir araya gelince huzur artar.'
            : 'Ritim farkları konuşuldukça denge güçlenir.',
        calloutLabel: 'Mini kural',
        calloutText: concise(linesFromSummary[1] || 'Küçük rutinler gerilimi azaltır.', budget.panelCallout),
        footnote: concise(traitAxes[1]?.note || 'Rol paylaşımı görünür olsun.', budget.panelFootnote),
      },
      {
        icon: '💬',
        title: 'Duygu & İletişim',
        lines: [],
        variant: 'focus',
        leadText: 'Duygular konuşulunca yanlış anlama azalır.',
        calloutLabel: 'Dikkat',
        calloutText: concise(`${compactTraitLabel(d2?.balancing, 'Savunma')} yükselirse tonu yumuşatın.`, budget.panelCallout),
        footnote: concise(traitAxes[2]?.note || 'Önce duygu, sonra çözüm daha iyi işler.', budget.panelFootnote),
      },
      {
        icon: '🤝',
        title: 'Dayanışma',
        lines: [],
        variant: 'trust',
        leadText:
          solidarityScore >= 80
            ? 'Zor zamanda birlikte toparlanma gücünüz yüksek.'
            : 'Dayanışma var; iş bölümü netleşince güçlenir.',
        calloutLabel: 'Güçlendiren anahtar',
        calloutText: concise(`${compactTraitLabel(d3?.dominant, 'Sahip çıkma')} + ${compactTraitLabel(d3?.balancing, 'Sakinlik')}`, budget.panelCallout),
        footnote: concise(traitAxes[3]?.note || 'Yük paylaşımı aile bağını güçlendirir.', budget.panelFootnote),
      },
    ];
  }

  if (relationshipType === 'RIVAL') {
    const d0 = axisDirection(traitAxes[0]);
    const d1 = axisDirection(traitAxes[1]);
    const d2 = axisDirection(traitAxes[2]);
    const d3 = axisDirection(traitAxes[3]);
    const tensionScore = clampScore(avg([100 - (d2?.score ?? 50), overallScore, d3?.score], overallScore));
    const strategyScore = clampScore(avg([overallScore, d1?.score, d3?.score], overallScore));

    return [
      {
        icon: '⚔️',
        title: 'Rekabet Dili',
        lines: [],
        variant: 'duo',
        duoRows: [
          { name: user1Name, text: traitPair(d0?.dominant, d1?.dominant, 'Hamle', 'Tempo') },
          { name: user2Name, text: traitPair(d0?.balancing, d1?.balancing, 'Karşı hamle', 'Sabır') },
        ],
        emphasis: concise(linesFromSummary[0] || 'Tempo ve psikolojik üstünlük oyunu belirgin.', budget.panelEmphasis),
      },
      {
        icon: '🧠',
        title: 'Zihinsel Oyun',
        lines: [],
        variant: 'bond',
        leadLabel: 'Avantaj alanı',
        leadText: combineTraitList([d1?.dominant, d3?.dominant, d1?.balancing], 'Strateji, zamanlama, okuma gücü', budget.traitList),
        calloutLabel: 'Kritik hamle',
        calloutText: concise(linesFromSummary[1] || 'Rakibin ritmini bozarken düzenini koru.', budget.panelCallout),
        footnote: concise(traitAxes[1]?.note || 'Sabırlı bekleme de avantaj yaratır.', budget.panelFootnote),
      },
      {
        icon: '⚡',
        title: 'Gerilim Noktası',
        lines: [],
        variant: 'focus',
        leadText:
          tensionScore >= 80
            ? 'Gerilim yüksek; küçük tetikler büyütebilir.'
            : 'Sınırlar korunursa rekabet daha sağlıklı kalır.',
        calloutLabel: 'Dikkat',
        calloutText: concise(`${compactTraitLabel(d2?.balancing, 'Ego sürtünmesi')} yükselirse oyun sertleşir.`, budget.panelCallout),
        footnote: concise(traitAxes[2]?.note || 'Kural ve sınır netliği tırmanışı azaltır.', budget.panelFootnote),
      },
      {
        icon: '🎯',
        title: 'Kazanma Stratejisi',
        lines: [],
        variant: 'trust',
        leadText:
          strategyScore >= 80
            ? 'Plan + sabır sonuç alma gücünü yükseltir.'
            : 'Doğru anda odak, gereksiz hamleyi azaltır.',
        calloutLabel: 'Anahtar',
        calloutText: concise(`${compactTraitLabel(d3?.dominant, 'Odak')} + ${compactTraitLabel(d0?.balancing, 'Disiplin')}`, budget.panelCallout),
        footnote: concise(traitAxes[3]?.note || 'Güçlü alana yüklenmek daha etkilidir.', budget.panelFootnote),
      },
    ];
  }

  return templates.map((tpl, idx) => {
    const axis = traitAxes[idx] ?? traitAxes[idx % Math.max(1, traitAxes.length)] ?? null;
    const dir = axisDirection(axis);
    const axisNote = concise(axis?.note, budget.axisNote);
    const scoreHint = dir
      ? concise(`${dir.dominant} baskın; ${dir.balancing.toLowerCase()} denge kurar.`, budget.scoreHint)
      : overallScore >= 70
        ? 'Bu alanda akış doğal ve destekleyici.'
        : 'Bu alanda dengeyi iletişim belirliyor.';

    const compareLine =
      idx % 2 === 0
        ? `${user1Name} ve ${user2Name} burada birbirini tamamlayabilir.`
        : `Ritmi tempo ve ifade biçimi belirliyor.`;

    const emphasis =
      idx === 0
        ? linesFromSummary[0]
        : idx === 1
          ? linesFromSummary[1] ?? null
          : null;

    const lines = [scoreHint, axisNote || compareLine].filter(Boolean) as string[];
    if (lines.length < 2) lines.push(compareLine);

    return {
      icon: tpl.icon,
      title: tpl.title,
      lines,
      emphasis,
    };
  });
}

function strongestAndCautionAxes(traitAxes: TraitAxis[]) {
  if (!traitAxes.length) {
    return {
      strongest: 'Ortak ritim',
      caution: 'İletişim zamanlaması',
    };
  }

  // Performance: avoid allocating/copying+sorting. We only need min/max of the
  // distance metric used by the previous sort.
  let strongestAxis: TraitAxis = traitAxes[0];
  let cautionAxis: TraitAxis = traitAxes[0];
  let minDist = Infinity;
  let maxDist = -Infinity;

  for (const axis of traitAxes) {
    const score = clampScore(axis.score0to100, 50);
    const dist = Math.abs(score - 50);

    // minDist: keep the first axis with the smallest distance (to mimic stable sort).
    if (dist < minDist) {
      minDist = dist;
      strongestAxis = axis;
    }

    // maxDist: keep the last axis with the largest distance (to mimic stable sort's tail).
    if (dist > maxDist || dist === maxDist) {
      maxDist = dist;
      cautionAxis = axis;
    }
  }

  const strongest = axisDirection(strongestAxis)?.dominant ?? 'Ortak ritim';
  const caution = axisDirection(cautionAxis)?.balancing ?? 'İletişim zamanlaması';
  return { strongest, caution };
}

function GalaxyBackdrop({ visual }: { visual: CardVisualTheme }) {
  const stars = [
    [18, 24, 1.1], [52, 42, 1.4], [85, 26, 0.9], [114, 36, 1.2], [148, 22, 1.0], [188, 34, 1.1], [226, 22, 1.0], [262, 34, 1.2], [308, 24, 1.3], [336, 42, 1.0],
    [22, 84, 0.9], [48, 102, 1.0], [92, 92, 1.1], [132, 110, 1.0], [174, 94, 0.9], [220, 108, 1.2], [260, 92, 1.0], [304, 108, 1.0], [342, 88, 0.9],
    [26, 188, 1.0], [64, 202, 1.2], [108, 192, 0.9], [146, 210, 1.0], [190, 194, 0.9], [236, 208, 1.0], [276, 192, 1.2], [322, 204, 0.9],
    [28, 308, 0.9], [74, 292, 1.1], [116, 306, 0.9], [164, 294, 1.0], [214, 308, 0.9], [256, 292, 1.0], [306, 306, 1.1], [334, 292, 0.9],
    [24, 412, 1.0], [70, 428, 1.1], [122, 414, 0.9], [176, 430, 1.0], [226, 414, 0.9], [280, 428, 1.1], [334, 414, 1.0],
  ] as const;
  const hearts = [
    [40, 66, 8, 0.11], [300, 70, 10, 0.12], [324, 142, 7, 0.10], [32, 152, 6, 0.10],
    [58, 356, 8, 0.11], [296, 370, 10, 0.12], [328, 446, 6, 0.10], [154, 468, 5, 0.08],
  ] as const;

  return (
    <View pointerEvents="none" style={styles.galaxyLayer}>
      <Svg width="100%" height="100%" viewBox="0 0 360 720">
        <Defs>
          <SvgRadialGradient id="lavGlowA" cx="50%" cy="12%" r="76%">
            <Stop offset="0%" stopColor={visual.glowMain} stopOpacity="0.88" />
            <Stop offset="45%" stopColor={visual.glowMain} stopOpacity="0.42" />
            <Stop offset="100%" stopColor={visual.glowMain} stopOpacity="0.02" />
          </SvgRadialGradient>
          <SvgRadialGradient id="lavGlowB" cx="18%" cy="58%" r="52%">
            <Stop offset="0%" stopColor={visual.glowAltA} stopOpacity="0.26" />
            <Stop offset="100%" stopColor={visual.glowAltA} stopOpacity="0" />
          </SvgRadialGradient>
          <SvgRadialGradient id="lavGlowC" cx="84%" cy="62%" r="48%">
            <Stop offset="0%" stopColor={visual.glowAltB} stopOpacity="0.28" />
            <Stop offset="100%" stopColor={visual.glowAltB} stopOpacity="0" />
          </SvgRadialGradient>
          <SvgRadialGradient id="softPanelLight" cx="50%" cy="50%" r="50%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.22" />
            <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
          </SvgRadialGradient>
        </Defs>

        <Circle cx={180} cy={94} r={196} fill="url(#lavGlowA)" />
        <Circle cx={70} cy={336} r={136} fill="url(#lavGlowB)" />
        <Circle cx={298} cy={328} r={146} fill="url(#lavGlowC)" />
        <Circle cx={180} cy={300} r={184} fill="url(#softPanelLight)" />

        <Path
          d="M0 0 H360 V540 H0 Z"
          fill="rgba(255,255,255,0.06)"
        />

        <Path
          d="M-8 646 C40 610, 88 614, 132 648 C172 676, 220 676, 270 648 C312 622, 340 624, 368 656 L368 720 L-8 720 Z"
          fill={visual.cloudA}
        />
        <Path
          d="M-6 676 C38 652, 86 656, 128 678 C172 702, 224 702, 276 676 C314 660, 340 662, 366 682 L366 720 L-6 720 Z"
          fill={visual.cloudB}
        />

        <Path d="M2 166 C70 214, 132 214, 180 186 C228 214, 290 214, 358 166" stroke="rgba(255,255,255,0.34)" strokeWidth={1.9} fill="none" />
        <Path d="M-2 186 C70 232, 132 232, 180 206 C228 232, 290 232, 362 186" stroke="rgba(218,180,247,0.34)" strokeWidth={1.8} fill="none" />
        <Path d="M16 154 C84 198, 138 198, 180 176 C222 198, 276 198, 344 154" stroke="rgba(255,255,255,0.22)" strokeWidth={1.2} fill="none" />
        <Path d="M18 564 H342" stroke="rgba(130, 93, 170, 0.12)" strokeWidth={1} />
        <Path d="M18 604 H342" stroke="rgba(130, 93, 170, 0.10)" strokeWidth={1} />

        {visual.showHearts && hearts.map(([x, y, size, opacity], idx) => (
          <Path
            key={`heart-bg-${idx}`}
            d={`M ${x} ${y + size * 0.9}
                C ${x - size * 0.6} ${y + size * 0.45}, ${x - size} ${y + size * 0.1}, ${x - size} ${y - size * 0.28}
                C ${x - size} ${y - size * 0.72}, ${x - size * 0.65} ${y - size}, ${x - size * 0.25} ${y - size}
                C ${x + 0} ${y - size}, ${x + size * 0.22} ${y - size * 0.78}, ${x + size * 0.36} ${y - size * 0.54}
                C ${x + size * 0.5} ${y - size * 0.78}, ${x + size * 0.74} ${y - size}, ${x + size * 1.06} ${y - size}
                C ${x + size * 1.46} ${y - size}, ${x + size * 1.78} ${y - size * 0.68}, ${x + size * 1.78} ${y - size * 0.24}
                C ${x + size * 1.78} ${y + size * 0.12}, ${x + size * 1.34} ${y + size * 0.50}, ${x + size * 0.66} ${y + size * 0.94}
                C ${x + size * 0.36} ${y + size * 1.12}, ${x + size * 0.15} ${y + size * 1.26}, ${x} ${y + size * 1.40}
                C ${x - size * 0.16} ${y + size * 1.24}, ${x - size * 0.40} ${y + size * 1.08}, ${x - size * 0.72} ${y + size * 0.86}
                C ${x - size * 1.44} ${y + size * 0.36}, ${x - size * 1.8} ${y + size * 0.04}, ${x - size * 1.8} ${y - size * 0.24}
                C ${x - size * 1.8} ${y - size * 0.70}, ${x - size * 1.42} ${y - size}, ${x - size * 1.0} ${y - size}
                C ${x - size * 0.68} ${y - size}, ${x - size * 0.45} ${y - size * 0.80}, ${x - size * 0.30} ${y - size * 0.56}
                C ${x - size * 0.16} ${y - size * 0.80}, ${x + size * 0.05} ${y - size}, ${x + size * 0.34} ${y - size}`}
            fill="rgba(255,255,255,0.22)"
            opacity={opacity}
          />
        ))}

        {stars.map(([x, y, r], idx) => (
          <Circle key={`star-${idx}`} cx={x} cy={y} r={r} fill="#FFFFFF" opacity={0.9} />
        ))}
        {stars
          .filter((_, idx) => idx % 6 === 0)
          .map(([x, y], idx) => (
            <Path
              key={`spark-${idx}`}
              d={`M ${x - 3} ${y} H ${x + 3} M ${x} ${y - 3} V ${y + 3}`}
              stroke="rgba(255,255,255,0.55)"
              strokeWidth={0.9}
              strokeLinecap="round"
            />
          ))}
      </Svg>
    </View>
  );
}

function MetricRow({ items, visual }: { items: CardMetric[]; visual: CardVisualTheme }) {
  return (
    <View
      style={[
        styles.metricBand,
        {
          backgroundColor: visual.metricBg,
          borderColor: visual.metricBorder,
        },
      ]}
    >
      <View style={styles.metricRow}>
        {items.map((item, idx) => (
          <View key={`${item.label}-${idx}`} style={styles.metricItem}>
            <Text style={[styles.metricText, { color: visual.metricText }]}>
              {item.icon} {item.label}: <Text style={[styles.metricValueText, { color: visual.metricValue }]}>{item.value}</Text>
            </Text>
            {idx < items.length - 1 ? <Text style={[styles.metricDivider, { color: visual.metricText }]}>|</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function InsightPanel({
  panel,
  compact = false,
  visual,
  budget,
}: {
  panel: CardPanel;
  compact?: boolean;
  visual: CardVisualTheme;
  budget: CardCopyBudget;
}) {
  if (panel.variant === 'duo' && panel.duoRows?.length) {
    return (
      <View
        style={[
          styles.panelCard,
          compact && styles.panelCardCompact,
          {
            backgroundColor: visual.panelBg,
            borderColor: visual.panelBorder,
          },
        ]}
      >
        <View style={styles.panelHeaderLine}>
          <Text style={[styles.panelTitle, { color: visual.panelTitle }]}>
            {panel.icon} {panel.title}
          </Text>
        </View>
        <View style={styles.duoRowsWrap}>
          {panel.duoRows.slice(0, 2).map((row, idx) => (
            <View key={`${panel.title}-duo-${idx}`} style={styles.duoRow}>
              <Text style={styles.duoRowName} numberOfLines={1}>
                {row.name}:
              </Text>
              <Text style={[styles.duoRowValue, { color: visual.panelBody }]} numberOfLines={2}>
                {concise(row.text, budget.duoRow)}
              </Text>
            </View>
          ))}
        </View>
        {panel.emphasis ? (
          <View style={[styles.panelEmphasisBubble, { backgroundColor: visual.panelBubble }]}>
            <Text style={[styles.panelEmphasis, { color: visual.panelTitle }]} numberOfLines={2}>
              {concise(panel.emphasis, budget.panelEmphasis)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (panel.variant === 'bond') {
    return (
      <View
        style={[
          styles.panelCard,
          compact && styles.panelCardCompact,
          {
            backgroundColor: visual.panelBg,
            borderColor: visual.panelBorder,
          },
        ]}
      >
        <View style={styles.panelHeaderLine}>
          <Text style={[styles.panelTitle, { color: visual.panelTitle }]}>
            {panel.icon} {panel.title}
          </Text>
        </View>
        {panel.leadLabel ? <Text style={[styles.panelLabel, { color: visual.panelTitle }]}>{panel.leadLabel}:</Text> : null}
        {panel.leadText ? (
          <Text style={[styles.panelLeadText, { color: visual.panelBody }]} numberOfLines={2}>
            {concise(panel.leadText, budget.panelLead)}
          </Text>
        ) : null}
        {(panel.calloutLabel || panel.calloutText) ? (
          <View style={[styles.panelEmphasisBubble, { backgroundColor: visual.panelBubble }]}>
            <Text style={[styles.panelCalloutLine, { color: visual.panelBody }]} numberOfLines={2}>
              {panel.calloutLabel ? <Text style={[styles.panelCalloutLabel, { color: visual.panelTitle }]}>{panel.calloutLabel}: </Text> : null}
              {concise(panel.calloutText, budget.panelCallout)}
            </Text>
          </View>
        ) : null}
        {panel.footnote ? (
          <Text style={[styles.panelFootnote, { color: visual.panelSoftText }]} numberOfLines={2}>
            *{concise(panel.footnote, budget.panelFootnote)}
          </Text>
        ) : null}
      </View>
    );
  }

  if (panel.variant === 'focus' || panel.variant === 'trust') {
    return (
      <View
        style={[
          styles.panelCard,
          compact && styles.panelCardCompact,
          {
            backgroundColor: visual.panelBg,
            borderColor: visual.panelBorder,
          },
        ]}
      >
        <View style={styles.panelHeaderLine}>
          <Text style={[styles.panelTitle, { color: visual.panelTitle }]}>
            {panel.icon} {panel.title}
          </Text>
        </View>
        {panel.leadText ? (
          <Text style={[styles.panelLeadText, { color: visual.panelBody }]} numberOfLines={2}>
            {concise(panel.leadText, budget.panelLead)}
          </Text>
        ) : null}
        {(panel.calloutLabel || panel.calloutText) ? (
          <View style={[styles.panelEmphasisBubble, { backgroundColor: visual.panelBubble }]}>
            <Text style={[styles.panelCalloutLine, { color: visual.panelBody }]} numberOfLines={2}>
              {panel.calloutLabel ? <Text style={[styles.panelCalloutLabel, { color: visual.panelTitle }]}>{panel.calloutLabel}: </Text> : null}
              {concise(panel.calloutText, budget.panelCallout)}
            </Text>
          </View>
        ) : null}
        {panel.footnote ? (
          <Text style={[styles.panelFootnote, { color: visual.panelSoftText }]} numberOfLines={2}>
            {concise(panel.footnote, budget.panelFootnote)}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View
      style={[
        styles.panelCard,
        compact && styles.panelCardCompact,
        {
          backgroundColor: visual.panelBg,
          borderColor: visual.panelBorder,
        },
      ]}
    >
      <View style={styles.panelHeaderLine}>
        <Text style={[styles.panelTitle, { color: visual.panelTitle }]}>
          {panel.icon} {panel.title}
        </Text>
      </View>
      {panel.lines.map((line, idx) => (
        <Text key={`${panel.title}-line-${idx}`} style={[styles.panelLine, { color: visual.panelBody }]} numberOfLines={2}>
          {idx === 0 ? concise(line, compact ? budget.genericLead : budget.genericLead + 10) : `• ${concise(line, compact ? budget.genericBullet : budget.genericBullet + 10)}`}
        </Text>
      ))}
      {panel.emphasis ? (
        <View style={[styles.panelEmphasisBubble, { backgroundColor: visual.panelBubble }]}>
          <Text style={[styles.panelEmphasis, { color: visual.panelTitle }]} numberOfLines={2}>
            {concise(panel.emphasis, budget.panelEmphasis)}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function MatchCard({
  user1Name,
  user2Name,
  user1Sign,
  user2Sign,
  compatibilityScore,
  relationshipType,
  relationLabel,
  aiSummary,
  cardSummary,
  traitAxes,
  aspectsCount,
  scoreBreakdown,
  displayMetrics,
}: MatchCardProps) {
  const overallScore = clampScore(scoreBreakdown?.overall, compatibilityScore);
  const theme = relationTheme(relationshipType, relationLabel);
  const visual = theme.visual;
  const budget = useMemo(() => relationCopyBudget(relationshipType), [relationshipType]);
  const safeAxes = useMemo(() => (traitAxes ?? []).slice(0, 6), [traitAxes]);
  const metrics = useMemo(() => {
    const official = normalizeOfficialMetrics(displayMetrics, relationshipType);
    if (official.length > 0) return official;
    return deriveMetrics(relationshipType, overallScore, scoreBreakdown, safeAxes);
  }, [displayMetrics, relationshipType, overallScore, scoreBreakdown, safeAxes]);
  const summary = useMemo(
    () => concise(cardSummary || aiSummary || 'Birbiriniz için neyin önemli olduğunu birlikte daha net görüyorsunuz.', budget.summary),
    [aiSummary, budget.summary, cardSummary],
  );
  const panels = useMemo(
    () => buildPanels(relationshipType, user1Name, user2Name, safeAxes, summary, overallScore, budget),
    [relationshipType, user1Name, user2Name, safeAxes, summary, overallScore, budget],
  );
  const { strongest, caution } = useMemo(() => strongestAndCautionAxes(safeAxes), [safeAxes]);

  return (
    <View style={styles.frame} collapsable={false}>
      <LinearGradient
        colors={visual.cardGradient}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.94, y: 1 }}
        style={styles.card}
      >
        <GalaxyBackdrop visual={visual} />

        <View style={styles.topHeader}>
          <View style={[styles.topHeaderLine, { backgroundColor: visual.headerLine }]} />
          <Text style={[styles.topHeaderText, { color: visual.headerText }]}>🪐 {theme.title} • {theme.cardKind}</Text>
          <View style={[styles.topHeaderLine, { backgroundColor: visual.headerLine }]} />
        </View>

        <Text style={[styles.nameTitle, { color: visual.nameText }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.72}>
          {user1Name}
          <Text style={[styles.nameConnector, { color: visual.connectorText }]}> {theme.connector} </Text>
          {user2Name}
        </Text>
        <Text style={[styles.nameSubline, { color: visual.sublineText }]} numberOfLines={2}>
          {summary}
        </Text>
        <View style={styles.centerStageSpacer} />

        <View style={styles.scoreBannerWrap}>
          <LinearGradient
            colors={visual.scoreGradient}
            start={{ x: 0, y: 0.45 }}
            end={{ x: 1, y: 0.55 }}
            style={[
              styles.scoreBanner,
              {
                borderColor: visual.scoreBorder,
                shadowColor: visual.scoreShadow,
              },
            ]}
          >
            <Text style={styles.scoreBannerText}>
              GENEL UYUM: <Text style={styles.scoreBannerValue}>{overallScore}</Text> / 100
            </Text>
          </LinearGradient>
        </View>

        <MetricRow items={metrics} visual={visual} />

        <View style={styles.panelGrid}>
          <InsightPanel panel={panels[0]} compact visual={visual} budget={budget} />
          <InsightPanel panel={panels[1]} compact visual={visual} budget={budget} />
          <InsightPanel panel={panels[2]} compact visual={visual} budget={budget} />
          <InsightPanel panel={panels[3]} compact visual={visual} budget={budget} />
        </View>

        <View
          style={[
            styles.summaryBand,
            {
              backgroundColor: visual.summaryBg,
              borderColor: visual.summaryBorder,
            },
          ]}
        >
          <Text style={[styles.summaryBandMain, { color: visual.summaryMainText }]} numberOfLines={1}>
            En güçlü bağ: {concise(strongest, budget.strongest)}
          </Text>
          <Text style={[styles.summaryBandSub, { color: visual.summarySubText }]} numberOfLines={1}>
            Dikkat: {concise(caution, budget.caution)}
          </Text>
        </View>

        <View
          style={[
            styles.footerCtaWrap,
            {
              backgroundColor: visual.footerBg,
              borderColor: visual.footerBorder,
            },
          ]}
        >
          <Text style={[styles.footerCta, { color: visual.footerMainText }]} numberOfLines={1}>
            ✨ {theme.footerCta} • @{`astroguru`}
          </Text>
          <Text style={[styles.footerTags, { color: visual.footerSoftText }]} numberOfLines={1}>
            #{relationshipType === 'FRIENDSHIP' ? 'arkadaşlık' : relationshipType === 'LOVE' ? 'aşk' : relationshipType === 'BUSINESS' ? 'işuyumu' : relationshipType === 'FAMILY' ? 'aile' : relationshipType === 'RIVAL' ? 'rekabet' : 'uyum'} #uyum #mysticai
          </Text>
          <Text style={[styles.footerMeta, { color: visual.footerSoftText }]} numberOfLines={1}>
            {user1Sign} • {user2Sign} • {aspectsCount} açı
          </Text>
        </View>

        <View style={styles.footerBottomSpacer} />
      </LinearGradient>
    </View>
  );
}

export default memo(MatchCard);

const styles = StyleSheet.create({
  frame: {
    width: 360,
    height: 720,
    borderRadius: 30,
    overflow: 'hidden',
    backgroundColor: '#F2E6FB',
  },
  card: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 20,
    position: 'relative',
  },
  galaxyLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  topHeader: {
    paddingTop: 3,
    paddingBottom: 3,
    marginHorizontal: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  topHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(126, 86, 170, 0.18)',
  },
  topHeaderText: {
    textAlign: 'center',
    color: '#725394',
    fontSize: 11.4,
    fontFamily: UI_FONT_BOLD,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  nameTitle: {
    marginTop: 14,
    textAlign: 'center',
    color: '#7C49B4',
    fontSize: 38,
    lineHeight: 42,
    fontFamily: DISPLAY_SCRIPT,
    textShadowColor: 'rgba(255,255,255,0.86)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
  nameConnector: {
    color: '#9E6BD4',
    fontFamily: DISPLAY_SERIF,
    fontSize: 28,
  },
  centerStageSpacer: {
    height: 12,
  },
  nameSubline: {
    marginTop: 8,
    textAlign: 'center',
    color: '#6D5A8F',
    fontSize: 13.2,
    lineHeight: 18.2,
    fontFamily: UI_FONT,
    paddingHorizontal: 30,
  },
  scoreBannerWrap: {
    alignItems: 'center',
    marginTop: 2,
  },
  scoreBanner: {
    minWidth: 278,
    borderRadius: 22,
    borderWidth: 1.4,
    borderColor: 'rgba(255,255,255,0.58)',
    paddingHorizontal: 20,
    paddingVertical: 9,
    shadowColor: '#B06DE4',
    shadowOpacity: 0.28,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 4,
  },
  scoreBannerText: {
    textAlign: 'center',
    color: '#FFFFFF',
    fontSize: 14.5,
    lineHeight: 19,
    fontFamily: UI_FONT_BOLD,
    textShadowColor: 'rgba(76, 34, 120, 0.28)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  scoreBannerValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: UI_FONT_BOLD,
  },
  metricBand: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.66)',
    backgroundColor: 'rgba(255,255,255,0.58)',
    paddingHorizontal: 10,
    paddingVertical: 9,
    shadowColor: '#D8B7F4',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  metricRow: {
    minHeight: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 3,
    paddingHorizontal: 4,
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    color: '#66468C',
    fontSize: 11.6,
    lineHeight: 14.2,
    fontFamily: UI_FONT_BOLD,
  },
  metricValueText: {
    color: '#563381',
    fontFamily: UI_FONT_BOLD,
  },
  metricDivider: {
    color: 'rgba(101,70,140,0.34)',
    fontSize: 10,
    marginHorizontal: 1,
  },
  panelGrid: {
    marginTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7,
    justifyContent: 'space-between',
  },
  panelCard: {
    width: 164,
    borderRadius: 16,
    borderWidth: 1.1,
    borderColor: 'rgba(255,255,255,0.74)',
    backgroundColor: 'rgba(255,255,255,0.52)',
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 5,
    shadowColor: '#D4B2F0',
    shadowOpacity: 0.12,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 10,
    elevation: 2,
  },
  panelCardCompact: {
    minHeight: 120,
  },
  panelHeaderLine: {
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(120, 87, 160, 0.12)',
    paddingBottom: 4,
  },
  panelTitle: {
    color: '#6A4595',
    fontSize: 12,
    lineHeight: 14.8,
    fontFamily: DISPLAY_SERIF,
    fontWeight: '700',
  },
  panelLine: {
    color: '#654D87',
    fontSize: 10.5,
    lineHeight: 14.4,
    fontFamily: UI_FONT,
  },
  panelLabel: {
    color: '#6E4C95',
    fontSize: 10.2,
    lineHeight: 12.8,
    fontFamily: UI_FONT_BOLD,
    marginTop: -1,
  },
  panelLeadText: {
    color: '#654D87',
    fontSize: 10.2,
    lineHeight: 13.6,
    fontFamily: UI_FONT,
  },
  duoRowsWrap: {
    gap: 3,
  },
  duoRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  duoRowName: {
    color: '#5F3F86',
    fontSize: 10.6,
    lineHeight: 14,
    fontFamily: UI_FONT_BOLD,
    maxWidth: 56,
  },
  duoRowValue: {
    flex: 1,
    color: '#654D87',
    fontSize: 9.9,
    lineHeight: 13.2,
    fontFamily: UI_FONT,
  },
  panelEmphasisBubble: {
    marginTop: 1,
    borderRadius: 11,
    backgroundColor: 'rgba(227, 202, 246, 0.46)',
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  panelEmphasis: {
    color: '#6E5091',
    fontSize: 10.1,
    lineHeight: 13.4,
    fontFamily: UI_FONT_BOLD,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  panelCalloutLine: {
    color: '#694C8E',
    fontSize: 9.9,
    lineHeight: 13.2,
    fontFamily: UI_FONT,
  },
  panelCalloutLabel: {
    color: '#5E3D84',
    fontFamily: UI_FONT_BOLD,
  },
  panelFootnote: {
    color: '#7A629B',
    fontSize: 9.4,
    lineHeight: 12.5,
    fontFamily: UI_FONT,
  },
  summaryBand: {
    marginTop: 10,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.72)',
    backgroundColor: 'rgba(255,255,255,0.56)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 2,
  },
  summaryBandMain: {
    textAlign: 'center',
    color: '#603F89',
    fontSize: 11.9,
    lineHeight: 14.5,
    fontFamily: DISPLAY_SERIF,
    fontWeight: '700',
  },
  summaryBandSub: {
    textAlign: 'center',
    color: '#6E518F',
    fontSize: 10.8,
    lineHeight: 14.2,
    fontFamily: UI_FONT,
  },
  footerCtaWrap: {
    marginTop: 10,
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.64)',
    backgroundColor: 'rgba(255,255,255,0.46)',
    paddingVertical: 8,
  },
  footerCta: {
    color: '#64448C',
    fontSize: 11.4,
    lineHeight: 14.2,
    fontFamily: UI_FONT_BOLD,
  },
  footerTags: {
    color: '#73569A',
    fontSize: 9.8,
    lineHeight: 12.2,
    fontFamily: UI_FONT,
  },
  footerMeta: {
    color: '#8A70A6',
    fontSize: 9.2,
    lineHeight: 11.2,
    fontFamily: UI_FONT,
  },
  footerBottomSpacer: {
    height: 22,
  },
});
