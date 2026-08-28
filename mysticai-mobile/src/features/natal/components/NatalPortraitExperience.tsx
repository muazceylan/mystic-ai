import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

import { AppText, ErrorStateCard } from '../../../components/ui';
import { useTheme, type ThemeColors } from '../../../context/ThemeContext';
import { spacing, radius } from '../../../theme';
import type {
  NatalBigThreeEntry,
  NatalChartContext,
  NatalPortrait,
  NatalTopic,
} from '../../../services/natalPortrait.service';

import PortraitHeroCard from './PortraitHeroCard';
import BigThreeStrip, { type BigThreeCardData, type BigThreeRole } from './BigThreeStrip';
import BigThreeDetailSheet from './BigThreeDetailSheet';
import TopicCard, { TopicCardSkeleton } from './TopicCard';
import TopicDetailSheet from './TopicDetailSheet';
import LearnPlacementCard from './LearnPlacementCard';
import AspectStorySection from './AspectStorySection';
import AskChartSection from './AskChartSection';
import QualitativeLevels from './QualitativeLevels';

import { ABOUT_ME_ORDER, LIFE_AREA_ORDER, sortTopics, topicIcon } from '../topicMeta';
import { buildChartLevels, buildPlacementLevels } from '../chartLevels';
import { buildMoonLesson } from '../placementLesson';
import natalAnalytics from '../analytics';
import { useAskChart } from '../hooks/useNatalPortrait';

interface Props {
  portrait: NatalPortrait | null;
  context: NatalChartContext | null | undefined;
  loading: boolean;
  isError: boolean;
  isFallback: boolean;
  locale: string;
  /** Localized "Balık Güneş · Başak Ay · Aslan Yükselen" line for the hero. */
  bigThreeLine: string;
  bigThreeCards: BigThreeCardData[];
  onRetry: () => void;
  /**
   * Whether the deeper reading is unlocked, using the screen's existing
   * NATAL_CHART_DETAIL_VIEW entitlement. The old "Guru Yorum" accordion sat behind this same
   * gate, so the redesign inherits it rather than quietly giving that content away.
   */
  detailUnlocked: boolean;
  /** Opens the existing unlock sheet. Called when a locked card is tapped. */
  onRequestUnlock: () => void;
}

/**
 * The redesigned Haritam experience, from the hero down to "Haritama Sor".
 *
 * Kept as one component rather than being spread through the route file so the new information
 * architecture is legible in one place: portrait, Big Three, Beni Anlat, Hayatım, Haritamı Öğren,
 * aspects as lived experience, and finally the chart question box. The technical chart — the
 * wheel, tables, degrees and matrices — is intentionally not here; it lives below this block under
 * "Astrolojik Detaylar", so a beginner reaches meaning first and an advanced user still loses
 * nothing.
 *
 * Interpretation failures degrade locally. If this block cannot load, the calculated chart beneath
 * it still renders — the astrology data is never held hostage by the interpretation layer.
 */
