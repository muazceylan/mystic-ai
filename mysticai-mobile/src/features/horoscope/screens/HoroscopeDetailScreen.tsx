import React, { useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import * as Sharing from 'expo-sharing';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';
import { SafeScreen } from '../../../components/ui/SafeScreen';
import { useHoroscopeStore } from '../store/useHoroscopeStore';
import { ZODIAC_MAP } from '../utils/zodiacData';
import { ZodiacSign, HoroscopePeriod } from '../types/horoscope.types';
import { SegmentedControl } from '../components/SegmentedControl';
import { HighlightChips } from '../components/HighlightChips';
import { CategoryCard } from '../components/CategoryCard';
import { AdviceBox } from '../components/AdviceBox';
import { LuckRow } from '../components/LuckRow';
import { HoroscopeDetailSkeleton } from '../components/HoroscopeSkeleton';

export default function HoroscopeDetailScreen() {
  const { sign: signParam } = useLocalSearchParams<{ sign: string }>();
  const sign = (signParam ?? 'aries') as ZodiacSign;

  const { t, i18n } = useTranslation();
  const { colors, isDark } = useTheme();
  const router = useRouter();
  const S = makeStyles(colors, isDark);
  const lang = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase();

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

  const signData = ZODIAC_MAP.get(sign);
  const signName = signData ? (lang.startsWith('en') ? signData.nameEn : signData.nameTr) : sign;

  useEffect(() => {
    fetchHoroscope(sign, period);
  }, [sign, period]);

  const handleRetry = useCallback(() => {
    fetchHoroscope(sign, period);
  }, [sign, period, fetchHoroscope]);

  const handlePeriodChange = useCallback((p: HoroscopePeriod) => {
    setPeriod(p);
  }, [setPeriod]);

  const favKey = `${sign}:${period}:${current?.date ?? ''}`;
  const isFav = favorites.includes(favKey);

  const handleShare = useCallback(async () => {
    if (!current) return;
    const text = `${signData?.emoji} ${signName}\n${current.date}\n\n${current.sections.general}\n\n— Mystic AI`;
    try {
      await Sharing.shareAsync('data:text/plain;base64,' + btoa(unescape(encodeURIComponent(text))), {
        mimeType: 'text/plain',
        dialogTitle: signName,
      });
    } catch {
      // user cancelled
    }
  }, [current, signName, signData]);

  return (
    <SafeScreen>
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
      >
        <SegmentedControl
          value={period}
          onChange={handlePeriodChange}
          labels={[t('horoscope.today'), t('horoscope.thisWeek')]}
        />

        {loading && <HoroscopeDetailSkeleton />}

        {error && !loading && (
          <View style={S.errorBox}>
            <Text style={S.errorText}>{t('horoscope.error')}</Text>
            <Pressable onPress={handleRetry} style={S.retryBtn}>
              <Text style={S.retryText}>{t('horoscope.retry')}</Text>
            </Pressable>
          </View>
        )}

        {current && !loading && !error && (
          <View style={S.body}>
            {current.highlights?.length > 0 && (
              <View style={S.section}>
                <Text style={S.sectionTitle}>{t('horoscope.highlights')}</Text>
                <HighlightChips highlights={current.highlights} />
              </View>
            )}

            <View style={S.section}>
              <Text style={S.sectionTitle}>{t('horoscope.general')}</Text>
              <Text style={S.bodyText}>{current.sections.general}</Text>
            </View>

            <View style={S.section}>
              <CategoryCard icon="heart" title={t('horoscope.love')} content={current.sections.love} color={colors.pink} />
            </View>
            <View style={S.section}>
              <CategoryCard icon="briefcase" title={t('horoscope.career')} content={current.sections.career} color={colors.blue} />
            </View>
            <View style={S.section}>
              <CategoryCard icon="cash" title={t('horoscope.money')} content={current.sections.money} color={colors.green} />
            </View>
            <View style={S.section}>
              <CategoryCard icon="fitness" title={t('horoscope.health')} content={current.sections.health} color={colors.orange} />
            </View>

            {current.sections.advice && (
              <View style={S.section}>
                <Text style={S.sectionTitle}>{t('horoscope.advice')}</Text>
                <AdviceBox text={current.sections.advice} />
              </View>
            )}

            {current.meta && (
              <View style={S.section}>
                <LuckRow
                  luckyColor={current.meta.lucky_color}
                  luckyNumber={current.meta.lucky_number}
                  compatibility={current.meta.compatibility}
                  mood={current.meta.mood}
                />
              </View>
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
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
    body: {
      marginTop: SPACING.lg,
    },
    section: {
      marginBottom: SPACING.md,
    },
    sectionTitle: {
      ...TYPOGRAPHY.SmallBold,
      color: C.subtext,
      marginBottom: SPACING.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    bodyText: {
      ...TYPOGRAPHY.Body,
      color: C.body,
      lineHeight: 24,
    },
  });
}
