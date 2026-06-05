import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, Layout } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme, type ThemeColors } from '../../context/ThemeContext';
import { RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import { Skeleton } from '../ui';
import type { DailyFeedbackPayload } from '../../types/daily.types';

type IoniconName = keyof typeof Ionicons.glyphMap;

export type InsightStatus = 'supportive' | 'attention' | 'low' | 'intense' | 'neutral';
export type TransitFilterKey = 'all' | 'supportive' | 'attention' | `category:${string}`;

export interface HeroChip {
  label: string;
  type: 'positive' | 'warning' | 'neutral';
  icon?: IoniconName;
}

export interface TodayInfluenceViewModel {
  hero: {
    title: string;
    summary: string;
    score?: number;
    icon: IoniconName;
    chips: HeroChip[];
  };
  summaryCards: Array<{
    label: string;
    value: string;
    icon: IoniconName;
  }>;
  miniPlan: {
    title: string;
    items: string[];
    ctaLabel: string;
  };
  skyData: {
    moonPhase?: string;
    moonSign?: string;
    retroLabel: string;
  };
  transits: Array<{
    id: string;
    category: string;
    status: InsightStatus;
    title: string;
    description: string;
    timeWindow?: string;
    details: {
      meaning: string;
      helps: string[];
      avoid: string[];
      personalEffect: string;
      facts: Array<{ label: string; value: string }>;
    };
  }>;
}

export interface TransitFilterOption {
  key: TransitFilterKey;
  label: string;
  tone?: 'default' | 'supportive' | 'attention';
}

type PremiumPalette = {
  background: string;
  card: string;
  cardSoft: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  border: string;
  borderStrong: string;
  purple: string;
  purpleDark: string;
  lavender: string;
  pinkSoft: string;
  greenSoft: string;
  greenText: string;
  redSoft: string;
  redText: string;
  goldSoft: string;
  goldText: string;
  shadow: string;
  white: string;
};

function usePremiumText() {
  const { i18n } = useTranslation();
  const isEnglish = (i18n.resolvedLanguage ?? i18n.language).toLowerCase().startsWith('en');

  return isEnglish
    ? {
        isEnglish,
        skyTitle: 'Sky Data',
        moonPhase: 'Moon Phase',
        moonSign: 'Moon Sign',
        retro: 'Retro',
        transitsTitle: 'Transit Cards',
        detailsOpen: 'Open Details',
        detailsClose: 'Hide Details',
        meaningTitle: 'What does this mean?',
        helpsTitle: 'Good for today',
        avoidTitle: 'Avoid today',
        personalTitle: 'Personal effect',
        helpful: 'Helpful',
        notForMe: 'Not for me',
        statusAttention: 'Caution',
        statusSupportive: 'Supportive',
        statusIntense: 'Intense',
        statusLow: 'Low',
        statusNeutral: 'Neutral',
      }
    : {
        isEnglish,
        skyTitle: 'Gökyüzü Verileri',
        moonPhase: 'Ay Fazı',
        moonSign: 'Ay Burcu',
        retro: 'Retro',
        transitsTitle: 'Transit Kartları',
        detailsOpen: 'Detayları Aç',
        detailsClose: 'Detayları Gizle',
        meaningTitle: 'Bu ne anlama geliyor?',
        helpsTitle: 'Bugün iyi gelir',
        avoidTitle: 'Bugün kaçın',
        personalTitle: 'Kişisel etkisi',
        helpful: 'Faydalı',
        notForMe: 'Bana uygun değil',
        statusAttention: 'Dikkat',
        statusSupportive: 'Destekleyici',
        statusIntense: 'Yoğun',
        statusLow: 'Düşük',
        statusNeutral: 'Nötr',
      };
}

function usePremiumPalette(): PremiumPalette {
  const { colors, isDark } = useTheme();

  return useMemo(
    () => ({
      background: isDark ? '#0F0B1F' : '#FAF7FF',
      card: isDark ? '#18122B' : '#FFFFFF',
      cardSoft: isDark ? '#21183A' : '#F7F0FF',
      textPrimary: isDark ? '#FFFFFF' : '#171326',
      textSecondary: isDark ? '#C5BDD6' : '#514865',
      textMuted: isDark ? '#AFA5C6' : '#746B84',
      border: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(123,74,226,0.14)',
      borderStrong: isDark ? 'rgba(190,160,255,0.24)' : 'rgba(123,74,226,0.20)',
      purple: colors.primary || '#9C45F5',
      purpleDark: isDark ? '#B58CFF' : '#6B2AE6',
      lavender: isDark ? 'rgba(188,155,255,0.18)' : '#EBDDFE',
      pinkSoft: isDark ? 'rgba(255,159,207,0.14)' : '#FFE5F2',
      greenSoft: isDark ? 'rgba(47,214,137,0.16)' : '#DDFBEA',
      greenText: isDark ? '#86EFAC' : '#0F9D68',
      redSoft: isDark ? 'rgba(255,120,120,0.16)' : '#FFE3E3',
      redText: isDark ? '#FDA4A4' : '#D64343',
      goldSoft: isDark ? 'rgba(251,191,36,0.15)' : '#FFF2CC',
      goldText: isDark ? '#FDE68A' : '#B7791F',
      shadow: colors.shadow,
      white: colors.white,
    }),
    [colors, isDark],
  );
}

function statusTone(status: InsightStatus, P: PremiumPalette) {
  if (status === 'attention') return { bg: P.redSoft, text: P.redText };
  if (status === 'supportive') return { bg: P.greenSoft, text: P.greenText };
  if (status === 'intense') return { bg: P.goldSoft, text: P.goldText };
  if (status === 'low') return { bg: P.cardSoft, text: P.textMuted };
  return { bg: P.lavender, text: P.purpleDark };
}

function filterTone(option: TransitFilterOption, selected: boolean, P: PremiumPalette) {
  if (selected) {
    return {
      bg: P.purple,
      text: P.white,
      border: P.purple,
    };
  }
  if (option.tone === 'supportive') {
    return { bg: P.greenSoft, text: P.greenText, border: 'transparent' };
  }
  if (option.tone === 'attention') {
    return { bg: P.redSoft, text: P.redText, border: 'transparent' };
  }
  return { bg: P.card, text: P.purpleDark, border: P.border };
}

export function PremiumCard({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: object;
}) {
  const P = usePremiumPalette();

  return (
    <View
      style={[
        styles.premiumCard,
        {
          backgroundColor: P.card,
          borderColor: P.border,
          shadowColor: P.shadow,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function HeroInsightCard({ hero }: { hero: TodayInfluenceViewModel['hero'] }) {
  const P = usePremiumPalette();

  return (
    <Animated.View entering={FadeInDown.duration(360)} layout={Layout.springify().damping(18)}>
      <LinearGradient
        colors={
          P.background === '#0F0B1F'
            ? ['#24143A', '#2B1B44', '#171128']
            : ['#FFEAF5', '#F2E6FF', '#F8F1FF']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.heroCard,
          {
            borderColor: P.borderStrong,
            shadowColor: P.shadow,
          },
        ]}
      >
        <View pointerEvents="none" style={styles.heroMoon}>
          <View style={[styles.heroMoonOuter, { borderColor: P.background === '#0F0B1F' ? 'rgba(255,255,255,0.12)' : 'rgba(156,69,245,0.14)' }]}>
            <Ionicons name="moon" size={42} color={P.background === '#0F0B1F' ? 'rgba(255,255,255,0.24)' : 'rgba(156,69,245,0.24)'} />
          </View>
        </View>
        <View pointerEvents="none" style={styles.starOne} />
        <View pointerEvents="none" style={styles.starTwo} />
        <View style={styles.heroTopRow}>
          <View style={[styles.heroIconBadge, { backgroundColor: P.card, shadowColor: P.shadow }]}>
            <Ionicons name={hero.icon} size={25} color={P.purpleDark} />
          </View>
          {typeof hero.score === 'number' ? (
            <View style={[styles.scorePill, { backgroundColor: P.card }]}>
              <Text style={[styles.scoreText, { color: P.purpleDark }]}>{hero.score}%</Text>
            </View>
          ) : null}
        </View>

        <Text style={[styles.heroTitle, { color: P.textPrimary }]} numberOfLines={2}>
          {hero.title}
        </Text>
        <Text style={[styles.heroSummary, { color: P.textSecondary }]} numberOfLines={5}>
          {hero.summary}
        </Text>

        <View style={styles.heroChipRow}>
          {hero.chips.map((chip) => {
            const colors = chip.type === 'positive'
              ? { bg: P.greenSoft, text: P.greenText }
              : chip.type === 'warning'
                ? { bg: P.redSoft, text: P.redText }
                : { bg: 'rgba(255,255,255,0.74)', text: P.purpleDark };

            return (
              <View key={chip.label} style={[styles.heroChip, { backgroundColor: colors.bg }]}>
                {chip.icon ? <Ionicons name={chip.icon} size={14} color={colors.text} /> : null}
                <Text style={[styles.heroChipText, { color: colors.text }]} numberOfLines={1}>
                  {chip.label}
                </Text>
              </View>
            );
          })}
        </View>
      </LinearGradient>
    </Animated.View>
  );
}

export function TodaySummaryCards({
  items,
}: {
  items: TodayInfluenceViewModel['summaryCards'];
}) {
  const P = usePremiumPalette();

  return (
    <Animated.View entering={FadeInDown.delay(60).duration(360)} style={styles.summaryRow}>
      {items.map((item) => (
        <View
          key={item.label}
          style={[
            styles.summaryCard,
            {
              backgroundColor: P.card,
              borderColor: P.border,
              shadowColor: P.shadow,
            },
          ]}
        >
          <View style={[styles.summaryIcon, { backgroundColor: P.lavender }]}>
            <Ionicons name={item.icon} size={18} color={P.purpleDark} />
          </View>
          <Text style={[styles.summaryLabel, { color: P.textMuted }]} numberOfLines={1}>
            {item.label}
          </Text>
          <Text style={[styles.summaryValue, { color: P.textPrimary }]} numberOfLines={2}>
            {item.value}
          </Text>
        </View>
      ))}
    </Animated.View>
  );
}

export function ChecklistItem({ text }: { text: string }) {
  const P = usePremiumPalette();

  return (
    <View style={styles.checkRow}>
      <View style={[styles.checkIcon, { backgroundColor: P.purple }]}>
        <Ionicons name="checkmark" size={13} color={P.white} />
      </View>
      <Text style={[styles.checkText, { color: P.textSecondary }]}>{text}</Text>
    </View>
  );
}

export function MiniPlanCard({
  plan,
  onPressCta,
}: {
  plan: TodayInfluenceViewModel['miniPlan'];
  onPressCta: () => void;
}) {
  const P = usePremiumPalette();

  return (
    <Animated.View entering={FadeInDown.delay(110).duration(360)}>
      <PremiumCard style={styles.miniPlanCard}>
        <View pointerEvents="none" style={styles.compassDecor}>
          <Ionicons name="compass-outline" size={94} color={P.background === '#0F0B1F' ? 'rgba(255,255,255,0.10)' : 'rgba(156,69,245,0.16)'} />
        </View>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionIconBubble, { backgroundColor: P.lavender }]}>
            <Ionicons name="sparkles" size={17} color={P.purpleDark} />
          </View>
          <Text style={[styles.sectionTitle, { color: P.textPrimary }]}>{plan.title}</Text>
        </View>

        <View style={styles.checkList}>
          {plan.items.map((item, index) => (
            <ChecklistItem key={`${item}-${index}`} text={item} />
          ))}
        </View>

        <Pressable
          onPress={onPressCta}
          accessibilityRole="button"
          style={({ pressed }) => [styles.ctaPressable, pressed && styles.pressedScale]}
        >
          <LinearGradient
            colors={[P.purple, P.purpleDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.ctaGradient}
          >
            <Text style={styles.ctaText} numberOfLines={1}>{plan.ctaLabel}</Text>
            <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
          </LinearGradient>
        </Pressable>
      </PremiumCard>
    </Animated.View>
  );
}

export function SkyDataCard({ skyData }: { skyData: TodayInfluenceViewModel['skyData'] }) {
  const P = usePremiumPalette();
  const text = usePremiumText();
  const columns = [
    { label: text.moonPhase, value: skyData.moonPhase || (text.isEnglish ? 'Full Moon' : 'Dolunay'), icon: 'moon' as IoniconName },
    { label: text.moonSign, value: skyData.moonSign || (text.isEnglish ? 'Capricorn' : 'Oğlak'), icon: 'sparkles' as IoniconName },
    { label: text.retro, value: skyData.retroLabel, icon: 'repeat' as IoniconName },
  ];

  return (
    <Animated.View entering={FadeInDown.delay(150).duration(360)}>
      <PremiumCard style={styles.skyCard}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="sparkles" size={18} color={P.purpleDark} />
          <Text style={[styles.skyTitle, { color: P.textPrimary }]}>{text.skyTitle}</Text>
        </View>
        <View style={styles.skyColumns}>
          {columns.map((item, index) => (
            <React.Fragment key={item.label}>
              <View style={styles.skyColumn}>
                <View style={[styles.skyIcon, { backgroundColor: P.lavender }]}>
                  <Ionicons name={item.icon} size={22} color={P.purpleDark} />
                </View>
                <View style={styles.skyTextWrap}>
                  <Text style={[styles.skyLabel, { color: P.textMuted }]} numberOfLines={2}>
                    {item.label}
                  </Text>
                  <Text
                    style={[styles.skyValue, { color: P.textPrimary }]}
                    numberOfLines={2}
                    adjustsFontSizeToFit
                    minimumFontScale={0.88}
                  >
                    {item.value}
                  </Text>
                </View>
              </View>
              {index < columns.length - 1 ? <View style={[styles.skyDivider, { backgroundColor: P.border }]} /> : null}
            </React.Fragment>
          ))}
        </View>
      </PremiumCard>
    </Animated.View>
  );
}

export function TransitFilters({
  options,
  selected,
  onSelect,
}: {
  options: TransitFilterOption[];
  selected: TransitFilterKey;
  onSelect: (key: TransitFilterKey) => void;
}) {
  const P = usePremiumPalette();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterScroller}
    >
      {options.map((option) => {
        const selectedOption = option.key === selected;
        const tone = filterTone(option, selectedOption, P);
        return (
          <Pressable
            key={option.key}
            onPress={() => onSelect(option.key)}
            accessibilityRole="button"
            accessibilityState={{ selected: selectedOption }}
            style={({ pressed }) => [
              styles.filterPill,
              {
                backgroundColor: tone.bg,
                borderColor: tone.border,
                opacity: pressed ? 0.82 : 1,
              },
            ]}
          >
            <Text style={[styles.filterText, { color: tone.text }]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

export function InsightStatusBadge({ status }: { status: InsightStatus }) {
  const P = usePremiumPalette();
  const text = usePremiumText();
  const tone = statusTone(status, P);
  const label = status === 'attention'
    ? text.statusAttention
    : status === 'supportive'
      ? text.statusSupportive
      : status === 'intense'
        ? text.statusIntense
        : status === 'low'
          ? text.statusLow
          : text.statusNeutral;

  return (
    <View style={[styles.statusBadge, { backgroundColor: tone.bg }]}>
      <Text style={[styles.statusBadgeText, { color: tone.text }]}>{label}</Text>
    </View>
  );
}

function DetailBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  const P = usePremiumPalette();
  return (
    <View style={styles.detailBlock}>
      <Text style={[styles.detailTitle, { color: P.textPrimary }]}>{title}</Text>
      {children}
    </View>
  );
}

function DetailBullets({ items }: { items: string[] }) {
  const P = usePremiumPalette();
  return (
    <View style={styles.detailBulletList}>
      {items.map((item, index) => (
        <View key={`${item}-${index}`} style={styles.detailBulletRow}>
          <View style={[styles.detailBulletDot, { backgroundColor: P.purple }]} />
          <Text style={[styles.detailBulletText, { color: P.textSecondary }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

export function TransitInsightCard({
  transit,
  date,
  onDetailOpened,
  onFeedback,
}: {
  transit: TodayInfluenceViewModel['transits'][number];
  date: string;
  onDetailOpened?: (transitId: string) => void;
  onFeedback?: (payload: DailyFeedbackPayload) => void | Promise<void>;
}) {
  const P = usePremiumPalette();
  const text = usePremiumText();
  const [expanded, setExpanded] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<DailyFeedbackPayload['sentiment'] | null>(null);
  const [feedbackPending, setFeedbackPending] = useState(false);
  const iconName: IoniconName = transit.status === 'attention' ? 'flash-outline' : 'chatbubble-ellipses-outline';

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (next) {
      onDetailOpened?.(transit.id);
    }
  };

  const submitFeedback = async (sentiment: DailyFeedbackPayload['sentiment']) => {
    if (!onFeedback || feedbackPending || selectedFeedback === sentiment) return;
    const previousFeedback = selectedFeedback;
    setSelectedFeedback(sentiment);
    setFeedbackPending(true);
    try {
      await onFeedback({ date, itemType: 'transit', itemId: transit.id, sentiment });
    } catch {
      setSelectedFeedback(previousFeedback);
    } finally {
      setFeedbackPending(false);
    }
  };

  const helpfulSelected = selectedFeedback === 'up';
  const notForMeSelected = selectedFeedback === 'down';

  return (
    <Animated.View layout={Layout.springify().damping(18)} entering={FadeIn.duration(220)}>
      <PremiumCard style={styles.transitCard}>
        <View style={styles.transitTop}>
          <View style={[styles.transitIllustration, { backgroundColor: transit.status === 'attention' ? P.redSoft : P.greenSoft }]}>
            <View style={[styles.planetDotLarge, { backgroundColor: transit.status === 'attention' ? '#EBA38E' : '#B8CFEA' }]} />
            <Ionicons name={iconName} size={21} color={transit.status === 'attention' ? P.redText : P.greenText} />
          </View>

          <View style={styles.transitBody}>
            <View style={styles.transitMetaRow}>
              <View style={styles.categoryWrap}>
                <Text style={[styles.transitCategory, { color: P.purpleDark }]} numberOfLines={1}>
                  {transit.category}
                </Text>
                {transit.timeWindow ? (
                  <Text style={[styles.transitTime, { color: P.textMuted }]} numberOfLines={1}>
                    {transit.timeWindow}
                  </Text>
                ) : null}
              </View>
              <InsightStatusBadge status={transit.status} />
            </View>

            <Text style={[styles.transitTitle, { color: P.textPrimary }]} numberOfLines={2}>
              {transit.title}
            </Text>
            <Text style={[styles.transitDescription, { color: P.textSecondary }]} numberOfLines={expanded ? undefined : 3}>
              {transit.description}
            </Text>

            <Pressable
              onPress={toggleExpanded}
              accessibilityRole="button"
              style={styles.detailToggle}
              hitSlop={8}
            >
              <Text style={[styles.detailToggleText, { color: P.purpleDark }]}>
                {expanded ? text.detailsClose : text.detailsOpen}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={P.purpleDark} />
            </Pressable>
          </View>
        </View>

        {expanded ? (
          <Animated.View
            entering={FadeInDown.duration(220)}
            style={[
              styles.detailsWrap,
              {
                backgroundColor: P.cardSoft,
                borderColor: P.border,
              },
            ]}
          >
            <DetailBlock title={text.meaningTitle}>
              <Text style={[styles.detailParagraph, { color: P.textSecondary }]}>{transit.details.meaning}</Text>
            </DetailBlock>
            <DetailBlock title={text.helpsTitle}>
              <DetailBullets items={transit.details.helps} />
            </DetailBlock>
            <DetailBlock title={text.avoidTitle}>
              <DetailBullets items={transit.details.avoid} />
            </DetailBlock>
            <DetailBlock title={text.personalTitle}>
              <Text style={[styles.detailParagraph, { color: P.textSecondary }]}>{transit.details.personalEffect}</Text>
              {transit.details.facts.length > 0 ? (
                <View style={styles.factGrid}>
                  {transit.details.facts.map((fact) => (
                    <View key={`${fact.label}-${fact.value}`} style={[styles.factChip, { borderColor: P.border, backgroundColor: P.card }]}>
                      <Text style={[styles.factLabel, { color: P.textMuted }]}>{fact.label}</Text>
                      <Text style={[styles.factValue, { color: P.textPrimary }]} numberOfLines={1}>{fact.value}</Text>
                    </View>
                  ))}
                </View>
              ) : null}
            </DetailBlock>
          </Animated.View>
        ) : null}

        {onFeedback ? (
          <View style={styles.feedbackRow}>
            <Pressable
              onPress={() => { void submitFeedback('up'); }}
              disabled={feedbackPending}
              accessibilityRole="button"
              accessibilityState={{ selected: helpfulSelected, disabled: feedbackPending }}
              style={({ pressed }) => [
                styles.feedbackBtn,
                {
                  borderColor: helpfulSelected ? P.purpleDark : P.border,
                  backgroundColor: helpfulSelected ? P.lavender : pressed ? P.cardSoft : P.card,
                  opacity: feedbackPending ? 0.72 : 1,
                },
              ]}
            >
              <Ionicons name={helpfulSelected ? 'thumbs-up' : 'thumbs-up-outline'} size={13} color={P.purpleDark} />
              <Text style={[styles.feedbackText, { color: P.purpleDark }]}>{text.helpful}</Text>
            </Pressable>
            {expanded ? (
              <Pressable
                onPress={() => { void submitFeedback('down'); }}
                disabled={feedbackPending}
                accessibilityRole="button"
                accessibilityState={{ selected: notForMeSelected, disabled: feedbackPending }}
                style={({ pressed }) => [
                  styles.feedbackBtn,
                  {
                    borderColor: notForMeSelected ? P.textMuted : P.border,
                    backgroundColor: notForMeSelected ? P.cardSoft : pressed ? P.cardSoft : P.card,
                    opacity: feedbackPending ? 0.72 : 1,
                  },
                ]}
              >
                <Ionicons name={notForMeSelected ? 'thumbs-down' : 'thumbs-down-outline'} size={13} color={P.textMuted} />
                <Text style={[styles.feedbackText, { color: P.textMuted }]}>{text.notForMe}</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </PremiumCard>
    </Animated.View>
  );
}

export function TransitCardsSection({
  transits,
  filters,
  selectedFilter,
  onSelectFilter,
  date,
  onDetailOpened,
  onFeedback,
}: {
  transits: TodayInfluenceViewModel['transits'];
  filters: TransitFilterOption[];
  selectedFilter: TransitFilterKey;
  onSelectFilter: (filter: TransitFilterKey) => void;
  date: string;
  onDetailOpened?: (transitId: string) => void;
  onFeedback?: (payload: DailyFeedbackPayload) => void | Promise<void>;
}) {
  const P = usePremiumPalette();
  const text = usePremiumText();

  return (
    <Animated.View entering={FadeInDown.delay(190).duration(360)} style={styles.transitSection}>
      <View style={styles.transitSectionHeader}>
        <View style={styles.sectionTitleRow}>
          <Ionicons name="planet" size={21} color={P.purpleDark} />
          <Text style={[styles.transitSectionTitle, { color: P.textPrimary }]}>{text.transitsTitle}</Text>
        </View>
      </View>
      <TransitFilters options={filters} selected={selectedFilter} onSelect={onSelectFilter} />
      <View style={styles.transitList}>
        {transits.map((transit) => (
          <TransitInsightCard
            key={transit.id}
            transit={transit}
            date={date}
            onDetailOpened={onDetailOpened}
            onFeedback={onFeedback}
          />
        ))}
      </View>
    </Animated.View>
  );
}

export function TodayInfluenceLoadingState() {
  return (
    <View style={styles.loadingWrap}>
      <Skeleton height={236} borderRadius={RADIUS.xl} />
      <View style={styles.summaryRow}>
        <Skeleton height={96} borderRadius={RADIUS.lg} style={{ flex: 1 }} />
        <Skeleton height={96} borderRadius={RADIUS.lg} style={{ flex: 1 }} />
        <Skeleton height={96} borderRadius={RADIUS.lg} style={{ flex: 1 }} />
      </View>
      <Skeleton height={190} borderRadius={RADIUS.xl} />
      <Skeleton height={116} borderRadius={RADIUS.xl} />
      <Skeleton height={172} borderRadius={RADIUS.xl} />
      <Skeleton height={172} borderRadius={RADIUS.xl} />
    </View>
  );
}

export function PremiumStatusCard({
  title,
  body,
  buttonLabel,
  icon = 'sparkles-outline',
  onPress,
}: {
  title: string;
  body: string;
  buttonLabel: string;
  icon?: IoniconName;
  onPress: () => void;
}) {
  const P = usePremiumPalette();

  return (
    <PremiumCard style={styles.statusCard}>
      <View style={[styles.statusIconWrap, { backgroundColor: P.lavender }]}>
        <Ionicons name={icon} size={24} color={P.purpleDark} />
      </View>
      <Text style={[styles.statusTitle, { color: P.textPrimary }]}>{title}</Text>
      <Text style={[styles.statusBody, { color: P.textSecondary }]}>{body}</Text>
      <Pressable onPress={onPress} style={({ pressed }) => [styles.statusButton, { backgroundColor: P.purple }, pressed && styles.pressedScale]}>
        <Text style={styles.statusButtonText}>{buttonLabel}</Text>
      </Pressable>
    </PremiumCard>
  );
}

export function getTodayInfluenceBackground(colors: ThemeColors, isDark: boolean): string {
  return isDark ? '#0F0B1F' : colors.bg || '#FAF7FF';
}

const styles = StyleSheet.create({
  premiumCard: {
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  heroCard: {
    minHeight: 236,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lgXl,
    overflow: 'hidden',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  heroIconBadge: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  scorePill: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xsSm,
  },
  scoreText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 12,
  },
  heroMoon: {
    position: 'absolute',
    right: -8,
    top: 28,
  },
  heroMoonOuter: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  starOne: {
    position: 'absolute',
    right: 52,
    top: 22,
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: 'rgba(255,255,255,0.78)',
  },
  starTwo: {
    position: 'absolute',
    right: 116,
    bottom: 82,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.72)',
  },
  heroTitle: {
    ...TYPOGRAPHY.H1,
    fontSize: 25,
    lineHeight: 31,
    maxWidth: '78%',
    marginBottom: SPACING.sm,
  },
  heroSummary: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 23,
    maxWidth: '88%',
  },
  heroChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  heroChip: {
    minHeight: 36,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xsSm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xsSm,
    maxWidth: '100%',
  },
  heroChipText: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 14,
    lineHeight: 18,
    flexShrink: 1,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  summaryCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    minHeight: 106,
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
  },
  summaryLabel: {
    ...TYPOGRAPHY.Caption,
    fontSize: 12,
    lineHeight: 16,
  },
  summaryValue: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 15,
    lineHeight: 20,
    marginTop: 2,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  sectionIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    ...TYPOGRAPHY.H2,
    fontSize: 21,
    lineHeight: 27,
    flex: 1,
  },
  miniPlanCard: {
    gap: SPACING.md,
    overflow: 'hidden',
  },
  compassDecor: {
    position: 'absolute',
    right: 16,
    top: 42,
  },
  checkList: {
    gap: SPACING.sm,
    paddingRight: 84,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  checkIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  checkText: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  ctaPressable: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  ctaGradient: {
    minHeight: 46,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lgXl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  ctaText: {
    ...TYPOGRAPHY.BodyBold,
    color: '#FFFFFF',
    fontSize: 16,
    lineHeight: 21,
    flexShrink: 1,
  },
  pressedScale: {
    opacity: 0.88,
    transform: [{ scale: 0.98 }],
  },
  skyCard: {
    gap: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  skyTitle: {
    ...TYPOGRAPHY.BodyBold,
    fontSize: 18,
    lineHeight: 24,
  },
  skyColumns: {
    flexDirection: 'row',
    alignItems: 'stretch',
  },
  skyColumn: {
    flex: 1,
    minWidth: 0,
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  skyIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  skyTextWrap: {
    width: '100%',
    minWidth: 0,
  },
  skyLabel: {
    ...TYPOGRAPHY.Caption,
    fontSize: 12,
    lineHeight: 16,
  },
  skyValue: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 15,
    lineHeight: 20,
  },
  skyDivider: {
    width: 1,
    alignSelf: 'stretch',
    marginHorizontal: SPACING.sm,
  },
  filterScroller: {
    gap: SPACING.sm,
    paddingRight: SPACING.lg,
  },
  filterPill: {
    minHeight: 38,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterText: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 14,
  },
  statusBadge: {
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xsSm,
    flexShrink: 0,
  },
  statusBadgeText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 12,
    lineHeight: 15,
  },
  transitSection: {
    gap: SPACING.md,
  },
  transitSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  transitSectionTitle: {
    ...TYPOGRAPHY.H2,
    fontSize: 21,
    lineHeight: 27,
  },
  transitList: {
    gap: SPACING.md,
  },
  transitCard: {
    gap: SPACING.md,
  },
  transitTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.md,
  },
  transitIllustration: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    overflow: 'hidden',
  },
  planetDotLarge: {
    position: 'absolute',
    left: 14,
    bottom: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  transitBody: {
    flex: 1,
    minWidth: 0,
  },
  transitMetaRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.sm,
    marginBottom: SPACING.xsSm,
  },
  categoryWrap: {
    flex: 1,
    minWidth: 0,
  },
  transitCategory: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 13,
    lineHeight: 17,
  },
  transitTime: {
    ...TYPOGRAPHY.Caption,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 1,
  },
  transitTitle: {
    ...TYPOGRAPHY.BodyLarge,
    fontSize: 19,
    lineHeight: 25,
    marginBottom: SPACING.xs,
  },
  transitDescription: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 22,
  },
  detailToggle: {
    alignSelf: 'flex-end',
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.sm,
  },
  detailToggleText: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 14,
  },
  detailsWrap: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: SPACING.md,
    gap: SPACING.md,
  },
  detailBlock: {
    gap: SPACING.xsSm,
  },
  detailTitle: {
    ...TYPOGRAPHY.SmallBold,
    fontSize: 14,
    lineHeight: 19,
  },
  detailParagraph: {
    ...TYPOGRAPHY.Small,
    fontSize: 14,
    lineHeight: 21,
  },
  detailBulletList: {
    gap: SPACING.xsSm,
  },
  detailBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: SPACING.sm,
  },
  detailBulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginTop: 8,
  },
  detailBulletText: {
    ...TYPOGRAPHY.Small,
    fontSize: 14,
    lineHeight: 21,
    flex: 1,
  },
  factGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: SPACING.sm,
    marginTop: SPACING.xs,
  },
  factChip: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xsSm,
    maxWidth: '100%',
  },
  factLabel: {
    ...TYPOGRAPHY.Caption,
    fontSize: 11,
    lineHeight: 14,
  },
  factValue: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 12,
    lineHeight: 16,
  },
  feedbackRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    flexWrap: 'wrap',
    gap: SPACING.sm,
  },
  feedbackBtn: {
    minHeight: 34,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xsSm,
  },
  feedbackText: {
    ...TYPOGRAPHY.CaptionBold,
    fontSize: 12,
  },
  loadingWrap: {
    gap: SPACING.md,
  },
  statusCard: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xl,
  },
  statusIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.xs,
  },
  statusTitle: {
    ...TYPOGRAPHY.BodyLarge,
    fontSize: 19,
    lineHeight: 25,
    textAlign: 'center',
  },
  statusBody: {
    ...TYPOGRAPHY.BodyMid,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 300,
  },
  statusButton: {
    minHeight: 42,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lgXl,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xs,
  },
  statusButtonText: {
    ...TYPOGRAPHY.SmallBold,
    color: '#FFFFFF',
    fontSize: 14,
  },
});
