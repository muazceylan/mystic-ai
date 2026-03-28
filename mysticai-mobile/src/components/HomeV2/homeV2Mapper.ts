import type { UserProfile } from '../../store/useAuthStore';
import type { DailyLifeGuideActivity, NightSkyProjectionResponse, SkyPulseResponse } from '../../services/astrology.service';
import type { HomeBrief } from '../../services/oracle.service';
import type { CosmicSummaryCard, CosmicSummaryResponse } from '../../services/cosmic.service';
import type { HomeV2DecisionCompassItem, HomeV2Model, HomeV2TransitMetaChip, HomeV2WeeklyItem } from './homeV2.types';

interface BuildHomeV2ModelParams {
  user: UserProfile | null;
  onboardingFocusPoints?: string[];
  homeBrief: HomeBrief | null;
  skyPulse: SkyPulseResponse | null;
  birthMoonProjection?: NightSkyProjectionResponse | null;
  cosmicSummary: CosmicSummaryResponse | null;
  homeBriefError?: boolean;
  cosmicSummaryError?: boolean;
}

const QUICK_ACTIONS: HomeV2Model['quickActions'] = [
  { id: 'dream', label: 'Rüya Ekle' },
  { id: 'compatibility', label: 'Yıldız Eşi' },
  { id: 'planner', label: 'Planlayıcı' },
  { id: 'chart', label: 'Haritam' },
];

const FALLBACK_COMPASS: HomeV2DecisionCompassItem[] = [
  { id: 'career', label: 'Kariyer & İş', score: 65, icon: 'career', categoryKey: 'CAREER' },
  { id: 'beauty', label: 'Güzellik & Bakım', score: 65, icon: 'beauty', categoryKey: 'BEAUTY' },
  { id: 'finance', label: 'Finans', score: 36, icon: 'finance', categoryKey: 'FINANCE' },
];

const FALLBACK_WEEKLY: HomeV2WeeklyItem[] = [
  { id: 'strength', title: 'İçsel Güç', badge: 'Yüksek', tone: 'high', preview: '1 adım: Nefes çalışması yap.' },
  { id: 'opportunity', title: 'Altın Fırsat', badge: 'Orta', tone: 'medium', preview: '1 adım: Başvuru / teklif gönder.' },
  { id: 'threat', title: 'Kritik Uyarı', badge: 'Risk', tone: 'risk', preview: '1 adım: Tepki vermeden dur.' },
  { id: 'weakness', title: 'Enerji Kaybı', badge: 'Risk', tone: 'risk', preview: '1 adım: Hafif aktivite seç.' },
];

const TR_MONTHS_SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'] as const;

function parseYmd(input?: string | null): Date | null {
  if (!input) return null;
  const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) {
    const d = new Date(input);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const day = Number(m[3]);
  return new Date(y, mo, day);
}

function formatDateShortTr(input?: string | null): string {
  const d = parseYmd(input) ?? new Date();
  const month = TR_MONTHS_SHORT[d.getMonth()] ?? '';
  return `${d.getDate()} ${month}`;
}

function formatWeekRangeTr(referenceInput?: string | null): string {
  const ref = parseYmd(referenceInput) ?? new Date();
  const start = new Date(ref);
  const day = start.getDay(); // 0 Sun - 6 Sat
  const diffToMonday = day === 0 ? -6 : 1 - day;
  start.setDate(start.getDate() + diffToMonday);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  return `${start.getDate()} ${TR_MONTHS_SHORT[start.getMonth()]} – ${end.getDate()} ${TR_MONTHS_SHORT[end.getMonth()]}`;
}

function trimLine(input: string | null | undefined, fallback: string, maxLen = 58): string {
  const text = (input ?? '').trim() || fallback;
  if (text.length <= maxLen) return text;
  return `${text.slice(0, maxLen - 1).trim()}…`;
}

function inferRiskLabel(impactScore: number | null | undefined): string {
  if (typeof impactScore !== 'number') return 'Orta';
  if (impactScore >= 72) return 'Düşük';
  if (impactScore <= 42) return 'Yüksek';
  return 'Orta';
}

function inferEmotionLabel(summary: string | null | undefined): string {
  const s = (summary ?? '').toLowerCase();
  if (!s) return 'Sakin';
  if (s.includes('hareket') || s.includes('aktif') || s.includes('atak')) return 'Canlı';
  if (s.includes('dikkat') || s.includes('uyarı') || s.includes('temkin')) return 'Temkinli';
  if (s.includes('yumuşak') || s.includes('sakin') || s.includes('akış')) return 'Sakin';
  return 'Dengeli';
}

