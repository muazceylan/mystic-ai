import React, { useEffect, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';
import { SafeScreen } from '../../../components/ui/SafeScreen';
import { useHoroscopeStore } from '../store/useHoroscopeStore';
import { ZODIAC_MAP, resolveZodiacSign } from '../utils/zodiacData';
import { ZodiacSign, HoroscopePeriod } from '../types/horoscope.types';
import { SegmentedControl } from '../components/SegmentedControl';
import { HoroscopeDetailSkeleton } from '../components/HoroscopeSkeleton';
import {
  ActionUnlockSheet,
  FEATURE_ACTION_KEYS,
  FEATURE_MODULE_KEYS,
  useModuleMonetization,
} from '../../monetization';

export default function HoroscopeDetailScreen() {
  const { sign: signParam, period: periodParam } = useLocalSearchParams<{ sign: string; period?: string }>();
  const sign = resolveZodiacSign(signParam ?? 'aries') ?? 'aries';

  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const S = makeStyles(colors, isDark);
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase();
  const monetization = useModuleMonetization(FEATURE_MODULE_KEYS.HOROSCOPE);
  const horoscopeUnlockState = monetization.getActionUnlockState(FEATURE_ACTION_KEYS.HOROSCOPE_VIEW);
  const [isUnlocked, setIsUnlocked] = React.useState(false);
  const [showUnlockSheet, setShowUnlockSheet] = React.useState(false);

  const {
    current,
    loading,
    error,
    period,
    favorites,
    setPeriod,
    fetch: fetchHoroscope,
    toggleFavorite,
  } = useHoroscopeStore();

  useEffect(() => {
    if (periodParam === 'weekly') setPeriod('weekly');
  }, []);

  const signData = ZODIAC_MAP.get(sign);
  const signName = signData ? (lang.startsWith('en') ? signData.nameEn : signData.nameTr) : sign;

  useEffect(() => {
    if (!horoscopeUnlockState.usesMonetization) {
      setIsUnlocked(true);
      setShowUnlockSheet(false);
      return;
    }
    setIsUnlocked(false);
    setShowUnlockSheet(true);
  }, [horoscopeUnlockState.usesMonetization, sign]);

  useEffect(() => {
    if (!isUnlocked) return;
    fetchHoroscope(sign, period);
  }, [fetchHoroscope, isUnlocked, period, sign]);

  const handleRetry = useCallback(() => {
    fetchHoroscope(sign, period);
  }, [sign, period, fetchHoroscope]);

  const handlePeriodChange = useCallback((p: HoroscopePeriod) => {
    setPeriod(p);
  }, [setPeriod]);

  const favKey = `${sign}:${period}:${current?.date ?? ''}`;
  const isFav = favorites.includes(favKey);

  const horoscopeText = current?.sections?.general ?? '';

  const handleShare = useCallback(async () => {
    if (!current) return;
    const text = `${signData?.emoji} ${signName}\n${current.date}\n\n${horoscopeText}\n\n— Astro Guru`;
    try {
      await Sharing.shareAsync('data:text/plain;base64,' + btoa(unescape(encodeURIComponent(text))), {
        mimeType: 'text/plain',
        dialogTitle: signName,
      });
    } catch {
      // user cancelled
    }
  }, [current, signName, signData, horoscopeText]);

  return (
    <SafeScreen>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} style={S.backBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={S.emoji}>{signData?.emoji}</Text>
        <View style={{ flex: 1 }}>
          <Text style={S.headerTitle}>{signName}</Text>
          <Text style={S.headerDate}>{current?.date ?? ''}</Text>
        </View>
        <Pressable onPress={() => toggleFavorite(favKey)} style={S.actionBtn}>
          <Ionicons name={isFav ? 'heart' : 'heart-outline'} size={20} color={isFav ? colors.red : colors.subtext} />
        </Pressable>
        <Pressable onPress={handleShare} style={S.actionBtn}>
          <Ionicons name="share-outline" size={20} color={colors.subtext} />
        </Pressable>
      </View>

      {/* Period toggle */}
      <View style={S.periodRow}>
        <SegmentedControl
          value={period}
          onChange={handlePeriodChange}
          labels={[t('horoscope.today'), t('horoscope.thisWeek')]}
        />
      </View>

      {!isUnlocked && (
        <View style={S.errorBox}>
          <Text style={S.errorText}>{t('horoscope.subtitle', 'Burç yorumunu görmek için kilidi aç')}</Text>
        </View>
      )}

      {loading && isUnlocked && (
        <ScrollView contentContainerStyle={S.content}>
          <HoroscopeDetailSkeleton />
        </ScrollView>
      )}

      {error && !loading && isUnlocked && (
        <View style={S.errorBox}>
          <Text style={S.errorText}>{t('horoscope.error')}</Text>
          <Pressable onPress={handleRetry} style={S.retryBtn}>
            <Text style={S.retryText}>{t('horoscope.retry')}</Text>
          </Pressable>
        </View>
      )}

      {current && isUnlocked && !loading && !error && (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={S.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Horoscope text */}
          <View style={S.card}>
            <View style={S.cardHeader}>
              <Ionicons name="sunny-outline" size={20} color={colors.horoscopeAccent} />
              <Text style={S.cardTitle}>
                {period === 'daily' ? t('horoscope.today') : t('horoscope.thisWeek')}
              </Text>
            </View>
            <Text style={S.bodyText}>{horoscopeText}</Text>
          </View>

          {/* Source badge */}
          {current.sources && current.sources.length > 0 && (
            <View style={S.sourceInfo}>
              <Ionicons name="globe-outline" size={13} color={colors.subtext} />
              <Text style={S.sourceInfoText}>
                Kaynak: {current.sources.map((s) => s.name).join(', ')}
              </Text>
            </View>
          )}

          <View style={{ height: 100 }} />
        </ScrollView>
      )}

      <ActionUnlockSheet
        visible={showUnlockSheet}
        moduleKey={FEATURE_MODULE_KEYS.HOROSCOPE}
        actionKey={FEATURE_ACTION_KEYS.HOROSCOPE_VIEW}
        title={signName}
        onClose={() => {
          setShowUnlockSheet(false);
          router.back();
        }}
        onUnlocked={async () => {
          setIsUnlocked(true);
          await fetchHoroscope(sign, period);
        }}
      />
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
    },
    emoji: {
      fontSize: 28,
    },
    headerTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
    },
    headerDate: {
      ...TYPOGRAPHY.CaptionSmall,
      color: C.subtext,
    },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)',
    },
    periodRow: {
      paddingHorizontal: SPACING.lg,
      paddingBottom: SPACING.md,
    },
    content: {
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
    },
    errorBox: {
      alignItems: 'center',
      paddingVertical: SPACING.xxl,
    },
    errorText: {
      ...TYPOGRAPHY.Body,
      color: C.error,
      marginBottom: SPACING.md,
    },
    retryBtn: {
      backgroundColor: C.horoscopeAccent,
      borderRadius: RADIUS.sm,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.sm,
    },
    retryText: {
      ...TYPOGRAPHY.SmallBold,
      color: '#FFFFFF',
    },

    /* Main content */
    scrollContent: {
      paddingHorizontal: SPACING.lg,
    },
    card: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : C.surface,
      borderRadius: RADIUS.lg,
      padding: SPACING.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : C.border,
      gap: SPACING.md,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    cardTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
    },
    bodyText: {
      ...TYPOGRAPHY.Body,
      color: C.body,
      lineHeight: 26,
    },

    /* Source info */
    sourceInfo: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: SPACING.sm,
      paddingHorizontal: SPACING.xs,
    },
    sourceInfoText: {
      ...TYPOGRAPHY.CaptionSmall,
      color: C.subtext,
    },
  });
}
