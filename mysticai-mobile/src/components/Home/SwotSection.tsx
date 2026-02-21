import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/tokens';
import { ErrorStateCard } from '../ui';
import { getSwotItems } from './homeUtils';
import type { SwotPoint } from '../../services/astrology.service';

// Generous height covering headline + subtext + tip (3-5 lines)
const EXPANDED_BODY_HEIGHT = 160;

function formatWeekRange(weekStart?: string, weekEnd?: string): string | null {
  if (!weekStart || !weekEnd) return null;
  const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];
  const s = new Date(weekStart);
  const e = new Date(weekEnd);
  const sd = s.getDate();
  const ed = e.getDate();
  const em = TR_MONTHS[e.getMonth()];
  if (s.getMonth() === e.getMonth()) return `${sd}–${ed} ${em}`;
  return `${sd} ${TR_MONTHS[s.getMonth()]} – ${ed} ${em}`;
}

interface SwotSectionProps {
  weeklySwot: {
    strength?: SwotPoint;
    weakness?: SwotPoint;
    opportunity?: SwotPoint;
    threat?: SwotPoint;
    weekStart?: string;
    weekEnd?: string;
  } | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  onLayout?: (y: number) => void;
}

interface AccordionItemProps {
  item: ReturnType<typeof getSwotItems>[number];
  swotPoint: SwotPoint | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  isDark: boolean;
  entryDelay: number;
}