function mapCompassIconFromText(input: string): HomeV2DecisionCompassItem['icon'] {
  const haystack = input.toLowerCase();
  if (haystack.includes('kariyer') || haystack.includes('iş') || haystack.includes('career') || haystack.includes('work')) return 'career';
  if (haystack.includes('güzellik') || haystack.includes('bakım') || haystack.includes('beauty')) return 'beauty';
  if (haystack.includes('finans') || haystack.includes('para') || haystack.includes('money') || haystack.includes('finance')) return 'finance';
  if (haystack.includes('aşk') || haystack.includes('ilişki') || haystack.includes('love') || haystack.includes('partner')) return 'heart';
  if (haystack.includes('sosyal') || haystack.includes('arkadaş') || haystack.includes('social')) return 'social';
  if (haystack.includes('sağlık') || haystack.includes('health') || haystack.includes('wellness')) return 'health';
  return 'default';
}

function buildCompass(cosmicSummary: CosmicSummaryResponse | null | undefined): HomeV2DecisionCompassItem[] {
  const date = cosmicSummary?.date ?? undefined;
  const activities = cosmicSummary?.dailyGuide?.activities ?? [];
  if (activities.length) {
    const byGroup = new Map<string, { label: string; items: DailyLifeGuideActivity[] }>();
    for (const activity of activities) {
      const current = byGroup.get(activity.groupKey);
      if (current) {
        current.items.push(activity);
        continue;
      }
      byGroup.set(activity.groupKey, {
        label: activity.groupLabel || activity.activityLabel || 'Karar Alanı',
        items: [activity],
      });
    }

    const grouped = Array.from(byGroup.entries())
      .map(([groupKey, group]) => {
        const items = [...group.items].sort((a, b) => b.score - a.score);
        const avg = Math.round(items.reduce((sum, item) => sum + item.score, 0) / Math.max(items.length, 1));
        const top = items[0];
        return {
          id: `${groupKey}-${top?.activityKey ?? 'group'}`,
          categoryKey: groupKey,
          label: trimLine(group.label, 'Karar Alanı', 22),
          score: avg,
          icon: mapCompassIconFromText(`${groupKey} ${group.label} ${top?.activityLabel ?? ''}`),
          activityLabel: top?.activityLabel || group.label,
          date,
          itemCount: items.length,
          shortAdvice: top?.shortAdvice?.trim() || 'Bugün bu alanda dengeli ve bilinçli ilerle.',
          kind: avg <= 40 ? 'warning' : 'opportunity',
          subItems: items.slice(0, 4).map((entry) => ({
            id: `${groupKey}-${entry.activityKey}`,
            label: trimLine(entry.activityLabel, entry.activityLabel || 'Alt Kategori', 26),
            score: Math.round(entry.score),
          })),
        } satisfies HomeV2DecisionCompassItem;
      })
      .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label, 'tr'));

    if (grouped.length) return grouped;
  }

  const focusCards = cosmicSummary?.focusCards ?? [];
  if (!focusCards.length) return FALLBACK_COMPASS;

  const sorted = [...focusCards]
    .filter((card) => typeof card.score === 'number')
    .sort((a, b) => b.score - a.score);

  if (!sorted.length) return FALLBACK_COMPASS;

  return sorted.map((card, index) => ({
    id: `${card.categoryKey}-${card.activityKey}-${index}`,
    label: trimLine(card.categoryLabel || card.activityLabel, 'Karar Alanı', 22),
    score: Math.round(card.score),
    icon: mapCompassIconFromText(`${card.categoryKey} ${card.subCategoryKey} ${card.categoryLabel} ${card.activityLabel}`),
    categoryKey: card.categoryKey,
    activityLabel: card.activityLabel,
    date,
    itemCount: 1,
    shortAdvice: 'Bugün bu alanda dengeyi koruyarak küçük ama net bir adım at.',
    kind: Math.round(card.score) <= 40 ? 'warning' : 'opportunity',
    subItems: [
      {
        id: `${card.categoryKey}-${card.activityKey}-0`,
        label: trimLine(card.activityLabel, 'Alt Kategori', 26),
        score: Math.round(card.score),
      },
    ],
  }));
}

