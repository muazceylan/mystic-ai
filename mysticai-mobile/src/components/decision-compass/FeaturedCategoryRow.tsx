import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { DecisionCompassPremiumBadge } from './DecisionCompassPremiumBadge';
import { statusColors } from './palette';
import { statusLabel, type DecisionCategoryModel } from './model';
import { getCompassTokens } from './tokens';
import { ScoreRing } from './ScoreRing';
import { StatusPill } from './StatusPill';

interface FeaturedCategoryRowProps {
  categories: DecisionCategoryModel[];
  onPressCategory: (category: DecisionCategoryModel) => void;
}

function scoreRingTone(score: number, isDark: boolean): [string, string] {
  if (score >= 70) return isDark ? ['#DAD7FF', '#A9A0FF'] : ['#D8D3FF', '#A59CFF'];
  if (score >= 55) return isDark ? ['#D7E4FF', '#9AB4FF'] : ['#D9E8FF', '#9CB5FF'];
  if (score >= 40) return isDark ? ['#F1D8FF', '#D8ABFF'] : ['#F3DAFF', '#D6A6FF'];
  if (score >= 25) return isDark ? ['#FFDCEB', '#F5A9CC'] : ['#FFE0ED', '#F5AACB'];
  return isDark ? ['#FFE8EE', '#F5B5C9'] : ['#FFEAF0', '#F3B5CB'];
}

export function FeaturedCategoryRow({ categories, onPressCategory }: FeaturedCategoryRowProps) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = styles(colors, isDark, T);

  if (!categories.length) return null;

  return (
    <View style={S.wrap}>
      <Text style={S.title}>Bugün Öne Çıkanlar</Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.row}>
        {categories.slice(0, 3).map((category, index) => {
          const tint = statusColors(category.status, isDark);
          const cardGrad = T.featuredCardGradients[index % T.featuredCardGradients.length] as [string, string];
          const artGrad = T.featuredArtGradients[index % T.featuredArtGradients.length] as [string, string];
          const ringTone = scoreRingTone(category.score, isDark);
          const glowColor = index === 1
            ? (isDark ? 'rgba(180,200,255,0.14)' : 'rgba(215,228,255,0.88)')
            : index === 2
              ? (isDark ? 'rgba(255,192,216,0.14)' : 'rgba(255,226,238,0.86)')
              : (isDark ? 'rgba(214,196,255,0.14)' : 'rgba(240,228,255,0.88)');

          return (
            <Pressable
              key={category.id}
              onPress={() => onPressCategory(category)}
              style={({ pressed }) => [S.cardShell, pressed && S.pressed]}
            >
              <LinearGradient colors={cardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.card}>
                <View pointerEvents="none" style={[S.cardGlow, { backgroundColor: glowColor }]} />
                <View pointerEvents="none" style={S.cardEdge} />

                <LinearGradient colors={artGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.artBand}>
                  <View pointerEvents="none" style={S.artCurveLarge} />
                  <View pointerEvents="none" style={S.artCurveSmall} />
                  <View pointerEvents="none" style={S.artBubble} />
                  <View pointerEvents="none" style={S.artShimmer} />

                  <DecisionCompassPremiumBadge iconName={category.icon} status={category.status} size="sm" />

                  <ScoreRing
                    score={category.score}
                    ringColors={ringTone}
                    textColor={tint.text}
                    centerFill={isDark ? 'rgba(22,16,42,0.78)' : 'rgba(255,255,255,0.90)'}
                    size={56}
                  />
                </LinearGradient>

                <View style={S.content}>
                  <Text style={S.cardTitle} numberOfLines={1}>{category.title}</Text>
                  <StatusPill label={statusLabel(category.status)} textColor={tint.text} gradient={tint.pill} />
                  <Text style={S.summary} numberOfLines={2}>{category.shortSummary}</Text>

                  <Pressable onPress={() => onPressCategory(category)} style={({ pressed }) => [S.detailBtn, pressed && S.pressed]}>
                    <Text style={S.detailText}>Detay</Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                  </Pressable>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function styles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean, T: ReturnType<typeof getCompassTokens>) {
  return StyleSheet.create({
    wrap: {
      marginBottom: 18,
      gap: 11,
    },
    title: {
      color: T.text.title,
      fontSize: 17,
      fontWeight: '900',
      letterSpacing: -0.35,
      marginLeft: 2,
    },
    row: {
      gap: 10,
      paddingRight: 10,
    },
    cardShell: {
      width: 160,
      borderRadius: T.radii.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(218,196,255,0.22)' : 'rgba(200,178,248,0.66)',
      ...T.shadows.ambient,
    },
    card: {
      minHeight: 208,
      padding: 10,
      gap: 8,
      backgroundColor: T.colors.surface.featured,
      position: 'relative',
      overflow: 'hidden',
    },
    cardGlow: {
      position: 'absolute',
      top: -26,
      left: -10,
      width: 132,
      height: 104,
      borderRadius: 64,
      opacity: 0.90,
    },
    cardEdge: {
      position: 'absolute',
      top: 2,
      left: 10,
      right: 10,
      height: 14,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.54)',
    },
    artBand: {
      minHeight: 88,
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.76)',
      overflow: 'hidden',
      position: 'relative',
    },
    artCurveLarge: {
      position: 'absolute',
      left: -24,
      top: -16,
      width: 110,
      height: 72,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.34)',
    },
    artCurveSmall: {
      position: 'absolute',
      right: -18,
      bottom: -12,
      width: 78,
      height: 44,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.24)',
    },
    artBubble: {
      position: 'absolute',
      right: 14,
      top: 14,
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor: 'rgba(255,255,255,0.24)',
    },
    artShimmer: {
      position: 'absolute',
      left: -12,
      top: 44,
      width: 120,
      height: 24,
      borderRadius: 14,
      backgroundColor: 'rgba(255,255,255,0.18)',
      transform: [{ rotate: '-16deg' }],
    },
    content: {
      flex: 1,
      gap: 7,
      paddingHorizontal: 1,
    },
    cardTitle: {
      color: T.text.title,
      fontSize: 15.5,
      fontWeight: '900',
      letterSpacing: -0.28,
    },
    summary: {
      color: T.text.subtitle,
      fontSize: 12,
      lineHeight: 16.5,
      fontWeight: '600',
      minHeight: 32,
    },
    detailBtn: {
      marginTop: 'auto',
      alignSelf: 'flex-start',
      minHeight: 30,
      borderRadius: 999,
      paddingHorizontal: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(200,176,255,0.34)' : 'rgba(194,166,248,0.72)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(248,241,255,0.82)',
    },
    detailText: {
      color: C.primary,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: -0.1,
    },
    pressed: {
      opacity: 0.84,
    },
  });
}