function AccordionItem({
  item,
  swotPoint,
  isExpanded,
  onToggle,
  isDark,
  entryDelay,
}: AccordionItemProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();

  const bodyHeight = useSharedValue(0);
  const chevronRot = useSharedValue(0);

  useEffect(() => {
    bodyHeight.value = withSpring(isExpanded ? EXPANDED_BODY_HEIGHT : 0, {
      damping: 22,
      stiffness: 200,
      mass: 0.7,
    });
    chevronRot.value = withTiming(isExpanded ? 1 : 0, { duration: 220 });
  }, [isExpanded]);

  const bodyStyle = useAnimatedStyle(() => ({
    height: bodyHeight.value,
    overflow: 'hidden',
  }));

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRot.value * 180}deg` }],
  }));

  // Glass styling based on theme
  const glassBg = isDark
    ? `rgba(26, 20, 60, 0.45)`
    : `rgba(255, 255, 255, 0.6)`;
  const glassBorder = isDark
    ? 'rgba(255, 255, 255, 0.07)'
    : 'rgba(0, 0, 0, 0.06)';
  const separatorColor = isDark
    ? `${item.accent}25`
    : `${item.accent}18`;

  return (
    <Animated.View entering={FadeInDown.delay(entryDelay).duration(500)}>
      <TouchableOpacity
        style={[styles.item, { backgroundColor: glassBg, borderColor: glassBorder }]}
        activeOpacity={0.75}
        onPress={onToggle}
        accessibilityLabel={`${t(item.titleKey)}: ${isExpanded ? t('common.collapse') : t('common.expand')}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isExpanded }}
      >
        {/* ── Closed bar ── */}
        <View style={styles.bar}>
          <View style={styles.barLeft}>
            {/* Icon with glow tint */}
            <View
              style={[
                styles.iconWrapper,
                {
                  backgroundColor: `${item.accent}18`,
                  shadowColor: item.accent,
                  shadowOpacity: isDark ? 0.55 : 0.25,
                  shadowRadius: 8,
                  elevation: 0,
                },
              ]}
            >
              <Text style={styles.icon}>{item.icon}</Text>
            </View>
            <Text style={[styles.barTitle, { color: item.accent }]}>{t(item.titleKey)}</Text>
          </View>
          <Animated.View style={chevronStyle}>
            <Ionicons
              name="chevron-down"
              size={15}
              color={isDark ? 'rgba(255,255,255,0.35)' : 'rgba(0,0,0,0.25)'}
            />
          </Animated.View>
        </View>

        {/* ── Expanded body ── */}
        <Animated.View style={bodyStyle}>
          <View
            style={[
              styles.expandedContent,
              { borderTopColor: separatorColor },
            ]}
          >
            {/* Headline */}
            <Text
              style={[styles.headline, { color: isDark ? '#e8e0ff' : '#1e1b4b' }]}
            >
              {swotPoint?.headline ?? t('home.areaActiveThisWeek')}
            </Text>

            {/* Subtext */}
            {swotPoint?.subtext ? (
              <Text style={[styles.subtext, { color: colors.subtext }]}>
                {swotPoint.subtext}
              </Text>
            ) : null}

            {/* Quick tip */}
            {swotPoint?.quickTip ? (
              <View style={[styles.tipRow, { borderLeftColor: `${item.accent}55` }]}>
                <Text style={[styles.tipText, { color: colors.subtext }]}>
                  {swotPoint.quickTip}
                </Text>
              </View>
            ) : null}
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function SwotSection({
  weeklySwot,
  loading,
  error,
  onRetry,
  expandedId,
  onToggleExpand,
  onLayout,
}: SwotSectionProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const items = getSwotItems(colors, t);
  const dataMap: Record<string, SwotPoint | undefined> = {
    strength: weeklySwot?.strength,
    weakness: weeklySwot?.weakness,
    opportunity: weeklySwot?.opportunity,
    threat: weeklySwot?.threat,
  };
  const weekRange = formatWeekRange(weeklySwot?.weekStart, weeklySwot?.weekEnd);
  const labelColor = isDark ? 'rgba(196,181,253,0.6)' : 'rgba(99,102,241,0.55)';

  return (
    <View
      style={styles.section}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
    >
      {/* Section label + date range */}
      <View style={styles.labelRow}>
        <Text style={[styles.sectionLabel, { color: labelColor }]}>
          {t('home.swotSectionTitle').toUpperCase()}
        </Text>
        {weekRange ? (
          <Text style={[styles.weekRange, { color: labelColor }]}>
            {weekRange}
          </Text>
        ) : null}
      </View>

      {loading ? (
        <View style={styles.statusRow}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={[styles.statusText, { color: colors.subtext }]}>
            {t('home.swotLoading')}
          </Text>
        </View>
      ) : error || !weeklySwot ? (
        <ErrorStateCard
          message={t('home.swotError')}
          onRetry={onRetry}
          variant="compact"
          accessibilityLabel={t('home.swotRetry')}
        />
      ) : (
        <View style={styles.stack}>
          {items.map((item, index) => (
            <AccordionItem
              key={item.id}
              item={item}
              swotPoint={dataMap[item.id]}
              isExpanded={expandedId === item.id}
              onToggle={() => onToggleExpand(expandedId === item.id ? null : item.id)}
              isDark={isDark}
              entryDelay={index * 80}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: SPACING.xl,
    marginHorizontal: SPACING.lgXl,
    marginBottom: SPACING.sm,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.smMd,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
  weekRange: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
  },
  statusText: {
    ...TYPOGRAPHY.Caption,
  },
  stack: {
    gap: SPACING.xsSm,
  },

  // Accordion item
  item: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 6,
    elevation: 1,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.mdLg,
    paddingVertical: SPACING.smMd + 2,
    minHeight: 52,
  },
  barLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.smMd,
    flex: 1,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 0 },
  },
  icon: {
    fontSize: 17,
    lineHeight: 22,
  },
  barTitle: {
    ...TYPOGRAPHY.SmallBold,
    letterSpacing: 0.2,
  },

  // Expanded content
  expandedContent: {
    paddingHorizontal: SPACING.mdLg,
    paddingTop: SPACING.smMd,
    paddingBottom: SPACING.md,
    borderTopWidth: 1,
    gap: SPACING.xsSm,
  },
  headline: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
  },
  subtext: {
    ...TYPOGRAPHY.Caption,
    lineHeight: 18,
  },
  tipRow: {
    borderLeftWidth: 2,
    paddingLeft: SPACING.smMd,
    marginTop: SPACING.xs,
  },
  tipText: {
    ...TYPOGRAPHY.Caption,
    lineHeight: 18,
    fontStyle: 'italic',
  },
});
