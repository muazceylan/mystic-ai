import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { Pressable, Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SafeScreen, SurfaceHeaderIconButton, TabHeader } from '../../components/ui';
import { useTabHeaderActions } from '../../hooks/useTabHeaderActions';
import { useCustomSetStore } from '../store/useCustomSetStore';
import { useContentStore } from '../store/useContentStore';
import { useJournalStore } from '../store/useJournalStore';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOW, ACCESSIBILITY } from '../../constants/tokens';
import { useAuthStore } from '../../store/useAuthStore';
import {
  SPIRITUAL_PRACTICE_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_IDS,
  TUTORIAL_SCREEN_KEYS,
  useTutorial,
  useTutorialTrigger,
} from '../../features/tutorial';
import type { CustomSetItem } from '../types';

/* ─── Navigation items (labels/subs resolved via t() in component) ─── */
const MAIN_FEATURES: ReadonlyArray<{
  key: string;
  route: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  labelKey: string;
  subKey: string;
  accentKey: keyof ThemeColors;
  bgKey: keyof ThemeColors;
}> = [
  {
    key: 'dua',
    route: '/spiritual/dua',
    icon: 'book-outline',
    labelKey: 'spiritual.home.features.duaLabel',
    subKey: 'spiritual.home.features.duaSub',
    accentKey: 'spiritualDua',
    bgKey: 'spiritualDuaLight',
  },
  {
    key: 'esma',
    route: '/spiritual/asma',
    icon: 'sparkles-outline',
    labelKey: 'spiritual.home.features.esmaLabel',
    subKey: 'spiritual.home.features.esmaSub',
    accentKey: 'spiritualEsma',
    bgKey: 'spiritualEsmaLight',
  },
  {
    key: 'sure',
    route: '/spiritual/sure',
    icon: 'library-outline',
    labelKey: 'spiritual.home.features.sureLabel',
    subKey: 'spiritual.home.features.sureSub',
    accentKey: 'gold',
    bgKey: 'goldLight',
  },
  {
    key: 'breath',
    route: '/spiritual/breathing',
    icon: 'leaf-outline',
    labelKey: 'spiritual.home.features.breathLabel',
    subKey: 'spiritual.home.features.breathSub',
    accentKey: 'spiritualMeditation',
    bgKey: 'violetBg',
  },
];

const QUICK_ACTIONS: ReadonlyArray<{
  key: string;
  route: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  labelKey: string;
  subKey: string;
  accent: string;
}> = [
  {
    key: 'bag',
    route: '/spiritual/custom-sets',
    icon: 'bag-outline',
    labelKey: 'spiritual.home.quick.bagLabel',
    subKey: 'spiritual.home.quick.bagSub',
    accent: '#F59E0B',
  },
  {
    key: 'routine',
    route: '/spiritual/routine-picker',
    icon: 'layers-outline',
    labelKey: 'spiritual.home.quick.routineLabel',
    subKey: 'spiritual.home.quick.routineSub',
    accent: '#7C3AED',
  },
  {
    key: 'journal',
    route: '/spiritual/journal',
    icon: 'journal-outline',
    labelKey: 'spiritual.home.quick.journalLabel',
    subKey: 'spiritual.home.quick.journalSub',
    accent: '#6366F1',
  },
];

