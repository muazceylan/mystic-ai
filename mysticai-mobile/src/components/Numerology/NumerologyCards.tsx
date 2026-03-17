import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { BottomSheet, Skeleton } from '../ui';
import AccordionSection from '../ui/AccordionSection';
import { useTheme } from '../../context/ThemeContext';
import { NUMBER_TYPE_DESC } from '../../services/numerology.viewmodel';
import type {
  NumerologyAngelSignal,
  NumerologyCacheStatus,
  NumerologyCalculationMeta,
  NumerologyClassicCycle,
  NumerologyCombinedProfile,
  NumerologyCoreNumber,
  NumerologyKarmicDebt,
  NumerologyMiniGuidance,
  NumerologyProfile,
  NumerologyShareCardPayload,
} from '../../services/numerology.service';

// ─── Shared Helper Components ─────────────────────────────────────────────────

type ActionButtonProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  loading?: boolean;
};

function ActionButton({ icon, label, onPress, loading = false }: ActionButtonProps) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.actionButton} onPress={onPress} accessibilityRole="button">
      <Ionicons name={loading ? 'hourglass-outline' : icon} size={15} color={colors.text} />
      <Text style={styles.actionButtonLabel}>{label}</Text>
    </Pressable>
  );
}

export function SectionLabel({ label }: { label: string }) {
  const styles = createStyles(useTheme().colors);
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function InfoPill(props: { label: string; tone?: 'neutral' | 'gold' | 'violet' | 'stale' }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const tone = props.tone ?? 'neutral';

  const palette = tone === 'gold'
    ? { bg: colors.goldLight, text: colors.goldDark }
    : tone === 'violet'
      ? { bg: colors.violetBg, text: colors.violet }
      : tone === 'stale'
        ? { bg: colors.warningBg, text: colors.warningDark }
        : { bg: colors.surfaceAlt, text: colors.textSoft };

  return (
    <View style={[styles.infoPill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.infoPillText, { color: palette.text }]}>{props.label}</Text>
    </View>
  );
}

export function BulletList({ items }: { items: string[] }) {
  const styles = createStyles(useTheme().colors);
  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function ChipList({ items }: { items: string[] }) {
  const styles = createStyles(useTheme().colors);
  return (
    <View style={styles.chipWrap}>
      {items.map((item) => (
        <View key={item} style={styles.chipItem}>
          <Text style={styles.chipText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function shortText(value: string | null | undefined, max = 96): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  if (raw.length <= max) return raw;
  return `${raw.slice(0, max - 1).trimEnd()}…`;
}

// ─── Hero Card ────────────────────────────────────────────────────────────────

export function NumerologyHeroCard(props: {
  name: string;
  headline: string;
  mainNumber: number | null;
  mainTitle: string;
  mainArchetype?: string;
  /** Kısa yaşam yolu açıklaması — viewmodel'den gelir */
  lifePathShortDesc?: string;
  personalYear: number | null;
  shortTheme?: string;
  /** Yıl teması başlığı — viewmodel'den gelir */
  yearThemeTitle?: string;
  /** Yıl teması açıklaması — viewmodel'den gelir */
  yearThemeDesc?: string;
  cacheStatus: NumerologyCacheStatus;
  generatedAt?: string;
  onShare: () => void;
  onSaveSnapshot: () => void;
  onOpenTrust: () => void;
  shareLoading?: boolean;
  savingSnapshot?: boolean;
}) {
  const { t } = useTranslation();
  const styles = createStyles(useTheme().colors);
  const generatedLabel = props.generatedAt?.slice(0, 10) ?? '';

  // Gösterilecek sağ sütun metni: viewmodel varsa onu kullan, yoksa headline
  const displayDesc = props.yearThemeDesc || props.headline;
  const displayThemeTitle = props.yearThemeTitle || props.shortTheme;

  return (
    <LinearGradient
      colors={['#0F1F39', '#1E234A', '#253058']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      {/* Üst satır: kicker + isim + stale badge */}
      <View style={styles.heroTopRow}>
        <View style={styles.heroTopTextWrap}>
          <Text style={styles.heroKicker}>{t('numerology.heroKicker')}</Text>
          <Text style={styles.heroName}>{props.name}</Text>
        </View>
        {props.cacheStatus === 'stale'
          ? <InfoPill label={t('numerology.staleBadge')} tone="stale" />
          : null}
      </View>

      {/* Ana içerik: sol sayı orbu + sağ yıl teması */}
      <View style={styles.heroMainRow}>
        {/* Sol: büyük sayı */}
        <View style={styles.heroNumberOrb}>
          <Text style={styles.heroNumberValue}>{props.mainNumber ?? '—'}</Text>
          <Text style={styles.heroNumberLabel}>{props.mainTitle}</Text>
          {props.lifePathShortDesc ? (
            <Text style={styles.heroNumberSubDesc} numberOfLines={2}>
              {props.lifePathShortDesc}
            </Text>
          ) : null}
        </View>

        {/* Sağ: yıl teması */}
        <View style={styles.heroTextCol}>
          {props.personalYear ? (
            <InfoPill
              label={t('numerology.personalYearPill', { year: props.personalYear })}
              tone="gold"
            />
          ) : null}
          {displayThemeTitle ? (
            <Text style={styles.heroThemeTitle}>{displayThemeTitle}</Text>
          ) : null}
          <Text style={styles.heroHeadline}>{shortText(displayDesc, 130)}</Text>
        </View>
      </View>

      {/* Alt not — kısa ve sade */}
      <Text style={styles.heroFootnote}>
        {props.cacheStatus === 'stale'
          ? t('numerology.staleDescription', { date: generatedLabel || t('common.unknown') })
          : t('numerology.heroFootnote')}
      </Text>

      {/* Aksiyon butonları */}
      <View style={styles.actionRow}>
        <ActionButton
          icon="share-social-outline"
          label={t('numerology.shareCta')}
          onPress={props.onShare}
          loading={props.shareLoading}
        />
        <ActionButton
          icon="bookmark-outline"
          label={t('numerology.snapshotCta')}
          onPress={props.onSaveSnapshot}
          loading={props.savingSnapshot}
        />
        <ActionButton
          icon="information-circle-outline"
          label={t('numerology.howCalculatedCta')}
          onPress={props.onOpenTrust}
        />
      </View>
    </LinearGradient>
  );
}

// ─── Check-In Card ─────────────────────────────────────────────────────────────

export function NumerologyCheckInCard(props: {
  checkedInToday: boolean;
  weeklyCount: number;
  nextRefreshAt?: string;
  onCheckIn: () => void;
  onOpenWeekly: () => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const progress = Math.min(100, Math.max(6, Math.round((props.weeklyCount / 3) * 100)));

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardEyebrow}>{t('numerology.checkInEyebrow')}</Text>
          <Text style={styles.cardTitle}>{t('numerology.checkInTitle')}</Text>
        </View>
        {props.checkedInToday ? (
          <View style={[styles.statusBadge, { backgroundColor: colors.violetBg }]}>
            <Ionicons name="checkmark-circle" size={13} color={colors.violet} />
            <Text style={[styles.statusBadgeText, { color: colors.violet }]}>
              {t('numerology.checkInDone')}
            </Text>
          </View>
        ) : null}
      </View>

      <Text style={styles.bodyText}>
        {props.checkedInToday
          ? t('numerology.checkInDoneText')
          : t('numerology.checkInPendingText')}
      </Text>

      {/* Progress */}
      <View style={styles.progressHeaderRow}>
        <Text style={styles.metaText}>
          {t('numerology.weeklyReturn', { count: props.weeklyCount })}
        </Text>
        <Text style={styles.progressValue}>{Math.min(3, props.weeklyCount)}/3</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
      </View>

      {props.nextRefreshAt ? (
        <Text style={styles.metaText}>
          {t('numerology.nextRefresh', { date: props.nextRefreshAt })}
        </Text>
      ) : null}

      {/* Aksiyonlar */}
      <View style={styles.actionRow}>
        <ActionButton
          icon={props.checkedInToday ? 'checkmark-circle-outline' : 'sparkles-outline'}
          label={props.checkedInToday ? t('numerology.checkInDone') : t('numerology.checkInCta')}
          onPress={props.onCheckIn}
        />
        <ActionButton
          icon="calendar-outline"
          label={t('numerology.weeklyViewCta')}
          onPress={props.onOpenWeekly}
        />
      </View>
    </View>
  );
}

// ─── Timing Card (Yıl Döngüsü) ────────────────────────────────────────────────

export function NumerologyTimingCard(props: {
  personalYear: number;
  universalYear: number;
  personalMonth: number;
  personalDay: number;
  cycleProgress: number;
  yearPhase: string;
  currentPeriodFocus: string;
  shortTheme: string;
  nextRefreshAt?: string;
  onOpenConcept?: (concept: 'personalYear' | 'universalYear' | 'cycleProgress') => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>{t('numerology.timingEyebrow')}</Text>
      <Text style={styles.cardTitle}>{t('numerology.timingTitle')}</Text>

      {/* Kısa tema açıklaması */}
      <Text style={styles.bodyText}>{props.shortTheme}</Text>

      {/* Ay · Gün · Evre */}
      <View style={styles.toneRow}>
        <InfoPill
          label={t('numerology.monthDayPill', { month: props.personalMonth, day: props.personalDay })}
          tone="gold"
        />
        <InfoPill label={props.yearPhase} />
      </View>

      {/* İstatistik satırları — info icon ile */}
      <StatInfoRow
        label={t('numerology.timingPersonalYearLabel')}
        value={String(props.personalYear)}
        onInfo={() => props.onOpenConcept?.('personalYear')}
        infoLabel={t('numerology.infoIconAccessibility')}
      />
      <StatInfoRow
        label={t('numerology.timingUniversalYearLabel')}
        value={String(props.universalYear)}
        onInfo={() => props.onOpenConcept?.('universalYear')}
        infoLabel={t('numerology.infoIconAccessibility')}
      />
      <StatInfoRow
        label={t('numerology.timingCycleLabel')}
        value={`%${props.cycleProgress}`}
        onInfo={() => props.onOpenConcept?.('cycleProgress')}
        infoLabel={t('numerology.infoIconAccessibility')}
      />

      {/* Döngü progress bar */}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(6, props.cycleProgress)}%` as any }]} />
      </View>

      {/* Odak metni */}
      <View style={styles.focusBox}>
        <Text style={styles.focusBoxLabel}>{t('numerology.phaseFocusLabel')}</Text>
        <Text style={styles.bodyText}>{props.currentPeriodFocus}</Text>
      </View>

      {props.nextRefreshAt ? (
        <Text style={styles.metaText}>
          {t('numerology.nextRefresh', { date: props.nextRefreshAt })}
        </Text>
      ) : null}
    </View>
  );
}

/** İstatistik satırı — "Nedir?" butonu yerine küçük info icon */
function StatInfoRow(props: {
  label: string;
  value: string;
  onInfo?: () => void;
  infoLabel?: string;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.statInfoRow}>
      <View style={styles.statInfoText}>
        <Text style={styles.statLabel}>{props.label}</Text>
        <Text style={styles.statValue}>{props.value}</Text>
      </View>
      {props.onInfo ? (
        <Pressable
          onPress={props.onInfo}
          style={styles.infoIconButton}
          accessibilityRole="button"
          accessibilityLabel={props.infoLabel}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="information-circle-outline" size={18} color={colors.textSoft} />
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Snapshot Card ─────────────────────────────────────────────────────────────

export function NumerologySnapshotCard(props: {
  todayText?: string;
  weekText?: string;
  personalMonth?: number | null;
  personalDay?: number | null;
  yearPhase?: string;
  currentFocus?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const monthRhythm = props.personalMonth != null ? String(props.personalMonth) : '-';
  const dayRhythm = props.personalDay != null ? String(props.personalDay) : '-';

  const cards = [
    {
      key: 'today',
      icon: 'sunny-outline' as const,
      title: t('numerology.todayCard'),
      text: shortText(props.todayText || props.currentFocus, 60),
    },
    {
      key: 'week',
      icon: 'calendar-clear-outline' as const,
      title: t('numerology.weekCard'),
      text: shortText(props.weekText || props.yearPhase, 60),
    },
    {
      key: 'month',
      icon: 'moon-outline' as const,
      title: t('numerology.monthCard'),
      text: t('numerology.monthCardHint', { month: monthRhythm, day: dayRhythm }),
    },
  ];

  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>{t('numerology.snapshotEyebrow')}</Text>
      <Text style={styles.cardTitle}>{t('numerology.snapshotTitle')}</Text>

      <View style={styles.snapshotGrid}>
        {cards.map((card) => (
          <View key={card.key} style={styles.snapshotCell}>
            <View style={styles.snapshotIconWrap}>
              <Ionicons name={card.icon} size={16} color={colors.primary} />
            </View>
            <Text style={styles.snapshotLabel}>{card.title}</Text>
            <Text style={styles.snapshotText}>{card.text || '—'}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Guidance Card ─────────────────────────────────────────────────────────────

export function GuidanceCard(props: {
  guidance: NumerologyMiniGuidance;
  guidancePeriod: 'day' | 'week';
  onChangePeriod: (period: 'day' | 'week') => void;
  isStale?: boolean;
  angelSignal?: NumerologyAngelSignal | null;
  /** Viewmodel'den gelen işaret sayısı anlamı */
  signalNumberMeaning?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const angelNum = props.angelSignal?.angelNumber ?? null;
  const signalMeaning = props.signalNumberMeaning || props.angelSignal?.meaning || '';

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardEyebrow}>{t('numerology.guidanceEyebrow')}</Text>
          <Text style={styles.cardTitle}>{t('numerology.guidanceTitle')}</Text>
        </View>
        {props.isStale ? <InfoPill label={t('numerology.staleBadge')} tone="stale" /> : null}
      </View>

      {/* Günlük / Haftalık sekme */}
      <View style={styles.segmentRow}>
        {(['day', 'week'] as const).map((item) => {
          const active = item === props.guidancePeriod;
          return (
            <Pressable
              key={item}
              onPress={() => props.onChangePeriod(item)}
              style={[
                styles.segmentButton,
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {item === 'day' ? t('numerology.dailyTab') : t('numerology.weeklyTab')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Odak cümlesi */}
      <View style={styles.quickPanel}>
        <Text style={styles.quickPanelLabel}>{t('numerology.dailyFocusLabel')}</Text>
        <Text style={styles.primaryText}>{shortText(props.guidance.dailyFocus, 140)}</Text>
      </View>

      {/* Kısa yönlendirme */}
      <View style={styles.quickPanel}>
        <Text style={styles.quickPanelLabel}>{t('numerology.miniGuidanceLabel')}</Text>
        <Text style={styles.bodyText}>{shortText(props.guidance.miniGuidance, 150)}</Text>
      </View>

      {/* İşaret sayısı — daha anlaşılır başlık */}
      {angelNum ? (
        <View style={styles.signalBox}>
          <View style={styles.signalTitleRow}>
            <Ionicons name="sparkles-outline" size={14} color={colors.primary} />
            <Text style={styles.signalTitle}>
              {t('numerology.angelTitle')}: {angelNum}
            </Text>
          </View>
          <Text style={styles.bodyText}>{shortText(signalMeaning, 130)}</Text>
          {props.angelSignal?.action ? (
            <Text style={styles.metaText}>{shortText(props.angelSignal.action, 100)}</Text>
          ) : null}
        </View>
      ) : null}

      <Text style={styles.metaText}>{t('numerology.validFor', { value: props.guidance.validFor })}</Text>
    </View>
  );
}

// ─── Number Insight Card (Dört Ana Sayı) ──────────────────────────────────────

export function NumberInsightCard(props: {
  number: NumerologyCoreNumber;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const id = `core-${props.number.id}`;

  // Sayı tipine göre kısa açıklama
  const numberTypeDesc = NUMBER_TYPE_DESC[props.number.id] ?? '';

  return (
    <AccordionSection
      id={id}
      title={props.number.title}
      subtitle={numberTypeDesc || props.number.archetype}
      icon="sparkles-outline"
      expanded={props.expanded}
      onToggle={props.onToggle}
      headerMeta={(
        <View style={styles.inlinePillRow}>
          <InfoPill label={String(props.number.value)} tone="gold" />
          {props.number.isMasterNumber ? (
            <InfoPill label={t('numerology.masterNumber')} tone="violet" />
          ) : null}
        </View>
      )}
    >
      {/* Öz enerji */}
      <SectionLabel label={t('numerology.essence')} />
      <Text style={styles.bodyText}>{props.number.essence}</Text>

      {/* Güçlü yanlar */}
      <SectionLabel label={t('numerology.gifts')} />
      <ChipList items={props.number.gifts} />

      {/* Dikkat alanları */}
      <SectionLabel label={t('numerology.watchouts')} />
      <BulletList items={props.number.watchouts} />

      {/* Bugün dene */}
      {props.number.tryThisToday ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>{t('numerology.tryToday')}</Text>
          <Text style={styles.noteText}>{props.number.tryThisToday}</Text>
        </View>
      ) : null}
    </AccordionSection>
  );
}

// ─── Profile Insight Card ─────────────────────────────────────────────────────

export function ProfileInsightCard(props: {
  profile: NumerologyProfile;
  combinedProfile?: NumerologyCombinedProfile | null;
  /** Viewmodel'den gelen profil intro metni */
  profileIntroText?: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const introText = props.profileIntroText || shortText(props.profile.essence, 180);

  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>{t('numerology.profileEyebrow')}</Text>
      <Text style={styles.cardTitle}>{t('numerology.profileTitle')}</Text>

      {/* Profil intro — viewmodel'den türetilmiş */}
      <Text style={styles.bodyText}>{introText}</Text>

      {/* Doğal güçlü yönler */}
      <SectionLabel label={t('numerology.strengths')} />
      <ChipList items={props.profile.strengths.slice(0, 4)} />

      {/* Gelişim alanları */}
      <SectionLabel label={t('numerology.growthEdges')} />
      <BulletList items={props.profile.growthEdges.slice(0, 3)} />

      {/* Baskın enerji — sadece combinedProfile varsa */}
      {props.combinedProfile?.dominantEnergy ? (
        <View style={styles.noteBox}>
          <Text style={styles.noteTitle}>{t('numerology.dominantEnergy')}</Text>
          <Text style={styles.noteText}>
            {shortText(props.combinedProfile.dominantEnergy, 130)}
          </Text>
          {props.combinedProfile.relationshipStyle ? (
            <Text style={styles.metaText}>
              {shortText(props.combinedProfile.relationshipStyle, 90)}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

// ─── Bridge Card ──────────────────────────────────────────────────────────────

export function NumerologyBridgeCard(props: {
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <Pressable style={styles.bridgeCard} onPress={props.onPress} accessibilityRole="button">
      <View style={styles.bridgeIconWrap}>
        <Ionicons name={props.icon ?? 'arrow-forward-outline'} size={20} color={colors.primary} />
      </View>
      <View style={styles.bridgeTextWrap}>
        <Text style={styles.bridgeTitle}>{props.title}</Text>
        <Text style={styles.bridgeDescription}>{props.description}</Text>
        <Text style={styles.bridgeCta}>{props.ctaLabel}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textSoft} />
    </Pressable>
  );
}

// ─── State Card ───────────────────────────────────────────────────────────────

export function NumerologyStateCard(props: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  ctaLabel?: string;
  onPress?: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.stateCard}>
      <View style={styles.stateIconWrap}>
        <Ionicons name={props.icon} size={22} color={colors.primary} />
      </View>
      <Text style={styles.stateTitle}>{props.title}</Text>
      <Text style={styles.stateDescription}>{props.description}</Text>
      {props.ctaLabel && props.onPress ? (
        <Pressable style={styles.stateButton} onPress={props.onPress} accessibilityRole="button">
          <Text style={styles.stateButtonText}>{props.ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ─── Bottom Sheets ────────────────────────────────────────────────────────────

export function NumerologyConceptSheet(props: {
  visible: boolean;
  title: string;
  description: string;
  onClose: () => void;
}) {
  const styles = createStyles(useTheme().colors);

  return (
    <BottomSheet visible={props.visible} onClose={props.onClose} title={props.title}>
      <View style={styles.sheetContent}>
        <Text style={styles.sheetLead}>{props.description}</Text>
      </View>
    </BottomSheet>
  );
}

export function NumerologyAdvancedSheet(props: {
  visible: boolean;
  onClose: () => void;
  angelSignal: NumerologyAngelSignal | null | undefined;
  classicCycle: NumerologyClassicCycle | null | undefined;
  karmicDebt: NumerologyKarmicDebt | null | undefined;
}) {
  const { t } = useTranslation();
  const styles = createStyles(useTheme().colors);
  const activePinnacle = props.classicCycle?.pinnacles?.[props.classicCycle.activePinnacleIndex];
  const activeChallenge = props.classicCycle?.challenges?.[props.classicCycle.activeChallengeIndex];
  const activeLifeCycle = props.classicCycle?.lifeCycles?.[props.classicCycle.activeLifeCycleIndex];

  return (
    <BottomSheet visible={props.visible} onClose={props.onClose} title={t('numerology.advancedSheetTitle')}>
      <View style={styles.sheetContent}>
        <SectionLabel label={t('numerology.angelTitle')} />
        {props.angelSignal ? (
          <>
            <Text style={styles.bodyText}>
              {props.angelSignal.angelNumber} - {props.angelSignal.meaning}
            </Text>
            <Text style={styles.metaText}>{props.angelSignal.action}</Text>
          </>
        ) : (
          <Text style={styles.bodyText}>-</Text>
        )}

        <SectionLabel label={t('numerology.classicCycleTitle')} />
        <Text style={styles.bodyText}>
          {t('numerology.activePinnacle')}: {activePinnacle?.number ?? '-'} |{' '}
          {t('numerology.activeChallenge')}: {activeChallenge?.number ?? '-'}
        </Text>
        <Text style={styles.metaText}>
          {activeLifeCycle?.label ?? '-'}
          {activeLifeCycle?.theme ? ` - ${activeLifeCycle.theme}` : ''}
        </Text>

        <SectionLabel label={t('numerology.karmicTitle')} />
        <Text style={styles.bodyText}>{props.karmicDebt?.summary ?? '-'}</Text>
      </View>
    </BottomSheet>
  );
}

export function TrustInfoSheet(props: {
  visible: boolean;
  onClose: () => void;
  calculationMeta: NumerologyCalculationMeta | null | undefined;
}) {
  const { t } = useTranslation();
  const styles = createStyles(useTheme().colors);

  return (
    <BottomSheet visible={props.visible} onClose={props.onClose} title={t('numerology.howCalculatedTitle')}>
      <View style={styles.sheetContent}>
        <Text style={styles.sheetLead}>{t('numerology.howCalculatedLead')}</Text>

        <SectionLabel label={t('numerology.personalYearMethod')} />
        <Text style={styles.bodyText}>{props.calculationMeta?.personalYearMethod ?? '-'}</Text>

        <SectionLabel label={t('numerology.masterNumbers')} />
        <Text style={styles.bodyText}>{props.calculationMeta?.masterNumberPolicy ?? '-'}</Text>

        <SectionLabel label={t('numerology.formulas')} />
        {props.calculationMeta?.formulaSummary?.length
          ? <BulletList items={props.calculationMeta.formulaSummary} />
          : <Text style={styles.bodyText}>-</Text>}

        <SectionLabel label={t('numerology.normalizationNotes')} />
        {props.calculationMeta?.normalizationNotes?.length
          ? <BulletList items={props.calculationMeta.normalizationNotes} />
          : <Text style={styles.bodyText}>-</Text>}
      </View>
    </BottomSheet>
  );
}

// ─── Share Card ───────────────────────────────────────────────────────────────

export function NumerologyShareCard(props: {
  payload: NumerologyShareCardPayload;
  variant?: 'story_vertical' | 'standard_square';
}) {
  const { t } = useTranslation();
  const styles = createStyles(useTheme().colors);
  const story = props.variant !== 'standard_square';

  return (
    <LinearGradient
      colors={['#0B1630', '#1A2751', '#2A3761']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.shareCard, story ? styles.shareCardStory : styles.shareCardSquare]}
    >
      <Text style={styles.shareBrand}>{props.payload.brandMark || 'Mystic AI'}</Text>
      <Text style={styles.shareKicker}>{t('numerology.shareCardKicker')}</Text>
      <Text style={styles.shareName}>{props.payload.name}</Text>
      <View style={styles.shareNumberBox}>
        <Text style={styles.shareNumber}>{props.payload.mainNumber}</Text>
        <Text style={styles.shareNumberCaption}>{t('numerology.shareMainNumber')}</Text>
      </View>
      <Text style={styles.shareHeadline}>{props.payload.headline}</Text>
      <Text style={styles.shareFooter}>{t('numerology.shareFooter')}</Text>
    </LinearGradient>
  );
}

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

export function NumerologyLoadingSkeleton() {
  const styles = createStyles(useTheme().colors);
  return (
    <View style={styles.skeletonWrap}>
      <Skeleton height={230} borderRadius={24} />
      <Skeleton height={140} borderRadius={20} />
      <Skeleton height={180} borderRadius={20} />
      <Skeleton height={170} borderRadius={20} />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    // Hero Card
    heroCard: {
      borderRadius: 24,
      padding: 20,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      gap: 16,
    },
    heroTopRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 12,
    },
    heroTopTextWrap: {
      flex: 1,
      gap: 4,
    },
    heroKicker: {
      color: 'rgba(255,255,255,0.65)',
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 1.1,
      textTransform: 'uppercase',
    },
    heroName: {
      color: '#FFFFFF',
      fontSize: 24,
      fontWeight: '900',
      lineHeight: 30,
    },
    heroMainRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 14,
    },
    heroNumberOrb: {
      width: 110,
      borderRadius: 22,
      paddingVertical: 16,
      paddingHorizontal: 10,
      alignItems: 'center',
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      gap: 4,
      flexShrink: 0,
    },
    heroNumberValue: {
      color: '#F9D86F',
      fontSize: 40,
      fontWeight: '900',
      lineHeight: 44,
    },
    heroNumberLabel: {
      color: 'rgba(255,255,255,0.85)',
      fontSize: 11,
      fontWeight: '700',
      textAlign: 'center',
    },
    heroNumberSubDesc: {
      color: 'rgba(255,255,255,0.6)',
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'center',
      lineHeight: 14,
      marginTop: 2,
    },
    heroTextCol: {
      flex: 1,
      gap: 8,
      alignItems: 'flex-start',
      paddingTop: 2,
    },
    heroThemeTitle: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 12,
      fontWeight: '700',
      lineHeight: 17,
    },
    heroHeadline: {
      color: '#FFFFFF',
      fontSize: 15,
      lineHeight: 22,
      fontWeight: '700',
    },
    heroFootnote: {
      color: 'rgba(255,255,255,0.55)',
      fontSize: 11,
      lineHeight: 17,
    },

    // Common Card
    card: {
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 20,
      padding: 18,
      gap: 12,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    cardHeaderText: {
      flex: 1,
      gap: 2,
    },
    cardEyebrow: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.9,
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 18,
      fontWeight: '800',
      lineHeight: 24,
    },

    // Status Badge (check-in "Tamamlandı")
    statusBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    statusBadgeText: {
      fontSize: 11,
      fontWeight: '700',
    },

    // Action Row
    actionRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      borderRadius: 999,
      paddingVertical: 10,
      paddingHorizontal: 14,
    },
    actionButtonLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '700',
    },

    // Progress
    progressHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    progressValue: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    progressTrack: {
      height: 6,
      borderRadius: 999,
      overflow: 'hidden',
      backgroundColor: colors.surfaceAlt,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.primary,
    },

    // Stat row with info icon
    statInfoRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    statInfoText: {
      flex: 1,
      gap: 2,
    },
    statLabel: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    statValue: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    infoIconButton: {
      padding: 2,
    },

    // Tone row (pills)
    toneRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    // Focus box
    focusBox: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      padding: 12,
      gap: 6,
    },
    focusBoxLabel: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },

    // Snapshot grid
    snapshotGrid: {
      flexDirection: 'row',
      gap: 8,
    },
    snapshotCell: {
      flex: 1,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      padding: 10,
      gap: 5,
    },
    snapshotIconWrap: {
      width: 28,
      height: 28,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    snapshotLabel: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
    },
    snapshotText: {
      color: colors.text,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
    },

    // Segment control
    segmentRow: {
      flexDirection: 'row',
      gap: 8,
    },
    segmentButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 999,
      paddingVertical: 9,
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
    },
    segmentText: {
      color: colors.textSoft,
      fontSize: 13,
      fontWeight: '700',
    },
    segmentTextActive: {
      color: colors.white,
    },

    // Quick panel (guidance)
    quickPanel: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      padding: 13,
      gap: 6,
    },
    quickPanelLabel: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    primaryText: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '700',
      lineHeight: 24,
    },

    // Signal box (angel number)
    signalBox: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      padding: 13,
      gap: 6,
    },
    signalTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    signalTitle: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '800',
    },

    // Note box
    noteBox: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      padding: 13,
      gap: 6,
    },
    noteTitle: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    noteText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
    },

    // Section & content labels
    sectionLabel: {
      color: colors.subtext,
      fontSize: 11,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },

    // Text
    bodyText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
    },
    metaText: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },

    // Info pill
    infoPill: {
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    infoPillText: {
      fontSize: 11,
      fontWeight: '700',
    },
    inlinePillRow: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
    },

    // Chip
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chipItem: {
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
      paddingHorizontal: 11,
      paddingVertical: 6,
    },
    chipText: {
      color: colors.primary700,
      fontSize: 12,
      fontWeight: '700',
    },

    // Bullet list
    bulletList: {
      gap: 8,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 999,
      marginTop: 8,
      backgroundColor: colors.primary,
      flexShrink: 0,
    },
    bulletText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
    },

    // Bridge card
    bridgeCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    bridgeIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 13,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
      flexShrink: 0,
    },
    bridgeTextWrap: {
      flex: 1,
      gap: 3,
    },
    bridgeTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
      lineHeight: 21,
    },
    bridgeDescription: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 19,
    },
    bridgeCta: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '800',
      lineHeight: 18,
      marginTop: 2,
    },

    // State card
    stateCard: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 22,
      alignItems: 'center',
      gap: 10,
    },
    stateIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 15,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    stateTitle: {
      color: colors.text,
      fontSize: 17,
      fontWeight: '800',
      textAlign: 'center',
      lineHeight: 24,
    },
    stateDescription: {
      color: colors.subtext,
      fontSize: 14,
      textAlign: 'center',
      lineHeight: 22,
    },
    stateButton: {
      marginTop: 6,
      borderRadius: 999,
      backgroundColor: colors.primary,
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    stateButtonText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '800',
    },

    // Bottom sheet
    sheetContent: {
      gap: 12,
      paddingBottom: 16,
    },
    sheetLead: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 22,
    },

    // Share card
    shareCard: {
      justifyContent: 'space-between',
      overflow: 'hidden',
      padding: 64,
    },
    shareCardStory: {
      width: 1080,
      height: 1920,
      borderRadius: 46,
    },
    shareCardSquare: {
      width: 1080,
      height: 1080,
      borderRadius: 40,
    },
    shareBrand: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: 32,
      fontWeight: '700',
    },
    shareKicker: {
      color: '#F9D86F',
      fontSize: 28,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1.4,
    },
    shareName: {
      color: '#FFFFFF',
      fontSize: 62,
      lineHeight: 72,
      fontWeight: '900',
    },
    shareNumberBox: {
      alignSelf: 'flex-start',
      borderRadius: 30,
      paddingHorizontal: 24,
      paddingVertical: 20,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.18)',
    },
    shareNumber: {
      color: '#F9D86F',
      fontSize: 84,
      lineHeight: 92,
      fontWeight: '900',
    },
    shareNumberCaption: {
      color: 'rgba(255,255,255,0.82)',
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '700',
    },
    shareHeadline: {
      color: '#FFFFFF',
      fontSize: 42,
      lineHeight: 54,
      fontWeight: '800',
    },
    shareFooter: {
      color: 'rgba(255,255,255,0.75)',
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '600',
    },

    // Skeleton
    skeletonWrap: {
      gap: 12,
    },
  });
}

export default {
  NumerologyHeroCard,
  NumerologyCheckInCard,
  NumerologyTimingCard,
  NumerologySnapshotCard,
  GuidanceCard,
  NumberInsightCard,
  ProfileInsightCard,
  NumerologyBridgeCard,
  NumerologyStateCard,
  NumerologyConceptSheet,
  NumerologyAdvancedSheet,
  TrustInfoSheet,
  NumerologyShareCard,
  NumerologyLoadingSkeleton,
};