export default function NatalPortraitExperience({
  portrait,
  context,
  loading,
  isError,
  isFallback,
  locale,
  bigThreeLine,
  bigThreeCards,
  onRetry,
  detailUnlocked,
  onRequestUnlock,
}: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const s = createStyles(colors);

  const [activeRole, setActiveRole] = useState<BigThreeRole | null>(null);
  const [activeTopic, setActiveTopic] = useState<NatalTopic | null>(null);
  const [activeTopicGroup, setActiveTopicGroup] = useState<'about_me' | 'life_area'>('about_me');

  const ask = useAskChart();

  const aboutMe = useMemo(
    () => sortTopics(portrait?.aboutMe ?? [], ABOUT_ME_ORDER),
    [portrait?.aboutMe],
  );
  const lifeAreas = useMemo(
    () => sortTopics(portrait?.lifeAreas ?? [], LIFE_AREA_ORDER),
    [portrait?.lifeAreas],
  );

  const chartLevels = useMemo(() => buildChartLevels(context, t), [context, t]);
  const moonLesson = useMemo(() => buildMoonLesson(context, locale, t), [context, locale, t]);

  // One event the first time the teaching card is available, not on every re-render.
  const learnLoggedRef = useRef(false);
  useEffect(() => {
    if (!moonLesson || learnLoggedRef.current) return;
    learnLoggedRef.current = true;
    natalAnalytics.learnOpened({ locale });
  }, [moonLesson, locale]);

  const activeEntry: NatalBigThreeEntry | null = useMemo(() => {
    if (!activeRole || !portrait?.bigThree) return null;
    return portrait.bigThree[activeRole] ?? null;
  }, [activeRole, portrait?.bigThree]);

  const activeLevels = useMemo(() => {
    if (!activeRole) return [];
    const planet = activeRole === 'sun' ? 'Sun' : activeRole === 'moon' ? 'Moon' : 'Ascendant';
    return buildPlacementLevels(context, planet, t);
  }, [activeRole, context, t]);

  const openRole = useCallback(
    (role: BigThreeRole) => {
      setActiveRole(role);
      natalAnalytics.bigThreeOpened({ role, locale });
    },
    [locale],
  );

  // The hero, the Big Three and the first "Beni Anlat" card stay free — enough for a new user to
  // see the redesign is about them. Everything deeper sits behind the gate the old interpretation
  // accordion already used.
  const isTopicLocked = useCallback(
    (topic: NatalTopic, group: 'about_me' | 'life_area') => {
      if (detailUnlocked) return false;
      return !(group === 'about_me' && topic.id === 'core_character');
    },
    [detailUnlocked],
  );

  const openTopic = useCallback(
    (topic: NatalTopic, group: 'about_me' | 'life_area') => {
      if (isTopicLocked(topic, group)) {
        onRequestUnlock();
        return;
      }
      setActiveTopic(topic);
      setActiveTopicGroup(group);
      natalAnalytics.topicOpened({ topic_id: topic.id, group, locale });
    },
    [locale, isTopicLocked, onRequestUnlock],
  );

  const openPortraitDetail = useCallback(() => {
    // The hero's CTA drops the reader into the fullest single reading we have.
    const target = aboutMe.find((topic) => topic.id === 'core_character') ?? aboutMe[0];
    if (target) openTopic(target, 'about_me');
  }, [aboutMe, openTopic]);

  return (
    <View style={s.wrapper}>
      <PortraitHeroCard
        portrait={portrait}
        loading={loading}
        locale={locale}
        bigThreeLine={bigThreeLine}
        isFallback={isFallback}
        onOpenDetail={openPortraitDetail}
      />

      {isError && !portrait ? (
        <ErrorStateCard
          message={t('natalPortrait.errorMessage')}
          onRetry={onRetry}
          accessibilityLabel={t('natalPortrait.errorTitle')}
        />
      ) : null}

      <SectionHeader title={t('natalPortrait.bigThreeSectionTitle')} colors={colors} />
      <BigThreeStrip cards={bigThreeCards} loading={loading} onSelect={openRole} />

      <SectionHeader
        title={t('natalPortrait.aboutMeSectionTitle')}
        subtitle={t('natalPortrait.aboutMeSectionSubtitle')}
        colors={colors}
      />
      <TopicGrid
        topics={aboutMe}
        loading={loading}
        skeletonCount={ABOUT_ME_ORDER.length}
        isLocked={(topic) => isTopicLocked(topic, 'about_me')}
        onPress={(topic) => openTopic(topic, 'about_me')}
      />

      <SectionHeader
        title={t('natalPortrait.lifeAreasSectionTitle')}
        subtitle={t('natalPortrait.lifeAreasSectionSubtitle')}
        colors={colors}
      />
      <TopicGrid
        topics={lifeAreas}
        loading={loading}
        skeletonCount={LIFE_AREA_ORDER.length}
        isLocked={(topic) => isTopicLocked(topic, 'life_area')}
        onPress={(topic) => openTopic(topic, 'life_area')}
      />

      {portrait?.aspectStory ? (
        <>
          <SectionHeader
            title={t('natalPortrait.aspectSectionTitle')}
            subtitle={t('natalPortrait.aspectSectionSubtitle')}
            colors={colors}
          />
          <AspectStorySection story={portrait.aspectStory} locale={locale} />
        </>
      ) : null}

      {chartLevels.length ? (
        <>
          <SectionHeader
            title={t('natalPortrait.emphasisSectionTitle')}
            subtitle={t('natalPortrait.emphasisSectionSubtitle')}
            colors={colors}
          />
          <View style={s.levelsCard}>
            <QualitativeLevels levels={chartLevels} />
          </View>
        </>
      ) : null}

      {moonLesson ? (
        <>
          <SectionHeader title={t('natalPortrait.learnSectionTitle')} colors={colors} />
          <LearnPlacementCard lesson={moonLesson} />
        </>
      ) : null}

      <SectionHeader
        title={t('natalPortrait.askSectionTitle')}
        subtitle={t('natalPortrait.askSectionSubtitle')}
        colors={colors}
      />
      <AskChartSection
        locale={locale}
        answer={ask.answer}
        isPending={ask.isPending}
        isError={ask.isError}
        onAsk={ask.ask}
        disabled={loading || !portrait || !detailUnlocked}
        locked={!detailUnlocked}
        onRequestUnlock={onRequestUnlock}
      />

      <BigThreeDetailSheet
        visible={!!activeRole && !!activeEntry}
        onClose={() => setActiveRole(null)}
        entry={activeEntry}
        locale={locale}
        levels={activeLevels}
      />

      <TopicDetailSheet
        visible={!!activeTopic}
        onClose={() => setActiveTopic(null)}
        topic={activeTopic}
        locale={locale}
      />
    </View>
  );
}

