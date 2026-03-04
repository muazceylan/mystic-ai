import React from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { ChevronLeft, Info } from 'lucide-react-native';
import { SafeScreen, AccessibleText } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';
import { useMatchTraits } from '../../hooks/useMatchTraits';
import StoryCardPreview from '../../components/match/StoryCardPreview';

function parseMatchId(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export default function ShareCardPreviewScreen() {
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

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={styles.container}>
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.iconBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <ChevronLeft size={20} color={colors.text} />
          </Pressable>
          <View style={styles.headerTextWrap}>
            <AccessibleText style={[styles.title, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Paylaşılabilir Kartlar
            </AccessibleText>
            <AccessibleText style={[styles.sub, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              Sosyalde paylaşmak için kartlarını hazırla
            </AccessibleText>
          </View>
        </View>

        {isMock || error ? (
          <View style={[styles.banner, { backgroundColor: colors.violetBg, borderColor: colors.violetLight }]}> 
            <Info size={14} color={colors.violet} />
            <AccessibleText style={[styles.bannerText, { color: colors.violet }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {isMock ? 'Kartlar örnek veriyle gösteriliyor.' : `Canlı veri sorunu: ${error}`}
            </AccessibleText>
          </View>
        ) : null}

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {loading && !data ? (
            <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <ActivityIndicator size="small" color={colors.violet} />
              <AccessibleText style={[styles.stateText, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Kart hazırlanıyor…
              </AccessibleText>
            </View>
          ) : null}

          {!loading && !data ? (
            <View style={[styles.stateCard, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
              <AccessibleText style={[styles.stateText, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                Kart içeriği alınamadı.
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
            <View style={styles.previewWrap}>
              <StoryCardPreview data={data} />
            </View>
          ) : null}
        </ScrollView>
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
  headerTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sub: {
    fontSize: 13,
    fontWeight: '600',
  },
  banner: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  scroll: {
    paddingBottom: 24,
    gap: 12,
  },
  previewWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.13,
    shadowRadius: 18,
    elevation: 6,
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
    fontWeight: '600',
    lineHeight: 20,
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