export default function SpiritualHomeScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const s = createStyles(colors, isDark);
  const userId = useAuthStore((state) => state.user?.id);
  const { reopenTutorialById } = useTutorial();
  const { triggerInitial: triggerInitialTutorials } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.SPIRITUAL_PRACTICE);
  const tutorialBootstrapRef = useRef<string | null>(null);

  const activeRoutineSetId = useCustomSetStore((s) => s.activeRoutineSetId);
  const sets = useCustomSetStore((s) => s.sets);
  const journalEntries = useJournalStore((state) => state.entries);
  const getEsmaById = useContentStore((state) => state.getEsmaById);
  const getDuaById = useContentStore((state) => state.getDuaById);
  const activeSet = useMemo(
    () => (activeRoutineSetId ? sets.find((s) => s.id === activeRoutineSetId) : undefined),
    [activeRoutineSetId, sets],
  );
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayEntries = useMemo(
    () => journalEntries.filter((entry) => entry.dateISO === todayISO),
    [journalEntries, todayISO],
  );

  useEffect(() => {
    const scope = userId ? String(userId) : 'guest';
    if (tutorialBootstrapRef.current === scope) {
      return;
    }

    tutorialBootstrapRef.current = scope;
    void triggerInitialTutorials();
  }, [triggerInitialTutorials, userId]);

  const handlePressTutorialHelp = useCallback(() => {
    void reopenTutorialById(TUTORIAL_IDS.SPIRITUAL_PRACTICE_FOUNDATION, 'spiritual_home');
  }, [reopenTutorialById]);

  const resolveItemTarget = useCallback(
    (item: CustomSetItem) => {
      if (item.itemType === 'esma') {
        return item.targetCount ?? getEsmaById(item.itemId)?.defaultTargetCount ?? 33;
      }

      return item.targetCount ?? getDuaById(item.itemId)?.defaultTargetCount ?? 3;
    },
    [getDuaById, getEsmaById],
  );

  const resolveItemName = useCallback(
    (item: CustomSetItem) => {
      if (item.itemType === 'esma') {
        return getEsmaById(item.itemId)?.nameTr ?? '';
      }

      return getDuaById(item.itemId)?.title ?? '';
    },
    [getDuaById, getEsmaById],
  );

  const getCompletedCount = useCallback(
    (item: CustomSetItem) =>
      todayEntries
        .filter(
          (entry) =>
            entry.itemType === (item.itemType === 'sure' ? 'dua' : item.itemType) &&
            entry.itemId === item.itemId,
        )
        .reduce((sum, entry) => sum + entry.completed, 0),
    [todayEntries],
  );

  const handlePressRoutineStart = useCallback(() => {
    if (!activeSet) {
      router.push('/spiritual/routine-picker' as any);
      return;
    }

    if (activeSet.items.length === 0) {
      router.push({
        pathname: '/spiritual/custom-sets/[id]',
        params: { id: activeSet.id },
      } as any);
      return;
    }

    const nextItemIndex = activeSet.items.findIndex((item) => resolveItemTarget(item) > getCompletedCount(item));

    if (nextItemIndex < 0) {
      router.push({
        pathname: '/spiritual/custom-sets/[id]',
        params: { id: activeSet.id },
      } as any);
      return;
    }

    const nextItem = activeSet.items[nextItemIndex];
    const target = resolveItemTarget(nextItem);
    const completed = getCompletedCount(nextItem);
    const remaining = Math.max(0, target - completed);

    if (remaining <= 0) {
      router.push({
        pathname: '/spiritual/custom-sets/[id]',
        params: { id: activeSet.id },
      } as any);
      return;
    }

    router.push({
      pathname: '/spiritual/counter',
      params: {
        itemType: nextItem.itemType === 'sure' ? 'dua' : nextItem.itemType,
        itemId: nextItem.itemId.toString(),
        itemName: resolveItemName(nextItem),
        target: remaining.toString(),
        setItems: JSON.stringify(activeSet.items),
        setIndex: nextItemIndex.toString(),
      },
    } as any);
  }, [activeSet, getCompletedCount, resolveItemName, resolveItemTarget]);

  return (
    <SafeScreen scroll>
      <TabHeader
        title={t('spiritual.home.title')}
        rightActions={(
          <SpotlightTarget targetKey={SPIRITUAL_PRACTICE_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
            <SurfaceHeaderIconButton
              iconName="help-circle-outline"
              onPress={handlePressTutorialHelp}
              accessibilityLabel={t('spiritual.home.helpA11y')}
            />
          </SpotlightTarget>
        )}
        {...useTabHeaderActions()}
      />

      {/* ─── Hızlı Erişim ─── */}
      <SpotlightTarget targetKey={SPIRITUAL_PRACTICE_TUTORIAL_TARGET_KEYS.PRACTICE_COUNTER}>
        <View style={s.quickGrid}>
          {QUICK_ACTIONS.map((q) => (
            <Pressable
              key={q.key}
              style={({ pressed }) => [
                s.quickCard,
                pressed && { opacity: 0.8 },
              ]}
              onPress={() => router.push(q.route as any)}
              accessibilityLabel={t(q.labelKey)}
            >
              <View style={[s.quickIcon, { backgroundColor: q.accent + '18' }]}>
                <Ionicons name={q.icon} size={18} color={q.accent} />
              </View>
              <Text
                style={s.quickLabel}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {t(q.labelKey)}
              </Text>
              <Text
                style={s.quickSub}
                numberOfLines={1}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {t(q.subKey)}
              </Text>
            </Pressable>
          ))}
        </View>
      </SpotlightTarget>

      {/* ─── Rutini Başlat ─── */}
      <SpotlightTarget targetKey={SPIRITUAL_PRACTICE_TUTORIAL_TARGET_KEYS.DAILY_RECOMMENDATION}>
        <Pressable
          style={({ pressed }) => [
            s.routineBtn,
            pressed && { opacity: 0.9, transform: [{ scale: 0.98 }] },
          ]}
          onPress={handlePressRoutineStart}
          accessibilityLabel={t('spiritual.home.routineStart')}
        >
          <LinearGradient
            colors={isDark
              ? ['#4F46E5', '#7C3AED']
              : ['#6366F1', '#8B5CF6']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.routineGradient}
          >
            <View style={s.routineInner}>
              <View style={s.routineIconWrap}>
                <Ionicons name="play" size={18} color="#FFF" />
              </View>
              <View style={s.routineTextWrap}>
                <Text
                  style={s.routineTitle}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                >
                  {t('spiritual.home.routineStart')}
                </Text>
                <Text
                  style={s.routineSub}
                  maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                >
                  {activeSet
                    ? t('spiritual.home.routineActiveSet', { name: activeSet.name, count: activeSet.items.length })
                    : t('spiritual.home.routineNoSet')}
                </Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="rgba(255,255,255,0.7)" />
            </View>
          </LinearGradient>
        </Pressable>
      </SpotlightTarget>

      {/* ─── Keşfet ─── */}
      <View style={s.sectionHeader}>
        <View style={s.sectionTitleRow}>
          <View style={s.sectionDot} />
          <Text
            style={s.sectionTitle}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {t('spiritual.home.explore')}
          </Text>
        </View>
      </View>

      <SpotlightTarget targetKey={SPIRITUAL_PRACTICE_TUTORIAL_TARGET_KEYS.JOURNAL_ENTRY}>
        <View style={s.featureGrid}>
          {MAIN_FEATURES.map((f) => {
            const accent = colors[f.accentKey];
            const bg = colors[f.bgKey];
            return (
              <Pressable
                key={f.key}
                style={({ pressed }) => [
                  s.featureCard,
                  pressed && { opacity: 0.85, transform: [{ scale: 0.97 }] },
                ]}
                onPress={() => router.push(f.route as any)}
                accessibilityLabel={t(f.labelKey)}
              >
                <LinearGradient
                  pointerEvents="none"
                  colors={[accent + (isDark ? '14' : '0A'), 'transparent']}
                  style={s.featureGlow}
                />
                <View style={[s.featureIcon, { backgroundColor: bg + (isDark ? '' : '30') }]}>
                  <Ionicons name={f.icon} size={20} color={accent} />
                </View>
                <View style={s.featureBody}>
                  <Text
                    style={s.featureLabel}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {t(f.labelKey)}
                  </Text>
                  <Text
                    style={s.featureSub}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {t(f.subKey)}
                  </Text>
                </View>
                <View style={[s.featureArrow, { backgroundColor: accent + '14' }]}>
                  <Ionicons name="chevron-forward" size={16} color={accent} />
                </View>
              </Pressable>
            );
          })}
        </View>
      </SpotlightTarget>

      {/* bottom spacer */}
      <View style={{ height: SPACING.xl }} />
    </SafeScreen>
  );
}

