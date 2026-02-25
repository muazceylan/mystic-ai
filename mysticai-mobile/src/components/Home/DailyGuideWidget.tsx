import { memo, useMemo, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import {
  Sparkles,
  TrendingUp,
  Briefcase,
  Heart,
  Home,
  Brain,
  Moon,
  Leaf,
  Scissors,
  Gem,
  Wallet,
  ShoppingBag,
  FileText,
  Send,
  MessageCircle,
  Users,
  Truck,
  Hammer,
  BookOpen,
  CircleCheck,
  CircleAlert,
  ChevronDown,
  ChevronUp,
  Settings2,
  RotateCcw,
  X,
  LucideIcon,
} from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { SPACING, TYPOGRAPHY } from '../../constants/tokens';
import { COSMIC_GROUP_ACCENT_COLORS } from '../../constants/CosmicConstants';
import type { DailyLifeGuideActivity, DailyLifeGuideResponse } from '../../services/astrology.service';
import type { CosmicSummaryCard } from '../../services/cosmic.service';
import { useDecisionCompassStore } from '../../store/useDecisionCompassStore';

interface DailyGuideWidgetProps {
  data: DailyLifeGuideResponse | null;
  focusCards?: CosmicSummaryCard[] | null;
  loading: boolean;
  error: boolean;
  onRetry?: () => void;
  onOpenPlanner?: () => void;
}

interface GuideMainCategoryModel {
  groupKey: string;
  groupLabel: string;
  score: number;
  items: DailyLifeGuideActivity[];
}

type ScoreBucket = 'high' | 'mid' | 'low';

const HIGH_THRESHOLD = 75;
const LOW_THRESHOLD = 40;

const ICONS: Record<string, LucideIcon> = {
  scissors: Scissors,
  sparkles: Sparkles,
  gem: Gem,
  'trending-up': TrendingUp,
  'shopping-bag': ShoppingBag,
  wallet: Wallet,
  briefcase: Briefcase,
  'file-signature': FileText,
  send: Send,
  heart: Heart,
  'message-circle': MessageCircle,
  users: Users,
  truck: Truck,
  hammer: Hammer,
  home: Home,
  moon: Moon,
  leaf: Leaf,
  brain: Brain,
  'book-open': BookOpen,
  'circle-check': CircleCheck,
  'circle-alert': CircleAlert,
};

function scoreBucket(score: number): ScoreBucket {
  if (score >= HIGH_THRESHOLD) return 'high';
  if (score <= LOW_THRESHOLD) return 'low';
  return 'mid';
}

function progressColor(score: number) {
  if (score >= 75) return '#16A34A';
  if (score >= 41) return '#D97706';
  return '#FB7185';
}

function statusPillColor(score: number) {
  if (score >= 75) return { bg: '#ECFDF3', fg: '#15803D', border: '#BBF7D0' };
  if (score >= 41) return { bg: '#FFF7ED', fg: '#B45309', border: '#FED7AA' };
  return { bg: '#FEF2F2', fg: '#B91C1C', border: '#FECACA' };
}

function groupAccent(groupKey: string) {
  return COSMIC_GROUP_ACCENT_COLORS[groupKey] ?? '#64748B';
}

function iconForActivity(activity: DailyLifeGuideActivity): LucideIcon {
  return ICONS[activity.icon] ?? ICONS[activity.groupKey] ?? Sparkles;
}

function getSortedBuckets(activities: DailyLifeGuideActivity[]) {
  const highs = activities
    .filter((a) => scoreBucket(a.score) === 'high')
    .sort((a, b) => b.score - a.score);
  const mids = activities
    .filter((a) => scoreBucket(a.score) === 'mid')
    .sort((a, b) => b.score - a.score);
  const lows = activities
    .filter((a) => scoreBucket(a.score) === 'low')
    .sort((a, b) => a.score - b.score);

  return { highs, mids, lows };
}

function pickFocusedCards(highs: DailyLifeGuideActivity[], mids: DailyLifeGuideActivity[], lows: DailyLifeGuideActivity[]) {
  const focused: DailyLifeGuideActivity[] = [];
  const used = new Set<string>();

  for (const item of highs.slice(0, 2)) {
    focused.push(item);
    used.add(item.activityKey);
  }

  if (lows.length > 0) {
    focused.push(lows[0]);
    used.add(lows[0].activityKey);
  }

  const fallbackPool = [...mids, ...highs.slice(2), ...lows.slice(1)];
  for (const item of fallbackPool) {
    if (focused.length >= 3) break;
    if (used.has(item.activityKey)) continue;
    focused.push(item);
    used.add(item.activityKey);
  }

  return focused;
}

function buildMainCategoryModels(activities: DailyLifeGuideActivity[]): GuideMainCategoryModel[] {
  const byGroup = new Map<string, GuideMainCategoryModel>();
  for (const activity of activities) {
    const existing = byGroup.get(activity.groupKey);
    if (existing) {
      existing.items.push(activity);
      continue;
    }
    byGroup.set(activity.groupKey, {
      groupKey: activity.groupKey,
      groupLabel: activity.groupLabel,
      score: 0,
      items: [activity],
    });
  }

  return Array.from(byGroup.values())
    .map((group) => {
      const sortedItems = group.items.slice().sort((a, b) => b.score - a.score);
      const avg = sortedItems.length
        ? Math.round(sortedItems.reduce((sum, item) => sum + item.score, 0) / sortedItems.length)
        : 5;
      return {
        ...group,
        score: avg,
        items: sortedItems,
      };
    })
    .sort((a, b) => b.score - a.score || a.groupLabel.localeCompare(b.groupLabel));
}

function pickFocusedGroups(groups: GuideMainCategoryModel[]): GuideMainCategoryModel[] {
  if (!groups.length) return [];
  const sortedDesc = groups.slice().sort((a, b) => b.score - a.score);
  const sortedAsc = groups.slice().sort((a, b) => a.score - b.score);
  const out: GuideMainCategoryModel[] = [];
  const seen = new Set<string>();

  for (const group of sortedDesc) {
    if (out.length >= 2) break;
    if (seen.has(group.groupKey)) continue;
    seen.add(group.groupKey);
    out.push(group);
  }
  for (const group of sortedAsc) {
    if (seen.has(group.groupKey)) continue;
    seen.add(group.groupKey);
    out.push(group);
    break;
  }
  for (const group of sortedDesc) {
    if (out.length >= 3) break;
    if (seen.has(group.groupKey)) continue;
    seen.add(group.groupKey);
    out.push(group);
  }
  return out.slice(0, 3);
}

export const DailyGuideWidget = memo(function DailyGuideWidget({
  data,
  focusCards,
  loading,
  error,
  onRetry,
  onOpenPlanner,
}: DailyGuideWidgetProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const hiddenActivityKeys = useDecisionCompassStore((s) => s.hiddenActivityKeys);
  const toggleHiddenActivity = useDecisionCompassStore((s) => s.toggleHiddenActivity);
  const resetHiddenActivities = useDecisionCompassStore((s) => s.resetHiddenActivities);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [selected, setSelected] = useState<DailyLifeGuideActivity | null>(null);
  const [expandedGroupKey, setExpandedGroupKey] = useState<string | null>(null);
  const [showAllGroups, setShowAllGroups] = useState(false);

  const visibleActivities = useMemo(
    () => (data?.activities ?? []).filter((a) => !hiddenActivityKeys.includes(a.activityKey)),
    [data?.activities, hiddenActivityKeys],
  );

  const visibleMainCategories = useMemo(
    () => buildMainCategoryModels(visibleActivities),
    [visibleActivities],
  );
  const focusedGroups = useMemo(
    () => pickFocusedGroups(visibleMainCategories),
    [visibleMainCategories],
  );
  const displayedGroups = useMemo(
    () => (showAllGroups ? visibleMainCategories : focusedGroups),
    [showAllGroups, visibleMainCategories, focusedGroups],
  );
  const hiddenGroupCount = Math.max(0, visibleMainCategories.length - focusedGroups.length);

  const S = makeStyles(colors, isDark);

  if (loading && !data) {
    return (
      <Animated.View entering={FadeInDown.delay(160).duration(420)} style={S.wrapper}>
        <View style={S.panel}>
          <View style={S.headerRow}>
            <View>
              <Text style={S.kicker}>{t('home.dailyGuide.kicker')}</Text>
              <Text style={S.title}>{t('home.dailyGuide.title')}</Text>
            </View>
            <ActivityIndicator color={colors.primary} />
          </View>
          <Text style={S.subtitle}>{t('home.dailyGuide.loading')}</Text>
          <View style={S.skeletonCard} />
          <View style={[S.skeletonCard, { opacity: 0.75 }]} />
        </View>
      </Animated.View>
    );
  }

  if (error && !data) {
    return (
      <Animated.View entering={FadeInDown.delay(160).duration(420)} style={S.wrapper}>
        <View style={S.panel}>
          <View style={S.headerRow}>
            <View>
              <Text style={S.kicker}>{t('home.dailyGuide.kicker')}</Text>
              <Text style={S.title}>{t('home.dailyGuide.title')}</Text>
            </View>
          </View>
          <Text style={S.subtitle}>{t('home.dailyGuide.error')}</Text>
          {onRetry ? (
            <Pressable style={S.retryBtn} onPress={onRetry}>
              <Text style={S.retryBtnText}>{t('home.dailyGuide.retry')}</Text>
            </Pressable>
          ) : null}
        </View>
      </Animated.View>
    );
  }

  if (!data || !data.activities.length) return null;
  if (!visibleActivities.length) {
    return (
      <Animated.View entering={FadeInDown.delay(170).duration(420)} style={S.wrapper}>
        <View style={S.panel}>
          <View style={S.headerRow}>
            <View style={S.headerTextWrap}>
              <Text style={S.kicker}>{t('home.dailyGuide.kicker')}</Text>
              <Text style={S.title}>{t('home.dailyGuide.title')}</Text>
              <Text style={S.subtitle}>{t('home.dailyGuide.allHidden')}</Text>
            </View>
            <Pressable style={S.iconBtn} onPress={() => setSettingsOpen(true)}>
              <Settings2 size={16} color="#334155" />
            </Pressable>
          </View>
          <Pressable style={S.retryBtn} onPress={resetHiddenActivities}>
            <Text style={S.retryBtnText}>{t('home.dailyGuide.resetHidden')}</Text>
          </Pressable>
        </View>
        <CompassSettingsModal
          visible={settingsOpen}
          onClose={() => setSettingsOpen(false)}
          activities={data.activities}
          hiddenKeys={hiddenActivityKeys}
          onToggle={toggleHiddenActivity}
          onReset={resetHiddenActivities}
        />
      </Animated.View>
    );
  }

  const overallColor = progressColor(data.overallScore);

  const onPressActivity = async (activity: DailyLifeGuideActivity) => {
    setSelected(activity);
    try {
      if (activity.score >= HIGH_THRESHOLD) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else if (activity.score <= LOW_THRESHOLD) {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      } else {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    } catch {
      // no-op on unsupported devices
    }
  };

  return (
    <>
      <Animated.View entering={FadeInDown.delay(170).duration(420)} style={S.wrapper}>
        <View style={S.panel}>
          <View style={S.headerRow}>
            <View style={S.headerTextWrap}>
              <Text style={S.kicker}>{t('home.dailyGuide.kicker')}</Text>
              <Text style={S.title}>{t('home.dailyGuide.title')}</Text>
              <Text style={S.subtitle} numberOfLines={2}>
                {t('home.dailyGuide.subtitle')}
              </Text>
            </View>
            <View style={S.headerActions}>
              <Pressable style={S.iconBtn} onPress={() => setSettingsOpen(true)}>
                <Settings2 size={16} color="#334155" />
              </Pressable>
              <View style={S.overallBadge}>
                <Text style={S.overallPercent}>{data.overallScore}%</Text>
                <Text style={S.overallLabel}>{t('home.dailyGuide.overall')}</Text>
              </View>
            </View>
          </View>

          <View style={S.progressTrack}>
            <View style={[S.progressFill, { width: `${data.overallScore}%`, backgroundColor: overallColor }]} />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={S.groupChipRow}
          >
            {data.groups
              .slice()
              .sort((a, b) => b.averageScore - a.averageScore)
              .map((g) => (
                <View key={g.groupKey} style={S.groupChip}>
                  <View style={[S.groupDot, { backgroundColor: groupAccent(g.groupKey) }]} />
                  <Text style={S.groupChipText}>{g.groupLabel}</Text>
                  <Text style={S.groupChipScore}>{g.averageScore}%</Text>
                </View>
              ))}
          </ScrollView>

          <View style={S.listWrap}>
            {displayedGroups.map((group) => (
              <GuideMainCategoryCard
                key={group.groupKey}
                group={group}
                expanded={expandedGroupKey === group.groupKey}
                onToggle={() => setExpandedGroupKey((prev) => (prev === group.groupKey ? null : group.groupKey))}
                onPressActivity={onPressActivity}
              />
            ))}
          </View>

          {(hiddenGroupCount > 0 || showAllGroups) ? (
            <View style={S.toggleRow}>
              <Pressable
                style={S.toggleBtn}
                onPress={() => setShowAllGroups((prev) => !prev)}
              >
                <Text style={S.toggleBtnText}>
                  {showAllGroups
                    ? t('home.dailyGuide.showFocusOnly')
                    : t('home.dailyGuide.showAllCount', { count: hiddenGroupCount })}
                </Text>
              </Pressable>
            </View>
          ) : null}

          <View style={S.ctaRow}>
            {onOpenPlanner ? (
              <Pressable
                style={[S.toggleBtn, S.plannerBtn, S.ctaFull]}
                onPress={onOpenPlanner}
              >
                <Text style={[S.toggleBtnText, S.plannerBtnText]}>{t('home.dailyGuide.goPlanner')}</Text>
              </Pressable>
            ) : null}
          </View>

          <Text style={S.footerHint}>{t('home.dailyGuide.footerHint')}</Text>
        </View>
      </Animated.View>

      <GuideDetailModal activity={selected} onClose={() => setSelected(null)} />
      <CompassSettingsModal
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        activities={data.activities}
        hiddenKeys={hiddenActivityKeys}
        onToggle={toggleHiddenActivity}
        onReset={resetHiddenActivities}
      />
    </>
  );
});

interface GuideActivityCardProps {
  activity: DailyLifeGuideActivity;
  onPress: (activity: DailyLifeGuideActivity) => void;
}

interface GuideMainCategoryCardProps {
  group: GuideMainCategoryModel;
  expanded: boolean;
  onToggle: () => void;
  onPressActivity: (activity: DailyLifeGuideActivity) => void;
}

interface CompassSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  activities: DailyLifeGuideActivity[];
  hiddenKeys: string[];
  onToggle: (activityKey: string) => void;
  onReset: () => void;
}

function CompassSettingsModal({
  visible,
  onClose,
  activities,
  hiddenKeys,
  onToggle,
  onReset,
}: CompassSettingsModalProps) {
  const { t } = useTranslation();
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; items: DailyLifeGuideActivity[] }>();
    for (const activity of activities) {
      const group = map.get(activity.groupKey);
      if (group) {
        group.items.push(activity);
      } else {
        map.set(activity.groupKey, { label: activity.groupLabel, items: [activity] });
      }
    }
    return Array.from(map.entries()).map(([groupKey, value]) => ({
      groupKey,
      groupLabel: value.label,
      items: value.items.slice().sort((a, b) => b.score - a.score),
    }));
  }, [activities]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={settingsStyles.backdropRoot}>
        <Pressable style={settingsStyles.backdrop} onPress={onClose} />
        <View style={settingsStyles.sheet}>
          <View style={settingsStyles.header}>
            <View style={settingsStyles.headerTextWrap}>
              <Text style={settingsStyles.kicker}>{t('home.dailyGuide.settingsTitle')}</Text>
              <Text style={settingsStyles.subtitle}>{t('home.dailyGuide.settingsSubtitle')}</Text>
            </View>
            <Pressable onPress={onClose} style={settingsStyles.closeBtn}>
              <X size={16} color="#334155" />
            </Pressable>
          </View>

          <ScrollView style={settingsStyles.scroll} contentContainerStyle={settingsStyles.scrollContent}>
            {grouped.map((group) => (
              <View key={group.groupKey} style={settingsStyles.groupCard}>
                <View style={settingsStyles.groupHeader}>
                  <View style={[settingsStyles.groupDot, { backgroundColor: groupAccent(group.groupKey) }]} />
                  <Text style={settingsStyles.groupTitle}>{group.groupLabel}</Text>
                </View>
                {group.items.map((activity) => {
                  const hidden = hiddenKeys.includes(activity.activityKey);
                  return (
                    <View key={activity.activityKey} style={settingsStyles.row}>
                      <View style={settingsStyles.rowTextWrap}>
                        <Text style={settingsStyles.rowTitle}>{activity.activityLabel}</Text>
                        <Text style={settingsStyles.rowMeta}>{activity.score}%</Text>
                      </View>
                      <Switch
                        value={!hidden}
                        onValueChange={() => onToggle(activity.activityKey)}
                        trackColor={{ false: '#CBD5E1', true: '#C7D2FE' }}
                        thumbColor={!hidden ? '#4F46E5' : '#94A3B8'}
                      />
                    </View>
                  );
                })}
              </View>
            ))}
          </ScrollView>

          <Pressable style={settingsStyles.resetBtn} onPress={onReset}>
            <RotateCcw size={15} color="#334155" />
            <Text style={settingsStyles.resetText}>{t('home.dailyGuide.resetHidden')}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function GuideMainCategoryCard({ group, expanded, onToggle, onPressActivity }: GuideMainCategoryCardProps) {
  const { t } = useTranslation();
  const topActivity = group.items[0];
  if (!topActivity) return null;

  const Icon = iconForActivity(topActivity);
  const color = progressColor(group.score);
  const pill = statusPillColor(group.score);
  const accent = groupAccent(group.groupKey);
  const { colors } = useTheme();
  const S = useMemo(() => makeCardStyles(colors), [colors]);

  return (
    <View style={S.card}>
      <Pressable onPress={onToggle} style={S.groupHeaderPressable}>
        <View style={S.rowTop}>
          <View style={[S.iconWrap, { backgroundColor: `${accent}14`, borderColor: `${accent}22` }]}>
            <Icon size={18} color={accent} strokeWidth={2.2} />
          </View>
          <View style={S.titleWrap}>
            <Text style={S.activityLabel} numberOfLines={1}>{group.groupLabel}</Text>
            <Text style={S.groupLabel} numberOfLines={1}>
              {t('home.dailyGuide.subcategoryCount', { count: group.items.length })} • {expanded ? t('home.dailyGuide.expanded') : t('home.dailyGuide.tapForDetails')}
            </Text>
          </View>
          <View style={S.groupHeaderRight}>
            <View style={[S.statusPill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
              <Text style={[S.statusPillText, { color: pill.fg }]}>{group.score}%</Text>
            </View>
            {expanded ? <ChevronUp size={15} color="#64748B" /> : <ChevronDown size={15} color="#64748B" />}
          </View>
        </View>

        <Text style={S.shortAdvice} numberOfLines={expanded ? 3 : 2}>
          {topActivity.shortAdvice}
        </Text>

        <View style={S.barTrack}>
          <View style={[S.barFill, { width: `${group.score}%`, backgroundColor: color }]} />
        </View>
      </Pressable>

      {expanded ? (
        <View style={S.subListWrap}>
          {group.items.map((activity) => {
            const itemColor = progressColor(activity.score);
            return (
              <Pressable key={activity.activityKey} onPress={() => onPressActivity(activity)} style={S.subRowPressable}>
                <View style={S.subRowTop}>
                  <View style={S.subRowLeft}>
                    <View style={[S.subRowDot, { backgroundColor: itemColor }]} />
                    <Text style={S.subRowTitle} numberOfLines={1}>{activity.activityLabel}</Text>
                  </View>
                  <Text style={S.subRowScore}>%{activity.score}</Text>
                </View>
                <Text style={S.subRowAdvice} numberOfLines={2}>{activity.shortAdvice}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function GuideActivityCard({ activity, onPress }: GuideActivityCardProps) {
  const Icon = iconForActivity(activity);
  const color = progressColor(activity.score);
  const pill = statusPillColor(activity.score);
  const accent = groupAccent(activity.groupKey);
  const { colors } = useTheme();
  const S = useMemo(() => makeCardStyles(colors), [colors]);

  return (
    <Pressable onPress={() => onPress(activity)} style={S.cardPressable}>
      <View style={S.card}>
        <View style={S.rowTop}>
          <View style={[S.iconWrap, { backgroundColor: `${accent}14`, borderColor: `${accent}22` }]}>
            <Icon size={18} color={accent} strokeWidth={2.2} />
          </View>
          <View style={S.titleWrap}>
            <Text style={S.activityLabel} numberOfLines={1}>{activity.activityLabel}</Text>
            <Text style={S.groupLabel} numberOfLines={1}>{activity.groupLabel}</Text>
          </View>
          <View style={[S.statusPill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
            <Text style={[S.statusPillText, { color: pill.fg }]}>{activity.score}%</Text>
          </View>
        </View>

        <Text style={S.shortAdvice} numberOfLines={2}>{activity.shortAdvice}</Text>

        <View style={S.barTrack}>
          <View style={[S.barFill, { width: `${activity.score}%`, backgroundColor: color }]} />
        </View>
      </View>
    </Pressable>
  );
}

interface GuideDetailModalProps {
  activity: DailyLifeGuideActivity | null;
  onClose: () => void;
}

function GuideDetailModal({ activity, onClose }: GuideDetailModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const S = makeModalStyles(isDark);
  if (!activity) return null;

  const Icon = iconForActivity(activity);
  const pill = statusPillColor(activity.score);
  const barColor = progressColor(activity.score);
  const accent = groupAccent(activity.groupKey);

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={S.backdropRoot}>
        <Pressable style={S.backdrop} onPress={onClose} />
        <View style={S.sheet}>
          <View style={S.handle} />
          <View style={S.sheetHeader}>
            <View style={S.sheetTitleWrap}>
              <Text style={S.sheetKicker}>{t('home.dailyGuide.analysisTitle')}</Text>
              <Text style={S.sheetTitle}>{activity.activityLabel}</Text>
            </View>
            <Pressable onPress={onClose} style={S.closeBtn}>
              <X size={18} color="#334155" />
            </Pressable>
          </View>

          <View style={S.heroCard}>
            <View style={S.heroRow}>
              <View style={[S.heroIconWrap, { backgroundColor: `${accent}14`, borderColor: `${accent}22` }]}>
                <Icon size={20} color={accent} />
              </View>
              <View style={S.heroTextWrap}>
                <Text style={S.heroStatus}>{activity.statusLabel}</Text>
                <Text style={S.heroSubtitle}>{activity.groupLabel}</Text>
              </View>
              <View style={[S.modalPill, { backgroundColor: pill.bg, borderColor: pill.border }]}>
                <Text style={[S.modalPillText, { color: pill.fg }]}>{activity.score}%</Text>
              </View>
            </View>
            <View style={S.modalBarTrack}>
              <View style={[S.modalBarFill, { width: `${activity.score}%`, backgroundColor: barColor }]} />
            </View>
          </View>

          <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
            <SectionCard
              title={t('home.dailyGuide.whyToday')}
              body={activity.shortAdvice}
              icon={<CircleCheck size={16} color="#16A34A" />}
            />
            <SectionCard
              title={t('home.dailyGuide.astroInfo')}
              body={activity.technicalExplanation}
              icon={<Sparkles size={16} color="#6366F1" />}
            />
            <SectionCard
              title={t('home.dailyGuide.practicalInsight')}
              body={activity.insight}
              icon={<CircleAlert size={16} color="#D97706" />}
            />

            {activity.triggerNotes?.length ? (
              <View style={S.notesCard}>
                <Text style={S.notesTitle}>{t('home.dailyGuide.triggers')}</Text>
                {activity.triggerNotes.map((note, idx) => (
                  <View key={`${activity.activityKey}-${idx}`} style={S.noteRow}>
                    <View style={S.noteDot} />
                    <Text style={S.noteText}>{note}</Text>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

function SectionCard({ title, body, icon }: { title: string; body: string; icon: ReactNode }) {
  const S = sectionStyles;
  return (
    <View style={S.card}>
      <View style={S.titleRow}>
        {icon}
        <Text style={S.title}>{title}</Text>
      </View>
      <Text style={S.body}>{body}</Text>
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean) {
  return StyleSheet.create({
    wrapper: {
      marginTop: SPACING.md,
      marginHorizontal: SPACING.lgXl,
    },
    panel: {
      backgroundColor: '#FFFFFF',
      borderWidth: 1,
      borderColor: '#F8FAFC',
      borderRadius: 16,
      padding: SPACING.mdLg,
      shadowColor: '#0F172A',
      shadowOpacity: isDark ? 0.18 : 0.06,
      shadowOffset: { width: 0, height: 8 },
      shadowRadius: 20,
      elevation: 3,
    },
    headerRow: {
      flexDirection: 'row',
      gap: SPACING.smMd,
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    headerActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    headerTextWrap: {
      flex: 1,
      gap: 4,
      paddingRight: SPACING.sm,
    },
    kicker: {
      ...TYPOGRAPHY.CaptionXS,
      color: '#64748B',
      letterSpacing: 1.1,
      fontWeight: '700',
      textTransform: 'uppercase',
    },
    title: {
      ...TYPOGRAPHY.SmallBold,
      color: '#0F172A',
      fontSize: 18,
      lineHeight: 24,
    },
    subtitle: {
      ...TYPOGRAPHY.Caption,
      color: '#475569',
      lineHeight: 18,
    },
    overallBadge: {
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 14,
      paddingHorizontal: 10,
      paddingVertical: 8,
      minWidth: 76,
      alignItems: 'center',
    },
    overallPercent: {
      fontSize: 18,
      fontWeight: '800',
      color: '#0F172A',
      lineHeight: 20,
    },
    overallLabel: {
      fontSize: 10,
      color: '#64748B',
      fontWeight: '600',
      marginTop: 2,
    },
    iconBtn: {
      width: 32,
      height: 32,
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#F8FAFC',
    },
    progressTrack: {
      height: 4,
      borderRadius: 999,
      backgroundColor: '#E2E8F0',
      overflow: 'hidden',
      marginTop: SPACING.smMd,
    },
    progressFill: {
      height: '100%',
      borderRadius: 999,
    },
    groupChipRow: {
      gap: 8,
      paddingTop: SPACING.smMd,
      paddingBottom: SPACING.xsSm,
    },
    groupChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },
    groupDot: {
      width: 7,
      height: 7,
      borderRadius: 4,
    },
    groupChipText: {
      fontSize: 11,
      color: '#334155',
      fontWeight: '600',
    },
    groupChipScore: {
      fontSize: 11,
      color: '#0F172A',
      fontWeight: '800',
    },
    listWrap: {
      gap: 10,
      marginTop: SPACING.smMd,
    },
    toggleRow: {
      marginTop: SPACING.smMd,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
    },
    toggleBtn: {
      borderWidth: 1,
      borderColor: '#E2E8F0',
      backgroundColor: '#F8FAFC',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    ctaRow: {
      marginTop: SPACING.smMd,
      flexDirection: 'row',
      gap: 8,
      alignItems: 'center',
    },
    ctaHalf: {
      flex: 1,
    },
    plannerBtn: {
      backgroundColor: '#EEF2FF',
      borderColor: '#C7D2FE',
    },
    plannerBtnText: {
      color: '#4338CA',
    },
    toggleBtnText: {
      color: '#334155',
      fontWeight: '700',
      fontSize: 13,
    },
    footerHint: {
      marginTop: SPACING.smMd,
      color: '#64748B',
      fontSize: 11,
      lineHeight: 16,
    },
    retryBtn: {
      marginTop: SPACING.smMd,
      alignSelf: 'flex-start',
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 10,
      backgroundColor: C.primary,
    },
    retryBtnText: {
      color: '#fff',
      fontWeight: '700',
      fontSize: 13,
    },
    skeletonCard: {
      height: 94,
      borderRadius: 14,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#EEF2F7',
      marginTop: SPACING.smMd,
    },
  });
}

function makeCardStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    card: {
      backgroundColor: '#FFFFFF',
      borderColor: '#F8FAFC',
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      gap: 10,
    },
    cardPressable: {
      borderRadius: 14,
    },
    groupHeaderPressable: {
      gap: 10,
    },
    rowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 10,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleWrap: {
      flex: 1,
      gap: 1,
    },
    activityLabel: {
      fontSize: 14,
      fontWeight: '800',
      color: '#0F172A',
    },
    groupLabel: {
      fontSize: 11,
      fontWeight: '500',
      color: '#64748B',
    },
    statusPill: {
      borderRadius: 999,
      borderWidth: 1,
      paddingHorizontal: 8,
      paddingVertical: 4,
      minWidth: 54,
      alignItems: 'center',
    },
    statusPillText: {
      fontSize: 11,
      fontWeight: '800',
    },
    groupHeaderRight: {
      alignItems: 'center',
      gap: 6,
    },
    shortAdvice: {
      fontSize: 12,
      lineHeight: 17,
      color: '#334155',
    },
    barTrack: {
      height: 3,
      borderRadius: 999,
      backgroundColor: '#E2E8F0',
      overflow: 'hidden',
    },
    barFill: {
      height: '100%',
      borderRadius: 999,
    },
    subListWrap: {
      borderTopWidth: 1,
      borderTopColor: '#EEF2F7',
      paddingTop: 10,
      gap: 8,
    },
    subRowPressable: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#EEF2F7',
      backgroundColor: '#F8FAFC',
      paddingHorizontal: 10,
      paddingVertical: 8,
      gap: 4,
    },
    subRowTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    subRowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flex: 1,
    },
    subRowDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    subRowTitle: {
      color: '#0F172A',
      fontSize: 12,
      fontWeight: '700',
      flex: 1,
    },
    subRowScore: {
      color: '#0F172A',
      fontSize: 11,
      fontWeight: '800',
    },
    subRowAdvice: {
      color: '#475569',
      fontSize: 11,
      lineHeight: 15,
    },
  });
}

function makeModalStyles(isDark: boolean) {
  return StyleSheet.create({
    backdropRoot: {
      flex: 1,
      justifyContent: 'flex-end',
    },
    backdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: 'rgba(15,23,42,0.38)',
    },
    sheet: {
      backgroundColor: '#FFFFFF',
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      paddingHorizontal: SPACING.mdLg,
      paddingTop: 10,
      paddingBottom: SPACING.lg,
      maxHeight: '82%',
      borderWidth: 1,
      borderColor: '#EEF2F7',
      shadowColor: '#0F172A',
      shadowOpacity: isDark ? 0.24 : 0.08,
      shadowOffset: { width: 0, height: -8 },
      shadowRadius: 20,
      elevation: 10,
    },
    handle: {
      width: 44,
      height: 4,
      borderRadius: 999,
      backgroundColor: '#CBD5E1',
      alignSelf: 'center',
      marginBottom: 10,
    },
    sheetHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    sheetTitleWrap: {
      flex: 1,
      gap: 2,
    },
    sheetKicker: {
      fontSize: 11,
      fontWeight: '700',
      color: '#6366F1',
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    sheetTitle: {
      fontSize: 20,
      lineHeight: 26,
      fontWeight: '800',
      color: '#0F172A',
    },
    closeBtn: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#E2E8F0',
    },
    heroCard: {
      marginTop: SPACING.smMd,
      borderRadius: 16,
      backgroundColor: '#F8FAFC',
      borderWidth: 1,
      borderColor: '#EEF2F7',
      padding: 12,
      gap: 10,
    },
    heroRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    heroIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroTextWrap: {
      flex: 1,
      gap: 1,
    },
    heroStatus: {
      color: '#0F172A',
      fontWeight: '800',
      fontSize: 13,
    },
    heroSubtitle: {
      color: '#64748B',
      fontWeight: '500',
      fontSize: 11,
    },
    modalPill: {
      borderWidth: 1,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    modalPillText: {
      fontWeight: '800',
      fontSize: 12,
    },
    modalBarTrack: {
      height: 4,
      borderRadius: 999,
      backgroundColor: '#E2E8F0',
      overflow: 'hidden',
    },
    modalBarFill: {
      height: '100%',
      borderRadius: 999,
    },
    scroll: {
      marginTop: SPACING.smMd,
    },
    scrollContent: {
      gap: 10,
      paddingBottom: 8,
    },
    notesCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: '#EEF2F7',
      backgroundColor: '#FFFFFF',
      padding: 12,
      gap: 8,
    },
    notesTitle: {
      color: '#0F172A',
      fontSize: 13,
      fontWeight: '800',
    },
    noteRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
    },
    noteDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: '#94A3B8',
      marginTop: 6,
    },
    noteText: {
      flex: 1,
      color: '#475569',
      fontSize: 12,
      lineHeight: 17,
    },
  });
}

const sectionStyles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#FFFFFF',
    padding: 12,
    gap: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 13,
  },
  body: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
  },
});

const settingsStyles = StyleSheet.create({
  backdropRoot: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SPACING.lgXl,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,23,42,0.28)',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: SPACING.mdLg,
    maxHeight: '82%',
    shadowColor: '#0F172A',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 10 },
    shadowRadius: 24,
    elevation: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 8,
  },
  headerTextWrap: {
    flex: 1,
    gap: 2,
  },
  kicker: {
    ...TYPOGRAPHY.CaptionBold,
    color: '#334155',
  },
  subtitle: {
    ...TYPOGRAPHY.Caption,
    color: '#64748B',
  },
  closeBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    marginTop: SPACING.smMd,
  },
  scrollContent: {
    gap: 10,
  },
  groupCard: {
    borderWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    gap: 8,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  groupDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  groupTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    paddingVertical: 4,
  },
  rowTextWrap: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
  },
  rowMeta: {
    fontSize: 11,
    color: '#64748B',
  },
  resetBtn: {
    marginTop: SPACING.smMd,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  resetText: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 12,
  },
});
