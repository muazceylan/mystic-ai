import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { BottomSheet } from '../ui/BottomSheet';
import { statusColors } from './palette';
import { statusLabel, type DecisionCategoryModel } from './model';
import { useTranslation } from 'react-i18next';
import { getCompassTokens } from './tokens';
import { StatusPill } from './StatusPill';
import { SoftActionButton } from './SoftActionButton';

interface CategoryDetailBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  category: DecisionCategoryModel | null;
  dateLabel: string;
  onOpenCalendar: () => void;
  onOpenFullDetail: (category: DecisionCategoryModel) => void;
}

function trimText(input: string | undefined, maxLen = 82) {
  const text = (input ?? '').trim();
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return `${text.slice(0, Math.max(0, maxLen - 1)).trimEnd()}…`;
}

export function CategoryDetailBottomSheet({
  visible,
  onClose,
  category,
  dateLabel,
  onOpenCalendar,
  onOpenFullDetail,
}: CategoryDetailBottomSheetProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = styles(colors, isDark, T);
  const tint = category ? statusColors(category.status, isDark) : null;

  const doItems = useMemo(() => {
    if (!category) return [] as string[];
    const derived = category.items
      .slice(0, 3)
      .map((item) => trimText(item.shortAdvice, 64))
      .filter(Boolean);
    if (derived.length) return derived;
    return [t('decisionCompassScreen.doItemFallback1'), t('decisionCompassScreen.doItemFallback2')];
  }, [category]);

  if (!category) {
    return null;
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} title={category.title}>
      <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent} showsVerticalScrollIndicator={false}>
        <LinearGradient colors={T.hero.gradient as [string, string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.hero}>
          <View style={S.heroTop}>
            <View style={S.iconWrap}>
              <Ionicons name={category.icon} size={18} color={colors.primary} />
            </View>
            <View style={S.heroTitleWrap}>
              <Text style={S.heroTitle} numberOfLines={1}>{category.title}</Text>
              <Text style={S.heroSub} numberOfLines={1}>{dateLabel}</Text>
            </View>
            <View style={[S.scoreChip, tint ? { backgroundColor: tint.bg } : null]}>
              <Text style={[S.scoreText, tint ? { color: tint.text } : null]}>{Math.round(category.score)}%</Text>
            </View>
          </View>
          <StatusPill label={statusLabel(category.status, t)} textColor={tint?.text ?? colors.primary} gradient={tint?.pill ?? ['#EEE7FF', '#E6DBFF']} />
          <Text style={S.summary}>
            {trimText(category.shortSummary, 148) || t('decisionCompassScreen.categorySummaryFallback')}
          </Text>
        </LinearGradient>

        <View style={S.section}>
          <Text style={S.sectionTitle}>{t('decisionCompassScreen.subAreasTitle')}</Text>
          <View style={S.subList}>
            {category.items.slice(0, 6).map((item, index) => {
              const subScore = Math.round(item.score);
              const subTone = statusColors(
                subScore >= 70
                  ? 'STRONG'
                  : subScore >= 55
                    ? 'SUPPORTIVE'
                    : subScore >= 40
                      ? 'BALANCED'
                      : subScore >= 25
                        ? 'CAUTION'
                        : 'HOLD',
                isDark,
              );

              return (
                <View key={`${item.activityKey}-${index}`} style={S.subRow}>
                  <Text style={S.subLabel} numberOfLines={1}>{item.activityLabel}</Text>
                  <View style={[S.subScoreChip, { backgroundColor: subTone.bg }]}>
                    <Text style={[S.subScoreText, { color: subTone.text }]}>{subScore}%</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        <View style={S.section}>
          <Text style={S.sectionTitle}>{t('decisionCompassScreen.recommendedActionsTitle')}</Text>
          <View style={S.actionList}>
            {doItems.map((item, index) => (
              <View key={`do-${index}`} style={S.actionRow}>
                <Ionicons name="checkmark-circle-outline" size={15} color={colors.primary} />
                <Text style={S.actionText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={S.ctaRow}>
          <Pressable onPress={onOpenCalendar} style={({ pressed }) => [S.secondaryBtn, pressed && S.pressed]}>
            <Ionicons name="calendar-outline" size={16} color={colors.subtext} />
            <Text style={S.secondaryBtnText}>{t('decisionCompassScreen.goToCalendarBtn')}</Text>
          </Pressable>
          <SoftActionButton
            label={t('decisionCompassScreen.moreDetailBtn')}
            onPress={() => onOpenFullDetail(category)}
            gradient={T.chip.selectedGradient as [string, string]}
            borderColor={T.border.soft}
            textColor={colors.primary}
            iconColor={colors.primary}
            style={S.primaryCta}
          />
        </View>
      </ScrollView>
    </BottomSheet>
  );
}

function styles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean, T: ReturnType<typeof getCompassTokens>) {
  return StyleSheet.create({
    scroll: {
      maxHeight: 540,
    },
    scrollContent: {
      paddingBottom: 6,
      gap: 12,
    },
    hero: {
      borderRadius: 20,
      padding: 13,
      gap: 8,
      backgroundColor: T.surface.glass,
      borderWidth: 1,
      borderColor: T.border.soft,
    },
    heroTop: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconWrap: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(180,148,255,0.14)' : 'rgba(122,91,234,0.10)',
      borderWidth: 1,
      borderColor: T.border.soft,
    },
    heroTitleWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    heroTitle: {
      color: C.text,
      fontSize: 16,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    heroSub: {
      color: C.subtext,
      fontSize: 11.5,
      fontWeight: '600',
    },
    scoreChip: {
      minHeight: 28,
      borderRadius: 14,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
    },
    scoreText: {
      fontSize: 13,
      fontWeight: '800',
    },
    summary: {
      color: C.text,
      opacity: isDark ? 0.90 : 0.82,
      fontSize: 13,
      lineHeight: 19,
      fontWeight: '600',
    },
    section: {
      borderRadius: 16,
      padding: 12,
      gap: 9,
      borderWidth: 1,
      borderColor: T.border.soft,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.82)',
    },
    sectionTitle: {
      color: C.text,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: -0.1,
    },
    subList: {
      gap: 8,
    },
    subRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    subLabel: {
      flex: 1,
      color: C.text,
      fontSize: 12.5,
      fontWeight: '600',
    },
    subScoreChip: {
      minWidth: 48,
      minHeight: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 8,
    },
    subScoreText: {
      fontSize: 11.5,
      fontWeight: '800',
    },
    actionList: {
      gap: 8,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 7,
    },
    actionText: {
      flex: 1,
      color: C.text,
      fontSize: 12.5,
      lineHeight: 18,
      fontWeight: '600',
    },
    ctaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    secondaryBtn: {
      flex: 1,
      minHeight: 42,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: T.border.soft,
      backgroundColor: T.surface.glass,
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'row',
      gap: 6,
    },
    secondaryBtnText: {
      color: C.subtext,
      fontSize: 13,
      fontWeight: '700',
    },
    primaryCta: {
      flex: 1.3,
      alignSelf: 'stretch',
    },
    pressed: {
      opacity: 0.84,
    },
  });
}