/* ─── Styles ─── */
function createStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    /* Section headers */
    sectionHeader: {
      marginTop: SPACING.lgXl,
      marginBottom: SPACING.md,
      paddingHorizontal: SPACING.xs,
    },
    sectionTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    sectionDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: isDark ? '#818CF8' : '#6366F1',
    },
    sectionTitle: {
      ...TYPOGRAPHY.BodyLarge,
      color: C.text,
      letterSpacing: -0.3,
    },

    /* Feature cards */
    featureGrid: {
      gap: SPACING.smMd,
    },
    featureCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
      padding: SPACING.mdLg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.14)' : C.border,
      backgroundColor: isDark ? 'rgba(30,41,59,0.65)' : C.surface,
      overflow: 'hidden',
      ...SHADOW.sm,
    },
    featureGlow: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 50,
    },
    featureIcon: {
      width: 42,
      height: 42,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    featureBody: {
      flex: 1,
      gap: 2,
    },
    featureLabel: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    featureSub: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
    },
    featureArrow: {
      width: 30,
      height: 30,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* Routine button */
    routineBtn: {
      marginTop: SPACING.mdLg,
      borderRadius: RADIUS.lg,
      overflow: 'hidden',
      ...SHADOW.md,
    },
    routineGradient: {
      borderRadius: RADIUS.lg,
    },
    routineInner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: SPACING.lg,
      gap: SPACING.md,
    },
    routineIconWrap: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: 'rgba(255,255,255,0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    routineTextWrap: {
      flex: 1,
      gap: 2,
    },
    routineTitle: {
      ...TYPOGRAPHY.BodyBold,
      color: '#FFFFFF',
    },
    routineSub: {
      ...TYPOGRAPHY.Caption,
      color: 'rgba(255,255,255,0.72)',
    },

    /* Quick actions */
    quickGrid: {
      flexDirection: 'row',
      gap: SPACING.smMd,
    },
    quickCard: {
      flex: 1,
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.lg,
      paddingHorizontal: SPACING.sm,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.12)' : C.border,
      backgroundColor: isDark ? 'rgba(30,41,59,0.55)' : C.surface,
    },
    quickIcon: {
      width: 36,
      height: 36,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    quickLabel: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
      textAlign: 'center',
    },
    quickSub: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.subtext,
      textAlign: 'center',
    },
  });
}
