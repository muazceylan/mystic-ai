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

function relationTheme(type?: RelationshipType, relationLabel?: string) {
  switch (type) {
    case 'LOVE':
      return {
        title: 'EŞ UYUMU',
        cardKind: 'SYNASTRY KARTI',
        connector: '♡',
        footerCta: 'Kendi uyum kartını oluştur',
        primaryGlow: '#FF4FD8',
        secondaryGlow: '#A855F7',
      };
    case 'FRIENDSHIP':
      return {
        title: 'ARKADAŞLIK UYUMU',
        cardKind: 'SYNASTRY KARTI',
        connector: '♡',
        footerCta: 'Kendi arkadaşlık kartını oluştur',
        primaryGlow: '#FF4FD8',
        secondaryGlow: '#7C3AED',
      };
    case 'BUSINESS':
      return {
        title: 'İŞ ORTAKLIĞI UYUMU',
        cardKind: 'SYNASTRY KARTI',
        connector: '✦',
        footerCta: 'Kendi iş uyum kartını oluştur',
        primaryGlow: '#F472B6',
        secondaryGlow: '#2563EB',
      };
    case 'FAMILY':
      return {
        title: 'AİLE UYUMU',
        cardKind: 'SYNASTRY KARTI',
        connector: '♡',
        footerCta: 'Kendi aile uyum kartını oluştur',
        primaryGlow: '#FB7185',
        secondaryGlow: '#A855F7',
      };
    case 'RIVAL':
      return {
        title: 'REKABET DİNAMİĞİ',
        cardKind: 'SYNASTRY KARTI',
        connector: '✦',
        footerCta: 'Kendi rekabet kartını oluştur',
        primaryGlow: '#F43F5E',
        secondaryGlow: '#7C3AED',
      };
    default:
      return {
        title: (relationLabel || 'UYUM').toUpperCase(),
        cardKind: 'SYNASTRY KARTI',
        connector: '✦',
        footerCta: 'Kendi yıldız kartını oluştur',
        primaryGlow: '#FF4FD8',
        secondaryGlow: '#8B5CF6',
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
  return clip(cleaned, 18);
}

function traitPair(a?: string | null, b?: string | null, fallbackA = 'İlgi', fallbackB = 'Destek') {
  return `${compactTraitLabel(a, fallbackA)} + ${compactTraitLabel(b, fallbackB)}`;
}

function combineTraitList(values: Array<string | null | undefined>, fallback: string) {
  const unique = Array.from(
    new Set(
      values
        .map((v) => String(v ?? '').trim())
        .filter(Boolean),
    ),
  );
  if (!unique.length) return fallback;
  return clip(unique.map((v) => compactTraitLabel(v)).join(', '), 54);
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
): CardPanel[] {
  const templates = relationPanelTemplates(relationshipType);
  const linesFromSummary = summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => clip(s, 54))
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
        emphasis: clip(linesFromSummary[0] || 'Sevgi ritminiz birbirine iyi geliyor.', 54),
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
        ),
        calloutLabel: 'Altın kural',
        calloutText: clip(linesFromSummary[1] || 'Önce duygu, sonra çözüm.', 52),
        footnote: clip(traitAxes[1]?.note || 'Kırgınlık varsa önce onu duyun.', 50),
      },
      {
        icon: '🔥',
        title: 'Çekim & Tutku',
        lines: [],
        variant: 'focus',
        leadText: clip(attractionTone, 56),
        calloutLabel: 'Dikkat',
        calloutText: clip(
          `${compactTraitLabel(d3?.balancing, 'Rutin')} tarafı ihmal edilirse yanlış anlamalar büyüyebilir.`,
          54,
        ),
        footnote: clip(traitAxes[3]?.note || 'Açık konuşma çekimi korur.', 50),
      },
      {
        icon: '🛡️',
        title: 'Güven & Bağlılık',
        lines: [],
        variant: 'trust',
        leadText: clip(trustTone, 56),
        calloutLabel: 'İstikrarı besleyen anahtar',
        calloutText: clip(
          `${compactTraitLabel(d2?.dominant, 'Samimi açıklık')} + ${compactTraitLabel(d2?.balancing, 'Netlik')}`,
          54,
        ),
        footnote: clip(traitAxes[2]?.note || 'Söz-eylem uyumu bağı sakinleştirir.', 50),
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
        emphasis: clip(linesFromSummary[0] || 'Birlikte keşfetmeyi seviyorsunuz.', 54),
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
        calloutText: clip(linesFromSummary[1] || 'Kısa kaçamaklar bağınızı canlandırır.', 54),
        footnote: clip(traitAxes[1]?.note || 'Tempo farkında sırayla aktivite seçin.', 52),
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
        calloutText: clip(
          `${compactTraitLabel(d2?.dominant, 'Yanında olma')} + ${compactTraitLabel(d2?.balancing, 'Tutarlılık')}`,
          54,
        ),
        footnote: clip(traitAxes[2]?.note || 'Yargısız dinlemek güveni artırır.', 52),
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
        calloutText: clip(`${compactTraitLabel(d3?.dominant, 'Empati')} + pozitif yaklaşım`, 54),
        footnote: clip(traitAxes[3]?.note || 'Zor anda ihtiyaç sorusu çok işe yarar.', 52),
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
        emphasis: clip(linesFromSummary[0] || 'Net hedef koyunca verim artar.', 54),
      },
      {
        icon: '💬',
        title: 'Karar & İletişim',
        lines: [],
        variant: 'bond',
        leadLabel: 'Karar ritmi',
        leadText: combineTraitList([d1?.dominant, d1?.balancing, d2?.dominant], 'Netlik, hız, koordinasyon'),
        calloutLabel: 'Toplantı kuralı',
        calloutText: clip(linesFromSummary[1] || 'Önce hedef, sonra seçenek.', 52),
        footnote: clip(traitAxes[1]?.note || 'Rol netliği sürtünmeyi azaltır.', 50),
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
        calloutText: clip(`${compactTraitLabel(d2?.balancing, 'Yetki')} belirsizliği yavaşlatır.`, 52),
        footnote: clip(traitAxes[2]?.note || 'Sorumlulukları yazılı netleştirin.', 50),
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
        calloutText: clip(`${compactTraitLabel(d3?.dominant, 'Takip')} + ${compactTraitLabel(d3?.balancing, 'Şeffaflık')}`, 54),
        footnote: clip(traitAxes[3]?.note || 'Teslim tarihi netliği güven kurar.', 50),
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
        emphasis: clip(linesFromSummary[0] || 'Şefkat diliniz farklı, niyetiniz ortak.', 54),
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
        calloutText: clip(linesFromSummary[1] || 'Küçük rutinler gerilimi azaltır.', 52),
        footnote: clip(traitAxes[1]?.note || 'Rol paylaşımı görünür olsun.', 50),
      },
      {
        icon: '💬',
        title: 'Duygu & İletişim',
        lines: [],
        variant: 'focus',
        leadText: 'Duygular konuşulunca yanlış anlamalar hızla çözülür.',
        calloutLabel: 'Dikkat',
        calloutText: clip(`${compactTraitLabel(d2?.balancing, 'Savunma')} yükselirse tonu yumuşatın.`, 54),
        footnote: clip(traitAxes[2]?.note || 'Önce duygu, sonra çözüm daha iyi işler.', 50),
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
        calloutText: clip(`${compactTraitLabel(d3?.dominant, 'Sahip çıkma')} + ${compactTraitLabel(d3?.balancing, 'Sakinlik')}`, 54),
        footnote: clip(traitAxes[3]?.note || 'Yük paylaşımı aile bağını güçlendirir.', 50),
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
        emphasis: clip(linesFromSummary[0] || 'Tempo ve psikolojik üstünlük oyunu belirgin.', 54),
      },
      {
        icon: '🧠',
        title: 'Zihinsel Oyun',
        lines: [],
        variant: 'bond',
        leadLabel: 'Avantaj alanı',
        leadText: combineTraitList([d1?.dominant, d3?.dominant, d1?.balancing], 'Strateji, zamanlama, okuma gücü'),
        calloutLabel: 'Kritik hamle',
        calloutText: clip(linesFromSummary[1] || 'Rakibin ritmini bozarken kendi düzenini koru.', 54),
        footnote: clip(traitAxes[1]?.note || 'Sabırlı bekleme de avantaj yaratır.', 50),
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
        calloutText: clip(`${compactTraitLabel(d2?.balancing, 'Ego sürtünmesi')} yükselirse oyun sertleşir.`, 54),
        footnote: clip(traitAxes[2]?.note || 'Kural ve sınır netliği tırmanışı azaltır.', 50),
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
        calloutText: clip(`${compactTraitLabel(d3?.dominant, 'Odak')} + ${compactTraitLabel(d0?.balancing, 'Disiplin')}`, 54),
        footnote: clip(traitAxes[3]?.note || 'Güçlü alana yüklenmek daha etkilidir.', 50),
      },
    ];
  }

  return templates.map((tpl, idx) => {
    const axis = traitAxes[idx] ?? traitAxes[idx % Math.max(1, traitAxes.length)] ?? null;
    const dir = axisDirection(axis);
    const axisNote = clip(axis?.note, 52);
    const scoreHint = dir
      ? clip(`${dir.dominant} daha baskın; ${dir.balancing.toLowerCase()} denge kurar.`, 52)
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
  const sorted = [...traitAxes].sort(
    (a, b) => Math.abs(clampScore(b.score0to100, 50) - 50) - Math.abs(clampScore(a.score0to100, 50) - 50),
  );
  const strongest = axisDirection(sorted[0])?.dominant ?? 'Ortak ritim';
  const caution = axisDirection(sorted[sorted.length - 1])?.balancing ?? 'İletişim zamanlaması';
  return { strongest, caution };
}

function GalaxyBackdrop() {
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
      <Svg width="100%" height="100%" viewBox="0 0 360 540">
        <Defs>
          <SvgRadialGradient id="lavGlowA" cx="50%" cy="12%" r="76%">
            <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.88" />
            <Stop offset="45%" stopColor="#F5E9FF" stopOpacity="0.42" />
            <Stop offset="100%" stopColor="#F5E9FF" stopOpacity="0.02" />
          </SvgRadialGradient>
          <SvgRadialGradient id="lavGlowB" cx="18%" cy="58%" r="52%">
            <Stop offset="0%" stopColor="#F5CFFF" stopOpacity="0.26" />
            <Stop offset="100%" stopColor="#F5CFFF" stopOpacity="0" />
          </SvgRadialGradient>
          <SvgRadialGradient id="lavGlowC" cx="84%" cy="62%" r="48%">
            <Stop offset="0%" stopColor="#E7D7FF" stopOpacity="0.28" />
            <Stop offset="100%" stopColor="#E7D7FF" stopOpacity="0" />
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
          d="M-8 476 C40 440, 88 444, 132 478 C172 506, 220 506, 270 478 C312 452, 340 454, 368 486 L368 540 L-8 540 Z"
          fill="rgba(242, 221, 255, 0.75)"
        />
        <Path
          d="M-6 500 C38 476, 86 480, 128 502 C172 526, 224 526, 276 500 C314 484, 340 486, 366 506 L366 540 L-6 540 Z"
          fill="rgba(225, 194, 247, 0.72)"
        />

        <Path d="M2 166 C70 214, 132 214, 180 186 C228 214, 290 214, 358 166" stroke="rgba(255,255,255,0.34)" strokeWidth={1.9} fill="none" />
        <Path d="M-2 186 C70 232, 132 232, 180 206 C228 232, 290 232, 362 186" stroke="rgba(218,180,247,0.34)" strokeWidth={1.8} fill="none" />
        <Path d="M16 154 C84 198, 138 198, 180 176 C222 198, 276 198, 344 154" stroke="rgba(255,255,255,0.22)" strokeWidth={1.2} fill="none" />
        <Path d="M18 446 H342" stroke="rgba(130, 93, 170, 0.12)" strokeWidth={1} />
        <Path d="M18 478 H342" stroke="rgba(130, 93, 170, 0.10)" strokeWidth={1} />

        {hearts.map(([x, y, size, opacity], idx) => (
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

function MetricRow({ items }: { items: CardMetric[] }) {
  return (
    <View style={styles.metricBand}>
      <View style={styles.metricRow}>
        {items.map((item, idx) => (
          <View key={`${item.label}-${idx}`} style={styles.metricItem}>
            <Text style={styles.metricText}>
              {item.icon} {item.label}: <Text style={styles.metricValueText}>{item.value}</Text>
            </Text>
            {idx < items.length - 1 ? <Text style={styles.metricDivider}>|</Text> : null}
          </View>
        ))}
      </View>
    </View>
  );
}

function InsightPanel({ panel, compact = false }: { panel: CardPanel; compact?: boolean }) {
  if (panel.variant === 'duo' && panel.duoRows?.length) {
    return (
      <View style={[styles.panelCard, compact && styles.panelCardCompact]}>
        <View style={styles.panelHeaderLine}>
          <Text style={styles.panelTitle}>
            {panel.icon} {panel.title}
          </Text>
        </View>
        <View style={styles.duoRowsWrap}>
          {panel.duoRows.slice(0, 2).map((row, idx) => (
            <View key={`${panel.title}-duo-${idx}`} style={styles.duoRow}>
              <Text style={styles.duoRowName} numberOfLines={1}>
                {row.name}:
              </Text>
              <Text style={styles.duoRowValue} numberOfLines={1}>
                {clip(row.text, 24)}
              </Text>
            </View>
          ))}
        </View>
        {panel.emphasis ? (
          <View style={styles.panelEmphasisBubble}>
            <Text style={styles.panelEmphasis} numberOfLines={2}>
              {clip(panel.emphasis, 56)}
            </Text>
          </View>
        ) : null}
      </View>
    );
  }

  if (panel.variant === 'bond') {
    return (
      <View style={[styles.panelCard, compact && styles.panelCardCompact]}>
        <View style={styles.panelHeaderLine}>
          <Text style={styles.panelTitle}>
            {panel.icon} {panel.title}
          </Text>
        </View>
        {panel.leadLabel ? <Text style={styles.panelLabel}>{panel.leadLabel}:</Text> : null}
        {panel.leadText ? (
          <Text style={styles.panelLeadText} numberOfLines={2}>
            {clip(panel.leadText, 58)}
          </Text>
        ) : null}
        {(panel.calloutLabel || panel.calloutText) ? (
          <View style={styles.panelEmphasisBubble}>
            <Text style={styles.panelCalloutLine} numberOfLines={2}>
              {panel.calloutLabel ? <Text style={styles.panelCalloutLabel}>{panel.calloutLabel}: </Text> : null}
              {clip(panel.calloutText, 56)}
            </Text>
          </View>
        ) : null}
        {panel.footnote ? (
          <Text style={styles.panelFootnote} numberOfLines={2}>
            *{clip(panel.footnote, 54)}
          </Text>
        ) : null}
      </View>
    );
  }

  if (panel.variant === 'focus' || panel.variant === 'trust') {
    return (
      <View style={[styles.panelCard, compact && styles.panelCardCompact]}>
        <View style={styles.panelHeaderLine}>
          <Text style={styles.panelTitle}>
            {panel.icon} {panel.title}
          </Text>
        </View>
        {panel.leadText ? (
          <Text style={styles.panelLeadText} numberOfLines={2}>
            {clip(panel.leadText, 58)}
          </Text>
        ) : null}
        {(panel.calloutLabel || panel.calloutText) ? (
          <View style={styles.panelEmphasisBubble}>
            <Text style={styles.panelCalloutLine} numberOfLines={2}>
              {panel.calloutLabel ? <Text style={styles.panelCalloutLabel}>{panel.calloutLabel}: </Text> : null}
              {clip(panel.calloutText, 56)}
            </Text>
          </View>
        ) : null}
        {panel.footnote ? (
          <Text style={styles.panelFootnote} numberOfLines={2}>
            {clip(panel.footnote, 54)}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View style={[styles.panelCard, compact && styles.panelCardCompact]}>
      <View style={styles.panelHeaderLine}>
        <Text style={styles.panelTitle}>
          {panel.icon} {panel.title}
        </Text>
      </View>
      {panel.lines.map((line, idx) => (
        <Text key={`${panel.title}-line-${idx}`} style={styles.panelLine} numberOfLines={2}>
          {idx === 0 ? clip(line, compact ? 56 : 64) : `• ${clip(line, compact ? 52 : 60)}`}
        </Text>
      ))}
      {panel.emphasis ? (
        <View style={styles.panelEmphasisBubble}>
          <Text style={styles.panelEmphasis} numberOfLines={2}>
            {clip(panel.emphasis, 56)}
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
  const safeAxes = useMemo(() => (traitAxes ?? []).slice(0, 6), [traitAxes]);
  const metrics = useMemo(() => {
    const official = normalizeOfficialMetrics(displayMetrics, relationshipType);
    if (official.length > 0) return official;
    return deriveMetrics(relationshipType, overallScore, scoreBreakdown, safeAxes);
  }, [displayMetrics, relationshipType, overallScore, scoreBreakdown, safeAxes]);
  const summary = useMemo(
    () => clip(cardSummary || aiSummary || 'Birlikteyken hem çekim hem öğrenme alanı oluşturan dikkat çekici bir bağ görünümü var.', 110),
    [aiSummary, cardSummary],
  );
  const panels = useMemo(
    () => buildPanels(relationshipType, user1Name, user2Name, safeAxes, summary, overallScore),
    [relationshipType, user1Name, user2Name, safeAxes, summary, overallScore],
  );
  const { strongest, caution } = useMemo(() => strongestAndCautionAxes(safeAxes), [safeAxes]);

  return (
    <View style={styles.frame} collapsable={false}>
      <LinearGradient
        colors={['#F8F1FF', '#F0E3FB', '#E6D3F6']}
        start={{ x: 0.08, y: 0 }}
        end={{ x: 0.94, y: 1 }}
        style={styles.card}
      >
        <GalaxyBackdrop />

        <View style={styles.topHeader}>
          <View style={styles.topHeaderLine} />
          <Text style={styles.topHeaderText}>🪐 {theme.title} • {theme.cardKind}</Text>
          <View style={styles.topHeaderLine} />
        </View>

        <Text style={styles.nameTitle} numberOfLines={1}>
          {user1Name}
          <Text style={styles.nameConnector}> {theme.connector} </Text>
          {user2Name}
        </Text>
        <View style={styles.centerStageSpacer} />

        <View style={styles.scoreBannerWrap}>
          <LinearGradient
            colors={['rgba(197,146,243,0.95)', 'rgba(152,103,214,0.95)']}
            start={{ x: 0, y: 0.45 }}
            end={{ x: 1, y: 0.55 }}
            style={styles.scoreBanner}
          >
            <Text style={styles.scoreBannerText}>
              GENEL UYUM: <Text style={styles.scoreBannerValue}>{overallScore}</Text> / 100
            </Text>
          </LinearGradient>
        </View>

        <MetricRow items={metrics} />

        <View style={styles.panelGrid}>
          <InsightPanel panel={panels[0]} compact />
          <InsightPanel panel={panels[1]} compact />
          <InsightPanel panel={panels[2]} compact />
          <InsightPanel panel={panels[3]} compact />
        </View>

        <View style={styles.summaryBand}>
          <Text style={styles.summaryBandMain} numberOfLines={1}>
            En güçlü bağınız: {clip(strongest, 28)}
          </Text>
          <Text style={styles.summaryBandSub} numberOfLines={1}>
            Dikkat noktası: {clip(caution, 34)}
          </Text>
        </View>

        <View style={styles.footerCtaWrap}>
          <Text style={styles.footerCta} numberOfLines={1}>
            ✨ {theme.footerCta} • @{`mysticai`}
          </Text>
          <Text style={styles.footerTags} numberOfLines={1}>
            #{relationshipType === 'FRIENDSHIP' ? 'arkadaşlık' : relationshipType === 'LOVE' ? 'aşk' : 'synastry'} #uyum #synastry
          </Text>
          <Text style={styles.footerMeta} numberOfLines={1}>
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
    height: 36,
  },
  nameSubline: {
    marginTop: 6,
    textAlign: 'center',
    color: '#6D5A8F',
    fontSize: 12.5,
    lineHeight: 16.5,
    fontFamily: UI_FONT,
    paddingHorizontal: 24,
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
    fontSize: 10.6,
    lineHeight: 14.4,
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
    fontSize: 10.3,
    lineHeight: 13.8,
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
    fontSize: 10.1,
    lineHeight: 13.6,
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
