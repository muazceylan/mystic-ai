import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { BottomSheet, Skeleton } from '../ui';
import AccordionSection from '../ui/AccordionSection';
import { useTheme } from '../../context/ThemeContext';
import type {
  NumerologyCacheStatus,
  NumerologyCombinedProfile,
  NumerologyCoreNumber,
  NumerologyMiniGuidance,
  NumerologyProfile,
  NumerologyCalculationMeta,
  NumerologyShareCardPayload,
} from '../../services/numerology.service';

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
    <Pressable style={styles.actionButton} onPress={onPress}>
      <Ionicons
        name={loading ? 'hourglass-outline' : icon}
        size={15}
        color={colors.text}
      />
      <Text style={styles.actionButtonLabel}>{label}</Text>
    </Pressable>
  );
}

function SectionLabel({ label }: { label: string }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);
  return <Text style={styles.sectionLabel}>{label}</Text>;
}

function InfoPill({
  label,
  tone = 'neutral',
}: {
  label: string;
  tone?: 'neutral' | 'gold' | 'violet' | 'stale';
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  const palette = tone === 'gold'
    ? { bg: colors.goldLight, text: colors.goldDark }
    : tone === 'violet'
      ? { bg: colors.violetBg, text: colors.violet }
      : tone === 'stale'
        ? { bg: colors.warningBg, text: colors.warningDark }
        : { bg: colors.surfaceAlt, text: colors.textSoft };

  return (
    <View style={[styles.infoPill, { backgroundColor: palette.bg }]}>
      <Text style={[styles.infoPillText, { color: palette.text }]}>{label}</Text>
    </View>
  );
}

function BulletList({ items, tone = 'default' }: { items: string[]; tone?: 'default' | 'warning' }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.bulletList}>
      {items.map((item) => (
        <View key={item} style={styles.bulletRow}>
          <View
            style={[
              styles.bulletDot,
              { backgroundColor: tone === 'warning' ? colors.warning : colors.primary },
            ]}
          />
          <Text style={styles.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

function GiftChips({ items }: { items: string[] }) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.chipWrap}>
      {items.map((item) => (
        <View key={item} style={styles.giftChip}>
          <Text style={styles.giftChipText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function NumerologyHeroCard(props: {
  name: string;
  headline: string;
  mainNumber: number | null;
  mainTitle: string;
  mainArchetype?: string;
  personalYear: number | null;
  shortTheme?: string;
  cacheStatus: NumerologyCacheStatus;
  generatedAt?: string;
  onShare: () => void;
  onSaveSnapshot: () => void;
  onOpenTrust: () => void;
  shareLoading?: boolean;
  savingSnapshot?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const generatedLabel = props.generatedAt?.slice(0, 10) ?? '';

  return (
    <LinearGradient
      colors={['#12203D', '#1D1640', '#30204E']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.heroCard}
    >
      <View style={styles.heroHeaderRow}>
        <View style={styles.heroKickerWrap}>
          <Text style={styles.heroKicker}>{t('numerology.heroKicker')}</Text>
          <Text style={styles.heroName}>{props.name}</Text>
        </View>
        {props.cacheStatus === 'stale' ? (
          <InfoPill label={t('numerology.staleBadge')} tone="stale" />
        ) : null}
      </View>

      <View style={styles.heroMainRow}>
        <View style={styles.heroNumberOrb}>
          <Text style={styles.heroNumberValue}>{props.mainNumber ?? '—'}</Text>
          <Text style={styles.heroNumberLabel}>{props.mainTitle}</Text>
        </View>

        <View style={styles.heroTextCol}>
          {props.personalYear ? (
            <InfoPill
              label={t('numerology.personalYearPill', { year: props.personalYear })}
              tone="gold"
            />
          ) : null}
          {props.mainArchetype ? (
            <InfoPill label={props.mainArchetype} tone="violet" />
          ) : null}
          <Text style={styles.heroHeadline}>{props.headline}</Text>
          {props.shortTheme ? <Text style={styles.heroTheme}>{props.shortTheme}</Text> : null}
        </View>
      </View>

      <View style={styles.heroFooterRow}>
        <Text style={styles.heroFootnote}>
          {props.cacheStatus === 'stale'
            ? t('numerology.staleDescription', { date: generatedLabel || t('common.unknown') })
            : t('numerology.heroFootnote')}
        </Text>
        <View style={styles.heroActions}>
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
      </View>
    </LinearGradient>
  );
}

export function NumerologyTimingCard(props: {
  personalYear: number;
  universalYear: number;
  cycleProgress: number;
  yearPhase: string;
  currentPeriodFocus: string;
  shortTheme: string;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardEyebrow}>{t('numerology.thisPeriod')}</Text>
          <Text style={styles.cardTitle}>{t('numerology.timingTitle')}</Text>
        </View>
        <View style={styles.timingBadgeStack}>
          <InfoPill label={t('numerology.personalYearShort', { year: props.personalYear })} tone="violet" />
          <InfoPill label={t('numerology.universalYearShort', { year: props.universalYear })} tone="neutral" />
        </View>
      </View>

      <Text style={styles.bodyText}>{props.shortTheme}</Text>

      <View style={styles.progressRow}>
        <Text style={styles.metaLabel}>{t('numerology.cycleProgress')}</Text>
        <Text style={styles.progressLabel}>{props.cycleProgress}%</Text>
      </View>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(8, props.cycleProgress)}%` }]} />
      </View>

      <View style={styles.statGrid}>
        <View style={styles.statItem}>
          <SectionLabel label={t('numerology.yearPhase')} />
          <Text style={styles.statText}>{props.yearPhase}</Text>
        </View>
        <View style={styles.statItem}>
          <SectionLabel label={t('numerology.currentFocus')} />
          <Text style={styles.statText}>{props.currentPeriodFocus}</Text>
        </View>
      </View>
    </View>
  );
}

export function GuidanceCard(props: {
  guidance: NumerologyMiniGuidance;
  guidancePeriod: 'day' | 'week';
  onChangePeriod: (period: 'day' | 'week') => void;
  isStale?: boolean;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeaderRow}>
        <View>
          <Text style={styles.cardEyebrow}>{t('numerology.guidanceEyebrow')}</Text>
          <Text style={styles.cardTitle}>{t('numerology.guidanceTitle')}</Text>
        </View>
        {props.isStale ? <InfoPill label={t('numerology.staleBadge')} tone="stale" /> : null}
      </View>

      <View style={styles.segmentedRow}>
        {(['day', 'week'] as const).map((item) => {
          const active = props.guidancePeriod === item;
          return (
            <Pressable
              key={item}
              onPress={() => props.onChangePeriod(item)}
              style={[
                styles.segmentButton,
                active && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
            >
              <Text style={[styles.segmentText, active && styles.segmentTextActive]}>
                {item === 'day' ? t('numerology.dailyTab') : t('numerology.weeklyTab')}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <SectionLabel label={t('numerology.dailyFocusLabel')} />
      <Text style={styles.primaryBody}>{props.guidance.dailyFocus}</Text>

      <SectionLabel label={t('numerology.miniGuidanceLabel')} />
      <Text style={styles.bodyText}>{props.guidance.miniGuidance}</Text>

      <View style={styles.guidanceFooter}>
        <View style={styles.guidancePromptBox}>
          <Text style={styles.guidancePromptLabel}>{t('numerology.reflectionPrompt')}</Text>
          <Text style={styles.guidancePromptText}>{props.guidance.reflectionPromptOfTheDay}</Text>
        </View>
        <Text style={styles.metaHint}>{t('numerology.validFor', { value: props.guidance.validFor })}</Text>
      </View>
    </View>
  );
}

export function NumberInsightCard(props: {
  number: NumerologyCoreNumber;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = createStyles(colors);
  const sectionId = `core-${props.number.id}`;

  return (
    <AccordionSection
      id={sectionId}
      title={props.number.title}
      subtitle={props.number.archetype}
      icon="sparkles-outline"
      expanded={props.expanded}
      onToggle={props.onToggle}
      headerMeta={(
        <View style={styles.inlinePillRow}>
          <InfoPill label={String(props.number.value)} tone="gold" />
          {props.number.isMasterNumber ? <InfoPill label={t('numerology.masterNumber')} tone="violet" /> : null}
        </View>
      )}
    >
      <SectionLabel label={t('numerology.essence')} />
      <Text style={styles.bodyText}>{props.number.essence}</Text>

      <SectionLabel label={t('numerology.gifts')} />
      <GiftChips items={props.number.gifts} />

      <SectionLabel label={t('numerology.watchouts')} />
      <BulletList items={props.number.watchouts} tone="warning" />

      <View style={styles.tryTodayBox}>
        <Text style={styles.tryTodayLabel}>{t('numerology.tryToday')}</Text>
        <Text style={styles.tryTodayText}>{props.number.tryThisToday}</Text>
      </View>
    </AccordionSection>
  );
}

export function CombinedProfileCard(props: {
  profile: NumerologyCombinedProfile;
  expanded: boolean;
  onToggle: (id: string) => void;
}) {
  const { t } = useTranslation();
  const styles = createStyles(useTheme().colors);

  return (
    <AccordionSection
      id="combined-profile"
      title={t('numerology.combinedProfileTitle')}
      subtitle={t('numerology.combinedProfileSubtitle')}
      icon="git-merge-outline"
      expanded={props.expanded}
      onToggle={props.onToggle}
      headerMeta={(
        <View style={styles.inlinePillRow}>
          <InfoPill label={t('numerology.dominantNumberPill', { value: props.profile.dominantNumber })} tone="gold" />
        </View>
      )}
    >
      <SectionLabel label={t('numerology.dominantEnergy')} />
      <Text style={styles.bodyText}>{props.profile.dominantEnergy}</Text>

      <SectionLabel label={t('numerology.innerConflict')} />
      <Text style={styles.bodyText}>{props.profile.innerConflict}</Text>

      <SectionLabel label={t('numerology.naturalStyle')} />
      <Text style={styles.bodyText}>{props.profile.naturalStyle}</Text>

      <SectionLabel label={t('numerology.decisionStyle')} />
      <Text style={styles.bodyText}>{props.profile.decisionStyle}</Text>

      <SectionLabel label={t('numerology.relationshipStyle')} />
      <Text style={styles.bodyText}>{props.profile.relationshipStyle}</Text>

      <SectionLabel label={t('numerology.growthArc')} />
      <Text style={styles.bodyText}>{props.profile.growthArc}</Text>

      <View style={styles.compatibilityTeaserBox}>
        <Text style={styles.compatibilityTeaserLabel}>{t('numerology.compatibilityTeaser')}</Text>
        <Text style={styles.compatibilityTeaserText}>{props.profile.compatibilityTeaser}</Text>
      </View>
    </AccordionSection>
  );
}

export function ProfileInsightCard(props: {
  profile: NumerologyProfile;
  showDeepInsights: boolean;
}) {
  const { t } = useTranslation();
  const styles = createStyles(useTheme().colors);

  return (
    <View style={styles.card}>
      <Text style={styles.cardEyebrow}>{t('numerology.profileEyebrow')}</Text>
      <Text style={styles.cardTitle}>{t('numerology.profileTitle')}</Text>

      <SectionLabel label={t('numerology.profileEssence')} />
      <Text style={styles.bodyText}>{props.profile.essence}</Text>

      <SectionLabel label={t('numerology.strengths')} />
      <GiftChips items={props.profile.strengths} />

      {props.showDeepInsights ? (
        <>
          <SectionLabel label={t('numerology.growthEdges')} />
          <BulletList items={props.profile.growthEdges} tone="warning" />

          <View style={styles.guidancePromptBox}>
            <Text style={styles.guidancePromptLabel}>{t('numerology.reflectionPrompt')}</Text>
            <Text style={styles.guidancePromptText}>{props.profile.reflectionPrompt}</Text>
          </View>
        </>
      ) : null}
    </View>
  );
}

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
    <Pressable style={styles.bridgeCard} onPress={props.onPress}>
      <View style={styles.bridgeIconWrap}>
        <Ionicons name={props.icon ?? 'swap-horizontal-outline'} size={20} color={colors.primary} />
      </View>
      <View style={styles.bridgeTextCol}>
        <Text style={styles.bridgeTitle}>{props.title}</Text>
        <Text style={styles.bridgeDescription}>{props.description}</Text>
        <Text style={styles.bridgeCta}>{props.ctaLabel}</Text>
      </View>
      <Ionicons name="arrow-forward" size={18} color={colors.textSoft} />
    </Pressable>
  );
}

export function NumerologyLockCard(props: {
  title: string;
  description: string;
  ctaLabel: string;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.lockCard}>
      <View style={styles.lockHeaderRow}>
        <InfoPill label="Premium" tone="gold" />
        <Ionicons name="lock-closed-outline" size={16} color={colors.goldDark} />
      </View>
      <Text style={styles.lockTitle}>{props.title}</Text>
      <Text style={styles.lockDescription}>{props.description}</Text>
      <Pressable style={styles.lockButton} onPress={props.onPress}>
        <Text style={styles.lockButtonText}>{props.ctaLabel}</Text>
      </Pressable>
    </View>
  );
}

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
        <Pressable style={styles.stateButton} onPress={props.onPress}>
          <Text style={styles.stateButtonText}>{props.ctaLabel}</Text>
        </Pressable>
      ) : null}
    </View>
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
    <BottomSheet
      visible={props.visible}
      onClose={props.onClose}
      title={t('numerology.howCalculatedTitle')}
    >
      <View style={styles.sheetContent}>
        <Text style={styles.sheetLead}>{t('numerology.howCalculatedLead')}</Text>

        <SectionLabel label={t('numerology.personalYearMethod')} />
        <Text style={styles.bodyText}>{props.calculationMeta?.personalYearMethod ?? '—'}</Text>

        <SectionLabel label={t('numerology.masterNumbers')} />
        <Text style={styles.bodyText}>{props.calculationMeta?.masterNumberPolicy ?? '—'}</Text>

        <SectionLabel label={t('numerology.formulas')} />
        {props.calculationMeta?.formulaSummary?.length ? (
          <BulletList items={props.calculationMeta.formulaSummary} />
        ) : (
          <Text style={styles.bodyText}>—</Text>
        )}

        <SectionLabel label={t('numerology.normalizationNotes')} />
        {props.calculationMeta?.normalizationNotes?.length ? (
          <BulletList items={props.calculationMeta.normalizationNotes} />
        ) : (
          <Text style={styles.bodyText}>—</Text>
        )}
      </View>
    </BottomSheet>
  );
}

export function NumerologyShareCard(props: {
  payload: NumerologyShareCardPayload;
  variant?: 'story_vertical' | 'standard_square';
}) {
  const styles = createStyles(useTheme().colors);
  const { t } = useTranslation();
  const isStory = props.variant !== 'standard_square';
  const generatedDate = props.payload.generatedAt?.slice(0, 10) ?? '';

  return (
    <LinearGradient
      colors={['#0B1330', '#1B204D', '#3B2554']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.shareCard, isStory ? styles.shareCardStory : styles.shareCardSquare]}
    >
      <View style={styles.shareOrb} />
      <Text style={[styles.shareBrand, !isStory && styles.shareBrandSquare]}>
        {props.payload.brandMark || 'Mystic AI'}
      </Text>
      <Text style={[styles.shareKicker, !isStory && styles.shareKickerSquare]}>{t('numerology.shareCardKicker')}</Text>
      <Text
        style={[styles.shareName, !isStory && styles.shareNameSquare]}
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.6}
      >
        {props.payload.name}
      </Text>

      <View style={[styles.shareNumberWrap, !isStory && styles.shareNumberWrapSquare]}>
        <Text style={[styles.shareNumberValue, !isStory && styles.shareNumberValueSquare]}>{props.payload.mainNumber}</Text>
        <Text style={[styles.shareNumberCaption, !isStory && styles.shareNumberCaptionSquare]}>{t('numerology.shareMainNumber')}</Text>
      </View>

      <Text
        style={[styles.shareHeadline, !isStory && styles.shareHeadlineSquare]}
        numberOfLines={isStory ? 4 : 3}
        adjustsFontSizeToFit
        minimumFontScale={0.65}
      >
        {props.payload.headline}
      </Text>

      <View style={[styles.shareMetaRow, !isStory && styles.shareMetaRowSquare]}>
        <View style={[styles.shareMetaCard, !isStory && styles.shareMetaCardSquare]}>
          <Text style={[styles.shareMetaLabel, !isStory && styles.shareMetaLabelSquare]}>{t('numerology.sharePersonalYear')}</Text>
          <Text style={[styles.shareMetaValue, !isStory && styles.shareMetaValueSquare]}>{props.payload.personalYear}</Text>
        </View>
        <View style={[styles.shareMetaCard, !isStory && styles.shareMetaCardSquare]}>
          <Text style={[styles.shareMetaLabel, !isStory && styles.shareMetaLabelSquare]}>{t('numerology.shareTheme')}</Text>
          <Text
            style={[styles.shareMetaValue, !isStory && styles.shareMetaValueSquare]}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
          >
            {props.payload.shortTheme}
          </Text>
        </View>
      </View>

      <Text style={[styles.shareFooter, !isStory && styles.shareFooterSquare]}>
        {generatedDate
          ? `${t('numerology.shareFooter')} • ${generatedDate}`
          : t('numerology.shareFooter')}
      </Text>
    </LinearGradient>
  );
}

export function NumerologyLoadingSkeleton() {
  const styles = createStyles(useTheme().colors);

  return (
    <View style={styles.skeletonStack}>
      <Skeleton height={196} borderRadius={24} />
      <Skeleton height={152} borderRadius={20} />
      <Skeleton height={116} borderRadius={18} />
      <Skeleton height={116} borderRadius={18} />
      <Skeleton height={160} borderRadius={20} />
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    heroCard: {
      borderRadius: 28,
      padding: 22,
      gap: 18,
      borderWidth: 1,
      borderColor: 'rgba(240, 204, 85, 0.22)',
      shadowColor: '#0B1330',
      shadowOpacity: 0.22,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 16 },
      elevation: 7,
    },
    heroHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    heroKickerWrap: { flex: 1, gap: 6 },
    heroKicker: {
      color: 'rgba(255,255,255,0.68)',
      fontSize: 11,
      letterSpacing: 1.4,
      textTransform: 'uppercase',
      fontWeight: '700',
    },
    heroName: {
      color: '#F8F6FF',
      fontSize: 26,
      lineHeight: 32,
      fontWeight: '800',
    },
    heroMainRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    heroNumberOrb: {
      width: 112,
      height: 132,
      borderRadius: 30,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(240, 204, 85, 0.35)',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 10,
    },
    heroNumberValue: {
      color: '#F9D86F',
      fontSize: 38,
      lineHeight: 42,
      fontWeight: '900',
    },
    heroNumberLabel: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 11,
      lineHeight: 15,
      textAlign: 'center',
      marginTop: 6,
      fontWeight: '600',
    },
    heroTextCol: {
      flex: 1,
      gap: 8,
      alignItems: 'flex-start',
    },
    heroHeadline: {
      color: '#FFFFFF',
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '800',
    },
    heroTheme: {
      color: 'rgba(255,255,255,0.8)',
      fontSize: 14,
      lineHeight: 21,
    },
    heroFooterRow: {
      gap: 14,
    },
    heroFootnote: {
      color: 'rgba(255,255,255,0.66)',
      fontSize: 12,
      lineHeight: 18,
    },
    heroActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
    },
    actionButtonLabel: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
    card: {
      backgroundColor: colors.card,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 18,
      gap: 12,
    },
    cardHeaderRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      gap: 12,
    },
    cardEyebrow: {
      color: colors.subtext,
      fontSize: 11,
      letterSpacing: 1,
      textTransform: 'uppercase',
      fontWeight: '700',
      marginBottom: 4,
    },
    cardTitle: {
      color: colors.text,
      fontSize: 19,
      lineHeight: 24,
      fontWeight: '800',
    },
    bodyText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
    },
    primaryBody: {
      color: colors.text,
      fontSize: 17,
      lineHeight: 25,
      fontWeight: '700',
    },
    sectionLabel: {
      color: colors.subtext,
      fontSize: 11,
      lineHeight: 16,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    infoPill: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
    },
    infoPillText: {
      fontSize: 11,
      lineHeight: 14,
      fontWeight: '700',
    },
    timingBadgeStack: {
      alignItems: 'flex-end',
      gap: 6,
    },
    progressRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 2,
    },
    metaLabel: {
      color: colors.subtext,
      fontSize: 12,
      fontWeight: '600',
    },
    progressLabel: {
      color: colors.text,
      fontSize: 12,
      fontWeight: '800',
    },
    progressTrack: {
      height: 10,
      borderRadius: 999,
      backgroundColor: colors.surfaceAlt,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
      backgroundColor: colors.primary,
    },
    statGrid: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 4,
    },
    statItem: {
      flex: 1,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 12,
      gap: 6,
    },
    statText: {
      color: colors.text,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '600',
    },
    segmentedRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 6,
    },
    segmentButton: {
      flex: 1,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 10,
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
    guidanceFooter: {
      gap: 12,
    },
    guidancePromptBox: {
      backgroundColor: colors.surfaceAlt,
      borderRadius: 16,
      padding: 14,
      gap: 6,
    },
    guidancePromptLabel: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    guidancePromptText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 22,
      fontWeight: '600',
    },
    metaHint: {
      color: colors.subtext,
      fontSize: 12,
      lineHeight: 18,
    },
    inlinePillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    chipWrap: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    giftChip: {
      borderRadius: 999,
      paddingVertical: 7,
      paddingHorizontal: 10,
      backgroundColor: colors.primarySoft,
    },
    giftChipText: {
      color: colors.primary700,
      fontSize: 12,
      fontWeight: '700',
    },
    bulletList: {
      gap: 8,
    },
    bulletRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    bulletDot: {
      width: 7,
      height: 7,
      borderRadius: 999,
      marginTop: 7,
    },
    bulletText: {
      flex: 1,
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
    },
    tryTodayBox: {
      marginTop: 10,
      borderRadius: 16,
      padding: 14,
      backgroundColor: colors.goldLight,
      gap: 6,
    },
    tryTodayLabel: {
      color: colors.goldDark,
      fontSize: 12,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 0.7,
    },
    tryTodayText: {
      color: colors.textDark,
      fontSize: 14,
      lineHeight: 21,
      fontWeight: '600',
    },
    compatibilityTeaserBox: {
      marginTop: 8,
      borderRadius: 16,
      padding: 14,
      backgroundColor: colors.surfaceAlt,
      gap: 6,
    },
    compatibilityTeaserLabel: {
      color: colors.primary,
      fontSize: 12,
      fontWeight: '700',
    },
    compatibilityTeaserText: {
      color: colors.text,
      fontSize: 14,
      lineHeight: 21,
    },
    bridgeCard: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      padding: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    bridgeIconWrap: {
      width: 42,
      height: 42,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    bridgeTextCol: {
      flex: 1,
      gap: 4,
    },
    bridgeTitle: {
      color: colors.text,
      fontSize: 15,
      lineHeight: 21,
      fontWeight: '800',
    },
    bridgeDescription: {
      color: colors.subtext,
      fontSize: 13,
      lineHeight: 19,
    },
    bridgeCta: {
      color: colors.primary,
      fontSize: 12,
      lineHeight: 18,
      fontWeight: '800',
      marginTop: 2,
    },
    lockCard: {
      borderRadius: 20,
      padding: 18,
      borderWidth: 1,
      borderColor: colors.goldLight,
      backgroundColor: '#FFF8E4',
      gap: 10,
    },
    lockHeaderRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    lockTitle: {
      color: colors.textDark,
      fontSize: 16,
      lineHeight: 22,
      fontWeight: '800',
    },
    lockDescription: {
      color: colors.textSoft,
      fontSize: 14,
      lineHeight: 21,
    },
    lockButton: {
      alignSelf: 'flex-start',
      backgroundColor: colors.goldDark,
      paddingVertical: 11,
      paddingHorizontal: 14,
      borderRadius: 999,
    },
    lockButtonText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '800',
    },
    stateCard: {
      borderRadius: 22,
      padding: 22,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      alignItems: 'center',
      gap: 10,
    },
    stateIconWrap: {
      width: 48,
      height: 48,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    stateTitle: {
      color: colors.text,
      fontSize: 18,
      lineHeight: 24,
      fontWeight: '800',
      textAlign: 'center',
    },
    stateDescription: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 21,
      textAlign: 'center',
    },
    stateButton: {
      marginTop: 4,
      backgroundColor: colors.primary,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 999,
    },
    stateButtonText: {
      color: colors.white,
      fontSize: 13,
      fontWeight: '800',
    },
    sheetContent: {
      gap: 12,
      paddingBottom: 16,
    },
    sheetLead: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 21,
    },
    shareCard: {
      overflow: 'hidden',
      justifyContent: 'space-between',
    },
    shareCardStory: {
      width: 1080,
      height: 1920,
      borderRadius: 48,
      padding: 92,
    },
    shareCardSquare: {
      width: 1080,
      height: 1080,
      borderRadius: 40,
      padding: 72,
    },
    shareOrb: {
      position: 'absolute',
      width: 520,
      height: 520,
      borderRadius: 999,
      top: -90,
      right: -80,
      backgroundColor: 'rgba(240, 204, 85, 0.12)',
    },
    shareBrand: {
      color: 'rgba(255,255,255,0.72)',
      fontSize: 32,
      fontWeight: '700',
    },
    shareBrandSquare: {
      fontSize: 26,
      marginBottom: 2,
    },
    shareKicker: {
      color: '#F9D86F',
      fontSize: 30,
      lineHeight: 40,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 2,
      marginTop: 40,
    },
    shareKickerSquare: {
      fontSize: 24,
      lineHeight: 32,
      marginTop: 18,
    },
    shareName: {
      color: '#FFFFFF',
      fontSize: 84,
      lineHeight: 96,
      fontWeight: '900',
      marginTop: 24,
    },
    shareNameSquare: {
      fontSize: 58,
      lineHeight: 68,
      marginTop: 16,
    },
    shareNumberWrap: {
      alignSelf: 'flex-start',
      minWidth: 280,
      paddingHorizontal: 40,
      paddingVertical: 36,
      borderRadius: 42,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(249,216,111,0.35)',
      marginTop: 40,
    },
    shareNumberWrapSquare: {
      minWidth: 220,
      paddingHorizontal: 30,
      paddingVertical: 24,
      borderRadius: 32,
      marginTop: 24,
    },
    shareNumberValue: {
      color: '#F9D86F',
      fontSize: 136,
      lineHeight: 144,
      fontWeight: '900',
    },
    shareNumberValueSquare: {
      fontSize: 98,
      lineHeight: 108,
    },
    shareNumberCaption: {
      color: 'rgba(255,255,255,0.82)',
      fontSize: 34,
      lineHeight: 44,
      fontWeight: '700',
      marginTop: 8,
    },
    shareNumberCaptionSquare: {
      fontSize: 24,
      lineHeight: 32,
      marginTop: 4,
    },
    shareHeadline: {
      color: '#FFFFFF',
      fontSize: 56,
      lineHeight: 72,
      fontWeight: '800',
      marginTop: 48,
    },
    shareHeadlineSquare: {
      fontSize: 42,
      lineHeight: 52,
      marginTop: 24,
    },
    shareMetaRow: {
      flexDirection: 'row',
      gap: 28,
      marginTop: 48,
    },
    shareMetaRowSquare: {
      marginTop: 20,
      gap: 16,
    },
    shareMetaCard: {
      flex: 1,
      minHeight: 240,
      padding: 32,
      borderRadius: 32,
      backgroundColor: 'rgba(255,255,255,0.08)',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.12)',
      gap: 16,
    },
    shareMetaCardSquare: {
      minHeight: 156,
      padding: 22,
      borderRadius: 24,
      gap: 10,
    },
    shareMetaLabel: {
      color: 'rgba(255,255,255,0.62)',
      fontSize: 26,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1.4,
    },
    shareMetaLabelSquare: {
      fontSize: 18,
      letterSpacing: 1,
    },
    shareMetaValue: {
      color: '#FFFFFF',
      fontSize: 40,
      lineHeight: 56,
      fontWeight: '800',
    },
    shareMetaValueSquare: {
      fontSize: 28,
      lineHeight: 36,
    },
    shareFooter: {
      color: 'rgba(255,255,255,0.76)',
      fontSize: 28,
      lineHeight: 40,
      fontWeight: '600',
      marginTop: 56,
    },
    shareFooterSquare: {
      fontSize: 20,
      lineHeight: 28,
      marginTop: 26,
    },
    skeletonStack: {
      gap: 14,
    },
  });
}

export default {
  NumerologyHeroCard,
  NumerologyTimingCard,
  GuidanceCard,
  NumberInsightCard,
  CombinedProfileCard,
  ProfileInsightCard,
  NumerologyBridgeCard,
  NumerologyLockCard,
  NumerologyStateCard,
  TrustInfoSheet,
  NumerologyShareCard,
  NumerologyLoadingSkeleton,
};
