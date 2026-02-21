import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/tokens';
import type { TransitDigest } from './homeUtils';

interface TransitCardProps {
  transitDigest: TransitDigest;
  dailyVibeText: string;
  expanded: boolean;
  onToggleExpand: () => void;
}

export function TransitCard({ transitDigest, dailyVibeText, expanded, onToggleExpand }: TransitCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const S = makeStyles(colors);

  return (
    <View style={S.transitSection}>
      <Text style={S.transitSectionTitle}>{t('home.transitTitle')}</Text>
      <View style={S.transitCard}>
        <View style={S.transitHeadlineRow}>
          <View
            style={[
              S.transitDot,
              {
                backgroundColor:
                  transitDigest.energyType === 'lucky'
                    ? colors.success
                    : transitDigest.energyType === 'caution'
                      ? colors.red
                      : colors.warning,
              },
            ]}
          />
          <Text style={S.transitHeadline}>{transitDigest.title}</Text>
        </View>

        <View
          style={[
            S.energyBand,
            {
              backgroundColor:
                transitDigest.energyType === 'lucky'
                  ? colors.luckBg
                  : transitDigest.energyType === 'caution'
                    ? colors.cautionBg
                    : colors.neutralBg,
            },
          ]}
        >
          <Text style={S.energyBandIcon}>
            {transitDigest.energyType === 'lucky' ? '🟢' : transitDigest.energyType === 'caution' ? '🔴' : '🟡'}
          </Text>
          <Text
            style={[
              S.energyBandText,
              {
                color:
                  transitDigest.energyType === 'lucky'
                    ? colors.success
                    : transitDigest.energyType === 'caution'
                      ? colors.cautionTextDark
                      : colors.warning,
              },
            ]}
          >
            {transitDigest.energyLabel}
          </Text>
        </View>

        {expanded ? (
          <>
            <Text style={S.transitDailyLabel}>{t('home.transitDailyEnergy')}</Text>
            <Text style={S.transitDailyText}>{dailyVibeText}</Text>
            {transitDigest.actionItems.length > 0 && (
              <View style={S.transitDetailBox}>
                <Text style={S.transitBoxLabel}>⚡ {t('home.transitActionItems')}</Text>
                {transitDigest.actionItems.map((line) => (
                  <View key={line} style={S.transitPointRow}>
                    <Text style={S.transitPointMark}>›</Text>
                    <Text style={S.transitPointText}>{line}</Text>
                  </View>
                ))}
              </View>
            )}
            {transitDigest.cautionItems.length > 0 && (
              <View style={[S.transitDetailBox, S.transitCautionBox]}>
                <Text style={[S.transitBoxLabel, { color: colors.cautionText }]}>
                  ⚠️ {t('home.transitCautionItems')}
                </Text>
                {transitDigest.cautionItems.map((line) => (
                  <View key={line} style={S.transitPointRow}>
                    <Text style={[S.transitPointMark, { color: colors.cautionText }]}>›</Text>
                    <Text style={[S.transitPointText, { color: colors.cautionTextDark }]}>{line}</Text>
                  </View>
                ))}
              </View>
            )}
            <TouchableOpacity
              onPress={onToggleExpand}
              style={S.detailCta}
              accessibilityLabel={t('home.hideDetails')}
              accessibilityRole="button"
              accessibilityHint={t('accessibility.collapseHint')}
              accessibilityState={{ expanded: true }}
            >
              <Text style={S.detailCtaText} maxFontSizeMultiplier={2}>
                {t('home.hideDetails')}
              </Text>
              <Ionicons name="chevron-up" size={16} color={colors.primary} />
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity
            onPress={onToggleExpand}
            style={S.detailCta}
            accessibilityLabel={t('home.showDetails')}
            accessibilityRole="button"
            accessibilityHint={t('accessibility.expandHint')}
            accessibilityState={{ expanded: false }}
          >
            <Text style={S.detailCtaText} maxFontSizeMultiplier={2}>
              {t('home.showDetails')}
            </Text>
            <Ionicons name="chevron-down" size={16} color={colors.primary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    transitSection: { marginHorizontal: SPACING.lgXl, marginTop: SPACING.sm },
    transitSectionTitle: { ...TYPOGRAPHY.BodyBold, color: C.subtext, marginBottom: SPACING.sm },
    transitCard: {
      backgroundColor: C.primarySoftBg,
      borderRadius: 18,
      paddingHorizontal: SPACING.mdLg,
      paddingVertical: SPACING.mdLg,
      borderWidth: 1.5,
      borderColor: C.primary,
      shadowColor: C.primary,
      shadowOpacity: 0.12,
      shadowOffset: { width: 0, height: SPACING.sm },
      shadowRadius: SPACING.md,
      elevation: 2,
    },
    transitHeadlineRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.smMd },
    transitDot: { width: 14, height: 14, borderRadius: 7, marginRight: SPACING.smMd, marginTop: SPACING.xs },
    transitHeadline: { flex: 1, ...TYPOGRAPHY.BodyLarge, color: C.success },
    energyBand: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      borderRadius: 10,
      paddingHorizontal: SPACING.smMd,
      paddingVertical: SPACING.sm,
      marginBottom: SPACING.md,
    },
    energyBandIcon: { ...TYPOGRAPHY.Small },
    energyBandText: { flex: 1, ...TYPOGRAPHY.SmallAlt },
    transitDailyLabel: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.primary,
      marginBottom: SPACING.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    transitDailyText: { ...TYPOGRAPHY.Small, color: C.text, marginBottom: SPACING.smMd },
    transitDetailBox: {
      backgroundColor: C.primarySoftBg,
      borderRadius: SPACING.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.smMd,
      borderWidth: 1,
      borderColor: C.primary,
      gap: SPACING.xsSm,
      marginBottom: SPACING.sm,
    },
    transitCautionBox: { backgroundColor: C.cautionBg, borderColor: C.error },
    transitBoxLabel: { ...TYPOGRAPHY.CaptionBold, color: C.primary700, marginBottom: SPACING.xs },
    transitPointRow: { flexDirection: 'row', alignItems: 'flex-start' },
    transitPointMark: {
      marginRight: SPACING.xsSm,
      ...TYPOGRAPHY.BodyMid,
      color: C.primary700,
      fontWeight: '700',
    },
    transitPointText: { flex: 1, ...TYPOGRAPHY.SmallAlt, lineHeight: 20, color: C.text },
    detailCta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.xsSm,
      marginTop: SPACING.md,
      paddingVertical: SPACING.sm,
      minHeight: 44,
    },
    detailCtaText: { ...TYPOGRAPHY.SmallBold, color: C.primary },
  });
}