function TopicGrid({
  topics,
  loading,
  skeletonCount,
  isLocked,
  onPress,
}: {
  topics: NatalTopic[];
  loading: boolean;
  skeletonCount: number;
  isLocked: (topic: NatalTopic) => boolean;
  onPress: (topic: NatalTopic) => void;
}) {
  const { colors } = useTheme();
  const s = createStyles(colors);

  if (loading) {
    return (
      <View style={s.grid}>
        {Array.from({ length: Math.min(skeletonCount, 4) }).map((_, index) => (
          <TopicCardSkeleton key={index} />
        ))}
      </View>
    );
  }

  if (!topics.length) return null;

  return (
    <View style={s.grid}>
      {topics.map((topic) => (
        <TopicCard
          key={topic.id}
          topic={topic}
          icon={topicIcon(topic.id) as React.ComponentProps<typeof Ionicons>['name']}
          locked={isLocked(topic)}
          onPress={onPress}
        />
      ))}
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle?: string;
  colors: ThemeColors;
}) {
  const s = createStyles(colors);
  return (
    <View style={s.sectionHeader}>
      <AppText variant="CaptionBold" style={s.sectionTitle}>
        {title}
      </AppText>
      {subtitle ? (
        <AppText variant="CaptionSmall" style={s.sectionSubtitle}>
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const createStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    wrapper: {
      gap: spacing.md,
    },
    sectionHeader: {
      marginTop: spacing.sm,
      gap: 2,
    },
    sectionTitle: {
      color: colors.birthChart.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 1.1,
    },
    sectionSubtitle: {
      color: colors.birthChart.textMuted,
      opacity: 0.85,
    },
    grid: {
      gap: spacing.cardGap,
    },
    levelsCard: {
      backgroundColor: colors.birthChart.cardBackground,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.birthChart.cardBorder,
      borderRadius: radius.card,
      padding: spacing.lg,
    },
  });