function mapWeeklyTitle(key: string): HomeV2WeeklyItem['title'] {
  switch (key) {
    case 'strength': return 'İçsel Güç';
    case 'opportunity': return 'Altın Fırsat';
    case 'threat': return 'Kritik Uyarı';
    case 'weakness': return 'Enerji Kaybı';
    default: return 'Bu Hafta';
  }
}

function mapWeeklyTone(key: string): HomeV2WeeklyItem['tone'] {
  if (key === 'strength') return 'high';
  if (key === 'opportunity') return 'medium';
  return 'risk';
}

function mapWeeklyBadge(key: string): string {
  if (key === 'strength') return 'Yüksek';
  if (key === 'opportunity') return 'Orta';
  return 'Risk';
}

function buildWeekly(homeBrief: HomeBrief | null): HomeV2WeeklyItem[] {
  if (!homeBrief?.weeklyCards?.length) return FALLBACK_WEEKLY;

  const order = ['strength', 'opportunity', 'threat', 'weakness'] as const;
  const byKey = new Map(homeBrief.weeklyCards.map((c) => [c.key, c]));

  return order.map((key) => {
    const card = byKey.get(key);
    return {
      id: key,
      title: mapWeeklyTitle(key),
      badge: mapWeeklyBadge(key),
      tone: mapWeeklyTone(key),
      preview: trimLine(card?.quickTip, FALLBACK_WEEKLY.find((item) => item.id === key)?.preview ?? '1 adım: Ritmini koru.', 44),
    };
  });
}

function buildTransitToday(homeBrief: HomeBrief | null, skyPulse: SkyPulseResponse | null): HomeV2Model['transitToday'] {
  const headline = trimLine(
    homeBrief?.transitHeadline || skyPulse?.dailyVibe,
    'Bugün gökyüzü ritmi akışta ilerliyor.',
    72,
  );
  const summary = trimLine(
    homeBrief?.transitSummary || homeBrief?.dailyEnergy || skyPulse?.dailyVibe,
    'Duygusal ritmini koruyup küçük ama net adımlar atmak daha verimli olabilir.',
    120,
  );

  const pointPool = [
    ...(homeBrief?.transitPoints ?? []),
    homeBrief?.actionMessage ? `Odak: ${homeBrief.actionMessage}` : null,
    skyPulse?.dailyVibe ? `Ritim: ${skyPulse.dailyVibe}` : null,
  ].filter(Boolean) as string[];

  const points = Array.from(new Set(pointPool.map((item) => item.trim()).filter(Boolean)))
    .map((item) => trimLine(item, item, 70))
    .slice(0, 4);

  const retroCount = skyPulse?.retrogradePlanets?.length ?? 0;
  const retroValue =
    retroCount === 0
      ? 'Sakin'
      : retroCount === 1
        ? trimLine(skyPulse?.retrogradePlanets?.[0], '1 retro', 18)
        : `${retroCount} retro`;

  const metaChips: HomeV2TransitMetaChip[] = [
    {
      id: 'moon_phase',
      label: 'Ay Fazı',
      value: trimLine(skyPulse?.moonPhase, 'Güncelleniyor', 20),
    },
    {
      id: 'moon_sign',
      label: 'Ay Burcu',
      value: trimLine(skyPulse?.moonSignTurkish ? `☾ ${skyPulse.moonSignTurkish}` : null, 'Belirsiz', 18),
    },
    {
      id: 'retro',
      label: 'Retro',
      value: retroValue,
    },
  ];

  return {
    headline,
    summary,
    points: points.length ? points : ['Bugün sezgini merkeze alıp ritmini küçük adımlarla kur.'],
    metaChips,
  };
}

function normalizeMoonPhaseLabel(phase: string | null | undefined): string {
  const value = (phase ?? '').trim();
  if (!value) return 'Ay fazı güncelleniyor';
  return value;
}

