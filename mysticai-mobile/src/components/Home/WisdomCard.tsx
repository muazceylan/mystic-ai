import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/tokens';
import { ErrorStateCard } from '../ui';
import { SUMMARY_MAX_CHARS } from './homeConstants';

interface WisdomCardProps {
  secretText: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  fadeAnim: Animated.Value;
}

export function WisdomCard({
  secretText,
  loading,
  error,
  onRetry,
  expanded,
  onToggleExpand,
  fadeAnim,
}: WisdomCardProps) {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const S = makeStyles(colors);

  return (
    <View style={S.wisdomCard}>
      <View style={S.wisdomHeader}>
        <Ionicons name="eye" size={16} color={colors.primary} />
        <Text style={S.wisdomTitle}>{t('home.dailySecret')}</Text>
        <View style={S.wisdomBadge}>
          <Text style={S.wisdomBadgeText}>{t('home.personalMessage')}</Text>
        </View>
      </View>

      {loading ? (
        <View style={S.wisdomLoading}>
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={S.wisdomLoadingText}>{t('home.secretLoading')}</Text>
        </View>
      ) : error ? (
        <ErrorStateCard
          message={t('home.secretError')}
          onRetry={onRetry}
          accessibilityLabel="Günün sırrını tekrar yükle"
        />
      ) : (
        <Animated.View
          style={{ opacity: fadeAnim }}
          accessibilityLiveRegion="polite"
          accessibilityLabel={t('home.dailySecret')}
        >
          <Text style={S.wisdomText} maxFontSizeMultiplier={2}>
            {expanded || secretText.length <= SUMMARY_MAX_CHARS
              ? secretText
              : `${secretText.slice(0, SUMMARY_MAX_CHARS).trim()}...`}
          </Text>
          {secretText.length > SUMMARY_MAX_CHARS && (
            <TouchableOpacity
              onPress={onToggleExpand}
              style={S.detailCta}
              accessibilityLabel={expanded ? t('home.hideDetails') : t('home.showDetails')}
              accessibilityRole="button"
              accessibilityHint={expanded ? t('accessibility.collapseHint') : t('accessibility.expandHint')}
              accessibilityState={{ expanded }}
            >
              <Text style={S.detailCtaText} maxFontSizeMultiplier={2}>
                {expanded ? t('home.hideDetails') : t('home.showDetails')}
              </Text>
              <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    wisdomCard: {
      marginHorizontal: SPACING.lgXl,
      marginTop: SPACING.smMd,
      backgroundColor: C.neutralBg,
      borderRadius: 18,
      padding: SPACING.lg,
      borderWidth: 1.5,
      borderColor: C.warning,
    },
    wisdomHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xsSm, marginBottom: SPACING.smMd },
    wisdomBadge: {
      marginLeft: 'auto',
      paddingHorizontal: SPACING.sm,
      paddingVertical: SPACING.xs,
      borderRadius: 999,
      backgroundColor: C.primarySoftBg,
      borderWidth: 1,
      borderColor: C.primary,
    },
    wisdomBadgeText: { ...TYPOGRAPHY.CaptionXS, fontWeight: '700', color: C.primary },
    wisdomTitle: { ...TYPOGRAPHY.SmallAlt, fontWeight: '700', color: C.primary },
    wisdomLoading: { alignItems: 'center', paddingVertical: SPACING.lg, gap: SPACING.sm },
    wisdomLoadingText: { ...TYPOGRAPHY.Caption, color: C.subtext },
    wisdomText: { ...TYPOGRAPHY.Lead, color: C.text },
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
