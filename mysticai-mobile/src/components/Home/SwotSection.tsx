import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/tokens';
import { ErrorStateCard } from '../ui';
import { getSwotItems } from './homeUtils';
import type { SwotPoint } from '../../services/astrology.service';

interface SwotSectionProps {
  weeklySwot: {
    strength?: SwotPoint;
    weakness?: SwotPoint;
    opportunity?: SwotPoint;
    threat?: SwotPoint;
  } | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  expandedId: string | null;
  onToggleExpand: (id: string | null) => void;
  onLayout?: (y: number) => void;
}

const swotDataMap = (
  swot: SwotSectionProps['weeklySwot']
): Record<string, SwotPoint | undefined> => ({
  strength: swot?.strength,
  weakness: swot?.weakness,
  opportunity: swot?.opportunity,
  threat: swot?.threat,
});

export function SwotSection({
  weeklySwot,
  loading,
  error,
  onRetry,
  expandedId,
  onToggleExpand,
  onLayout,
}: SwotSectionProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const S = makeStyles(colors);
  const items = getSwotItems(colors, t);
  const dataMap = swotDataMap(weeklySwot);

  return (
    <View
      style={S.swotSection}
      onLayout={(e) => onLayout?.(e.nativeEvent.layout.y)}
    >
      <Text style={S.swotSectionTitle}>{t('home.swotSectionTitle')}</Text>

      {loading ? (
        <View style={S.swotLoadingCard}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={S.swotLoadingText}>{t('home.swotLoading')}</Text>
        </View>
      ) : error || !weeklySwot ? (
        <View style={S.swotLoadingCard}>
          <ErrorStateCard
            message={t('home.swotError')}
            onRetry={onRetry}
            variant="compact"
            accessibilityLabel={t('home.swotRetry')}
          />
        </View>
      ) : (
        items.map((item) => {
          const swotPoint = dataMap[item.id];
          const isExpanded = expandedId === item.id;
          return (
            <TouchableOpacity
              key={item.id}
              style={[S.swotCard, { backgroundColor: item.surface, borderColor: `${item.accent}55` }]}
              activeOpacity={0.85}
              onPress={() => onToggleExpand(isExpanded ? null : item.id)}
              accessibilityLabel={`${t(item.titleKey)}: ${isExpanded ? t('common.collapse') : t('common.expand')}`}
              accessibilityRole="button"
              accessibilityHint={isExpanded ? t('accessibility.collapseHint') : t('accessibility.expandHint')}
              accessibilityState={{ expanded: isExpanded }}
            >
              <View style={S.swotCardHeader}>
                <View style={S.swotCardHeadLeft}>
                  <Text style={S.swotCardIcon}>{item.icon}</Text>
                  <Text style={[S.swotCardTitle, { color: item.accent }]}>{t(item.titleKey)}</Text>
                </View>
                <Ionicons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={item.accent}
                />
              </View>

              <Text style={S.swotCardHeadlineDark}>
                {swotPoint?.headline ?? t('home.areaActiveThisWeek')}
              </Text>
              <Text style={S.swotCardSub}>
                {swotPoint?.subtext ?? (isExpanded ? t('home.hideDetails') : t('home.showDetails'))}
              </Text>

              {isExpanded && swotPoint && (
                <View style={S.swotCardBody}>
                  <Text style={S.swotCardTip}>
                    {t('home.tipsLabel')}: {swotPoint.quickTip}
                  </Text>
                </View>
              )}
              <View style={[S.swotCardBar, { backgroundColor: item.accent }]} />
            </TouchableOpacity>
          );
        })
      )}
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    swotSection: { marginTop: SPACING.mdLg, marginHorizontal: SPACING.lgXl, gap: SPACING.smMd },
    swotSectionTitle: { ...TYPOGRAPHY.SmallAlt, fontWeight: '700', color: C.primary },
    swotLoadingCard: {
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: SPACING.mdLg,
      paddingVertical: SPACING.mdLg,
      paddingHorizontal: SPACING.mdLg,
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    swotLoadingText: { ...TYPOGRAPHY.Caption, color: C.subtext },
    swotCard: {
      backgroundColor: C.surface,
      borderWidth: 1.2,
      borderColor: C.border,
      borderRadius: SPACING.mdLg,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.mdLg,
    },
    swotCardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    swotCardHeadLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.smMd,
      flex: 1,
    },
    swotCardIcon: { ...TYPOGRAPHY.H3 },
    swotCardTitle: { ...TYPOGRAPHY.SmallBold, color: C.text },
    swotCardHeadlineDark: {
      marginTop: SPACING.smMd,
      ...TYPOGRAPHY.BodyLarge,
      color: C.text,
    },
    swotCardSub: { marginTop: SPACING.xs, ...TYPOGRAPHY.Caption, color: C.subtext, lineHeight: 18 },
    swotCardBody: {
      marginTop: SPACING.smMd,
      borderTopWidth: 1,
      borderTopColor: C.border,
      paddingTop: SPACING.smMd,
      gap: SPACING.xsSm,
    },
    swotCardTip: { ...TYPOGRAPHY.Caption, color: C.text },
    swotCardBar: { marginTop: SPACING.smMd, height: SPACING.xs, borderRadius: 999 },
  });
}