function normalizeBirthMoonPhaseTr(phaseLabel: string | null | undefined, phaseSetIndex5?: number | null): string {
  const label = (phaseLabel ?? '').trim().toLowerCase();
  if (label.includes('new')) return 'Yeni Ay';
  if (label.includes('waxing crescent')) return 'Büyüyen Hilal';
  if (label.includes('first quarter')) return 'İlk Dördün';
  if (label.includes('waxing gibbous')) return 'Şişkin Ay';
  if (label.includes('full')) return 'Dolunay';
  if (label.includes('waning gibbous')) return 'Küçülen Şişkin Ay';
  if (label.includes('last quarter') || label.includes('third quarter')) return 'Son Dördün';
  if (label.includes('waning crescent')) return 'Küçülen Hilal';

  if (typeof phaseSetIndex5 === 'number') {
    const map = ['Yeni Ay', 'Hilal', 'İlk Dördün', 'Şişkin / Dolunay', 'Küçülen'];
    return map[phaseSetIndex5] ?? 'Ay Fazı';
  }
  return 'Ay Fazı';
}

function buildHeroSubtitle(params: {
  skyPulse: SkyPulseResponse | null;
  birthMoonProjection?: NightSkyProjectionResponse | null;
  overallScore: number | null;
}): string {
  const projection = params.birthMoonProjection;
  const moon = projection?.moonPhase;
  if (moon && typeof moon.illuminationPercent === 'number') {
    const illumination = Math.round(moon.illuminationPercent);
    const english = (moon.phaseLabel ?? '').trim();
    const tr = normalizeBirthMoonPhaseTr(english, moon.phaseSetIndex5);
    return english
      ? `${tr} (${english}) • %${illumination} aydınlık`
      : `${tr} • %${illumination} aydınlık`;
  }

  const heroSubtitleTail = typeof params.overallScore === 'number' ? `• ${params.overallScore} genel ritim` : '• Günlük ritim';
  return `${normalizeMoonPhaseLabel(params.skyPulse?.moonPhase)} ${heroSubtitleTail}`;
}

export function buildHomeV2Model(params: BuildHomeV2ModelParams): HomeV2Model {
  const {
    user,
    homeBrief,
    skyPulse,
    birthMoonProjection,
    cosmicSummary,
    homeBriefError,
    cosmicSummaryError,
  } = params;

  const firstName = (user?.firstName ?? '').trim();
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
  const userName = firstName || fullName || user?.name || 'Misafir';

  const dateText = formatDateShortTr(skyPulse?.date ?? homeBrief?.generatedAt ?? null);
  const sunSign = (user?.zodiacSign ?? '').trim();
  const moonSign = (skyPulse?.moonSignTurkish ?? '').trim();
  const signParts = [sunSign, moonSign ? `☾ ${moonSign}` : ''].filter(Boolean);
  const infoLine = signParts.length ? `${dateText} • ${signParts.join(' ')}` : `${dateText} • Gökyüzü akışı`;

  const overallScore = cosmicSummary?.dailyGuide?.overallScore ?? null;
  const heroDescription = trimLine(
    homeBrief?.transitSummary || homeBrief?.dailyEnergy || skyPulse?.dailyVibe,
    'İç dünyanda büyütme ve tamamlamaya odaklı bir akış var.',
    66,
  );

  const impactScore = homeBrief?.meta?.impactScore ?? null;

  const themeText = trimLine(homeBrief?.transitHeadline || skyPulse?.dailyVibe, 'Değişim rüzgarları', 42);
  const suggestionText = trimLine(homeBrief?.actionMessage, 'Cesaretle hareket et', 42);

  const weeklyItems = buildWeekly(homeBrief);
  const transitToday = buildTransitToday(homeBrief, skyPulse);
  const decisionCompass = buildCompass(cosmicSummary);

  const oracleActive = !homeBriefError && !cosmicSummaryError;
  const oracleLabel = oracleActive ? 'Oracle aktif' : 'Oracle bekleniyor';

  return {
    userName,
    infoLine,
    hero: {
      title: 'Doğduğun Gece Gökyüzü',
      subtitle: buildHeroSubtitle({ skyPulse, birthMoonProjection, overallScore }),
      description: heroDescription,
    },
    quickActions: QUICK_ACTIONS,
    dailySummary: {
      scoreLabel: 'Genel',
      scoreValue: overallScore,
      themeText,
      suggestionText,
      chips: [
        { label: 'Duygu', value: inferEmotionLabel(homeBrief?.transitSummary), tone: 'emotion' },
        { label: 'Risk', value: inferRiskLabel(impactScore), tone: 'risk' },
      ],
    },
    transitToday,
    decisionCompass,
    weekRangeLabel: formatWeekRangeTr(skyPulse?.date ?? homeBrief?.generatedAt ?? null),
    weeklyItems,
    oracleStatus: {
      label: oracleLabel,
      active: oracleActive,
    },
  };
}
