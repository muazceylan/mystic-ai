import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Heart } from 'lucide-react-native';
import { AppHeader, SafeScreen, AccessibleText } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';
import { useMatchTraits } from '../../hooks/useMatchTraits';
import GrowthCard from '../../components/match/GrowthCard';

function parseMatchId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export default function GrowthPlanScreen() {
  const params = useLocalSearchParams<{
    matchId?: string;
    personAName?: string;
    personBName?: string;
    personASignLabel?: string;
    personBSignLabel?: string;
    overallScore?: string;
  }>();
  const { colors } = useTheme();

  const matchId = parseMatchId(params.matchId);
  const overallScore = Number.isFinite(Number(params.overallScore)) ? Number(params.overallScore) : null;

  const { data, loading, error, isMock, refetch } = useMatchTraits(matchId, {
    personAName: params.personAName,
    personBName: params.personBName,
    personASignLabel: params.personASignLabel,
    personBSignLabel: params.personBSignLabel,
    overallScore,
  });

  const [checkedMap, setCheckedMap] = useState<Record<string, boolean>>({});
  const [showDaily, setShowDaily] = useState(true);

  const dailySuggestions = useMemo(() => {
    if (!data) return [];
    return data.dailySuggestions.slice(0, 2);
  }, [data]);

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <AppHeader title="Gelişim Planı" subtitle="Uyumu güçlendiren günlük öneriler" />

        <View style={styles.introRow}>
          <View style={[styles.introIconBubble, { backgroundColor: colors.violetBg }]}> 
            <Heart size={17} color={colors.violet} />
          </View>
          <AccessibleText style={[styles.introText, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Biz geliştikçe uyumunuz artacak. Hadi, yapabileceğinize bakalım.
          </AccessibleText>
        </View>

        {isMock || error ? (
          <View style={[styles.banner, { backgroundColor: colors.violetBg, borderColor: colors.violetLight }]}> 
            <AccessibleText style={[styles.bannerText, { color: colors.violet }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {isMock
                ? 'Endpoint yerine mock plan gösteriliyor.'
                : `Canlı veri alınamadı: ${error}`}
            </AccessibleText>
          </View>
        ) : null}

        {loading && !data ? (
          <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <ActivityIndicator size="small" color={colors.violet} />
            <AccessibleText style={[styles.stateText, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Gelişim planı hazırlanıyor…
            </AccessibleText>
          </View>
        ) : null}

        {!loading && !data ? (
          <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
            <AccessibleText style={[styles.stateText, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Plan verisi alınamadı.
            </AccessibleText>
            <Pressable
              onPress={() => {
                void refetch();
              }}
              style={[styles.retryBtn, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
            >
              <AccessibleText style={[styles.retryText, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Tekrar dene
              </AccessibleText>
            </Pressable>
          </View>
        ) : null}

        {data ? (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            <View style={styles.listWrap}>
              {data.growthAreas.map((area, index) => (
                <GrowthCard
                  key={area.id}
                  area={area}
                  index={index}
                  checked={Boolean(checkedMap[area.id])}
                  onToggle={() => {
                    setCheckedMap((prev) => ({
                      ...prev,
                      [area.id]: !prev[area.id],
                    }));
                  }}
                />
              ))}
            </View>

            <Pressable
              onPress={() => setShowDaily((prev) => !prev)}
              style={[styles.dailyToggle, { backgroundColor: colors.violetBg, borderColor: colors.violetLight }]}
            >
              <AccessibleText style={[styles.dailyToggleText, { color: colors.violet }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Günlük önerileri {showDaily ? 'gizle' : 'gör'}
              </AccessibleText>
            </Pressable>

            {showDaily ? (
              <View style={[styles.dailyCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
                <AccessibleText style={[styles.dailyTitle, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  Günlük Öneri
                </AccessibleText>
                {dailySuggestions.map((suggestion, index) => (
                  <View key={`daily-${index}`} style={styles.dailyRow}>
                    <View style={[styles.dot, { backgroundColor: colors.violet }]} />
                    <AccessibleText style={[styles.dailyText, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                      {suggestion}
                    </AccessibleText>
                  </View>
                ))}
              </View>
            ) : null}
          </ScrollView>
        ) : null}
      </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.35,
  },
  introRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  introIconBubble: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  introText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 21,
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  bannerText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  scroll: {
    gap: 12,
    paddingBottom: 24,
  },
  listWrap: {
    gap: 12,
  },
  dailyToggle: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  dailyToggleText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dailyCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  dailyTitle: {
    fontSize: 15,
    fontWeight: '800',
  },
  dailyRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
  },
  dailyText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '600',
  },
  stateCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 8,
  },
  stateText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
    textAlign: 'center',
  },
  retryBtn: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retryText: {
    fontSize: 13,
    fontWeight: '700',
  },
});
