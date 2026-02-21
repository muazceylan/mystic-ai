import { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeInDown,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING } from '../../constants/tokens';
import { ErrorStateCard } from '../ui';
import { SUMMARY_MAX_CHARS } from './homeConstants';

const SERIF = Platform.select({ ios: 'Georgia', android: 'serif', default: 'Georgia' });

interface WisdomCardProps {
  secretText: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  /** When true, fades the content in after loading */
  loaded?: boolean;
}

export function WisdomCard({
  secretText,
  loading,
  error,
  onRetry,
  expanded,
  onToggleExpand,
  loaded,
}: WisdomCardProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();

  const opacity = useSharedValue(loaded === undefined ? 1 : 0);
  const fadeStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  useEffect(() => {
    if (loaded || loaded === undefined) {
      opacity.value = withTiming(1, { duration: 550 });
    }
  }, [loaded]);

  const displayText =
    expanded || secretText.length <= SUMMARY_MAX_CHARS
      ? secretText
      : `${secretText.slice(0, SUMMARY_MAX_CHARS).trim()}...`;

  const accentLine = isDark
    ? { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.75, shadowRadius: 10 }
    : { backgroundColor: colors.primary, shadowColor: colors.primary, shadowOpacity: 0.4, shadowRadius: 8 };

  return (
    <Animated.View entering={FadeInDown.delay(440).duration(600)} style={styles.outerWrapper}>
      {/* ── SECTION LABEL ── */}
      <Text style={[styles.sectionLabel, { color: isDark ? 'rgba(196,181,253,0.6)' : 'rgba(99,102,241,0.55)' }]}>
        {t('home.dailySecret').toUpperCase()}
      </Text>

      <View style={styles.wrapper}>
        {/* Violet left accent line */}
        <View style={[styles.accentLine, accentLine]} />

        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingRow}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={[styles.loadingText, { color: colors.subtext }]}>
                {t('home.secretLoading')}
              </Text>
            </View>
          ) : error ? (
            <ErrorStateCard
              message={t('home.secretError')}
              onRetry={onRetry}
              accessibilityLabel="Günün sırrını tekrar yükle"
            />
          ) : (
            <Animated.View style={fadeStyle} accessibilityLiveRegion="polite">
              {/* Serif editorial headline */}
              <Text
                style={[styles.headline, { color: colors.text }]}
                maxFontSizeMultiplier={1.6}
              >
                {displayText}
              </Text>

              {/* Italic subtitle */}
              <Text style={[styles.subtitle, { color: colors.subtext }]}>
                {t('home.personalMessage').startsWith('—')
                  ? t('home.personalMessage')
                  : `— ${t('home.personalMessage')}`}
              </Text>

              {/* Expand / Collapse link */}
              {secretText.length > SUMMARY_MAX_CHARS && (
                <TouchableOpacity
                  onPress={onToggleExpand}
                  style={styles.expandRow}
                  accessibilityLabel={expanded ? t('home.hideDetails') : t('home.showDetails')}
                  accessibilityRole="button"
                  accessibilityState={{ expanded }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={[styles.expandText, { color: colors.primary }]}>
                    {expanded ? t('home.hideDetails') : t('home.showDetails')}
                  </Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={13}
                    color={colors.primary}
                  />
                </TouchableOpacity>
              )}
            </Animated.View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    marginHorizontal: SPACING.lgXl,
    marginTop: SPACING.xl,
    marginBottom: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: SPACING.smMd,
  },
  wrapper: {
    flexDirection: 'row',
    gap: SPACING.mdLg,
  },
  accentLine: {
    width: 4,
    borderRadius: 4,
    elevation: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  content: {
    flex: 1,
  },
  headline: {
    fontFamily: SERIF,
    fontSize: 20,
    fontStyle: 'italic',
    lineHeight: 30,
    fontWeight: '400',
    marginBottom: SPACING.smMd,
  },
  subtitle: {
    fontFamily: SERIF,
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    opacity: 0.75,
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
    marginTop: SPACING.smMd,
  },
  expandText: {
    ...TYPOGRAPHY.CaptionSmall,
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
  },
  loadingText: {
    ...TYPOGRAPHY.Caption,
    fontStyle: 'italic',
  },
});
