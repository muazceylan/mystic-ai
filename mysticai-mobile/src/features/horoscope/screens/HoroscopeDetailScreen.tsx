import React, { useEffect, useCallback, useState } from 'react';
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
import { ZODIAC_MAP } from '../utils/zodiacData';
import { ZodiacSign, HoroscopePeriod } from '../types/horoscope.types';
import { SegmentedControl } from '../components/SegmentedControl';
import { HoroscopeDetailSkeleton } from '../components/HoroscopeSkeleton';

export default function HoroscopeDetailScreen() {
  const { sign: signParam, period: periodParam } = useLocalSearchParams<{ sign: string; period?: string }>();
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

  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    if (periodParam === 'weekly') setPeriod('weekly');
  }, []);

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

  const horoscopeText = current?.sections?.general ?? '';

  const handleShare = useCallback(async () => {
    if (!current) return;
    const text = `${signData?.emoji} ${signName}\n${current.date}\n\n${horoscopeText}\n\n— Mystic AI`;
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

      {loading && (
        <ScrollView contentContainerStyle={S.content}>
          <HoroscopeDetailSkeleton />
        </ScrollView>
      )}

      {error && !loading && (
        <View style={S.errorBox}>
          <Text style={S.errorText}>{t('horoscope.error')}</Text>
          <Pressable onPress={handleRetry} style={S.retryBtn}>
            <Text style={S.retryText}>{t('horoscope.retry')}</Text>
          </Pressable>
        </View>
      )}

      {current && !loading && !error && (
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

          {/* Raw API Sources (dev/test) */}
          <View style={S.sourcesSection}>
            <Pressable
              style={S.sourcesToggle}
              onPress={() => setShowSources((v) => !v)}
            >
              <Ionicons name="code-slash-outline" size={16} color={colors.subtext} />
              <Text style={S.sourcesToggleText}>
                API Kaynakları{current.sources?.length ? ` (${current.sources.length})` : ''}
              </Text>
              <Ionicons
                name={showSources ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={colors.subtext}
              />
            </Pressable>

            {showSources && (!current.sources || current.sources.length === 0) && (
              <View style={[S.sourceCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)' }]}>
                <Text style={S.sourceText}>
                  Kaynak verisi yok. Backend deploy edildikten sonra ham API cevapları burada görünecek.
                </Text>
              </View>
            )}

            {showSources && current.sources?.map((src, idx) => {
              const labelColor =
                src.name === 'freehoroscopeapi' ? '#3B82F6' :
                src.name === 'ohmanda' ? '#10B981' : '#8B5CF6';
              return (
                <View
                  key={src.name + idx}
                  style={[S.sourceCard, { borderColor: labelColor + (isDark ? '30' : '25') }]}
                >
                  <View style={S.sourceHeader}>
                    <View style={[S.sourceBadge, { backgroundColor: labelColor + '20' }]}>
                      <Text style={[S.sourceBadgeText, { color: labelColor }]}>
                        {src.name}
                      </Text>
                    </View>
                  </View>
                  <Text style={S.sourceText} selectable>{src.text}</Text>
                </View>
              );
            })}
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>
      )}
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

    /* Raw Sources */
    sourcesSection: {
      marginTop: SPACING.lg,
      gap: SPACING.sm,
    },
    sourcesToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: SPACING.sm,
      paddingHorizontal: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
      alignSelf: 'flex-start',
    },
    sourcesToggleText: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.subtext,
    },
    sourceCard: {
      borderRadius: RADIUS.md,
      borderWidth: 1,
      padding: SPACING.md,
      backgroundColor: isDark ? 'rgba(255,255,255,0.03)' : C.surface,
      gap: SPACING.sm,
    },
    sourceHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    sourceBadge: {
      paddingHorizontal: 10,
      paddingVertical: 3,
      borderRadius: RADIUS.full,
    },
    sourceBadgeText: {
      fontSize: 11,
      fontWeight: '700',
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    sourceText: {
      ...TYPOGRAPHY.Body,
      color: C.body,
      fontSize: 13,
      lineHeight: 20,
    },
  });
}
