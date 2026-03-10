import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { statusColors } from './palette';
import { statusLabel, type DecisionCategoryModel } from './model';
import { getCompassTokens } from './tokens';
import { ScoreRing } from './ScoreRing';
import { StatusPill } from './StatusPill';

interface FeaturedCategoryRowProps {
  categories: DecisionCategoryModel[];
  onPressCategory: (category: DecisionCategoryModel) => void;
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
        {categories.map((category, index) => {
          const tint = statusColors(category.status, isDark);
          const cardGrad = T.featuredCardGradients[index % T.featuredCardGradients.length] as [string, string];
          const artGrad  = T.featuredArtGradients[index % T.featuredArtGradients.length] as [string, string];

          // Per-index ambient color
          const glowColor = index === 1
            ? (isDark ? 'rgba(180,200,255,0.14)' : 'rgba(215,228,255,0.88)')
            : index === 2
              ? (isDark ? 'rgba(255,192,216,0.14)' : 'rgba(255,226,238,0.86)')
              : (isDark ? 'rgba(214,196,255,0.14)' : 'rgba(240,228,255,0.88)');

          const orbColor = index === 1
            ? (isDark ? 'rgba(200,218,255,0.14)' : 'rgba(255,255,255,0.60)')
            : index === 2
              ? (isDark ? 'rgba(255,228,242,0.12)' : 'rgba(255,255,255,0.66)')
              : (isDark ? 'rgba(228,216,255,0.14)' : 'rgba(255,255,255,0.64)');

          const shimmerColor = index === 1
            ? 'rgba(196,216,255,0.34)'
            : index === 2
              ? 'rgba(255,204,228,0.34)'
              : 'rgba(216,196,255,0.34)';

          const ringCenter = isDark ? 'rgba(22,16,42,0.74)' : 'rgba(255,255,255,0.84)';

          return (
            <Pressable
              key={category.id}
              onPress={() => onPressCategory(category)}
              style={({ pressed }) => [S.cardShell, pressed && S.pressed]}
            >
              <LinearGradient colors={cardGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.card}>
                {/* Card ambient */}
                <View pointerEvents="none" style={[S.cardGlow, { backgroundColor: glowColor }]} />

                {/* ── Art band (top) ── */}
                <LinearGradient colors={artGrad} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.artBand}>
                  <View pointerEvents="none" style={S.artCurveLarge} />
                  <View pointerEvents="none" style={[S.artShimmer, { backgroundColor: shimmerColor }]} />
                  <View pointerEvents="none" style={[S.artCurveSmall, { backgroundColor: orbColor }]} />
                  <View pointerEvents="none" style={[S.artOrb, { backgroundColor: orbColor }]} />

                  {/* Icon bubble */}
                  <LinearGradient
                    colors={['rgba(255,255,255,0.90)', 'rgba(255,255,255,0.66)']}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={S.iconWrap}
                  >
                    <Ionicons name={category.icon} size={16} color={colors.primary} />
                  </LinearGradient>

                  {/* Score ring */}
                  <ScoreRing
                    score={category.score}
                    ringColors={tint.ring}
                    textColor={tint.text}
                    centerFill={ringCenter}
                    size={54}
                  />
                </LinearGradient>

                {/* ── Content ── */}
                <View style={S.content}>
                  <Text style={S.cardTitle} numberOfLines={1}>{category.title}</Text>
                  <StatusPill label={statusLabel(category.status)} textColor={tint.text} gradient={tint.pill} />
                  <Text style={S.summary} numberOfLines={2}>{category.shortSummary}</Text>

                  {/* ── Two "Detay" buttons ── */}
                  <View style={S.bottomCtaRow}>
                    <Pressable
                      onPress={() => onPressCategory(category)}
                      style={({ pressed }) => [S.detayPillLeft, pressed && S.pressed]}
                    >
                      <LinearGradient
                        colors={['rgba(255,255,255,0.86)', 'rgba(255,255,255,0.62)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={S.detayPillInner}
                      >
                        <Text style={S.detayPillText}>Detay</Text>
                      </LinearGradient>
                    </Pressable>

                    <Pressable
                      onPress={() => onPressCategory(category)}
                      style={({ pressed }) => [S.detayPillRight, pressed && S.pressed]}
                    >
                      <LinearGradient
                        colors={T.gradients.pillPrimary as [string, string]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={S.detayPillInner}
                      >
                        <Text style={[S.detayPillText, { color: colors.primary }]}>Detay</Text>
                        <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                      </LinearGradient>
                    </Pressable>
                  </View>
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

    // Card shell — narrower so 3 are visible (2 full + partial 3rd)
    cardShell: {
      width: 152,
      borderRadius: T.radii.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(218,196,255,0.22)' : 'rgba(200,178,248,0.66)',
      ...T.shadows.ambient,
    },
    card: {
      minHeight: 220,
      padding: 10,
      gap: 9,
      backgroundColor: T.colors.surface.featured,
      position: 'relative',
    },
    cardGlow: {
      position: 'absolute',
      top: -28,
      left: -10,
      width: 130,
      height: 106,
      borderRadius: 64,
      opacity: 0.92,
    },

    // Art band
    artBand: {
      minHeight: 96,
      borderRadius: 18,
      paddingHorizontal: 10,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.74)',
      overflow: 'hidden',
      position: 'relative',
    },
    artCurveLarge: {
      position: 'absolute',
      left: -26,
      top: -18,
      width: 118,
      height: 80,
      borderRadius: 46,
      backgroundColor: 'rgba(255,255,255,0.40)',
    },
    artShimmer: {
      position: 'absolute',
      left: -24,
      top: 52,
      width: 170,
      height: 32,
      borderRadius: 20,
      transform: [{ rotate: '-16deg' }],
    },
    artCurveSmall: {
      position: 'absolute',
      right: -16,
      bottom: -12,
      width: 80,
      height: 50,
      borderRadius: 28,
    },
    artOrb: {
      position: 'absolute',
      right: 16,
      top: 14,
      width: 46,
      height: 46,
      borderRadius: 23,
    },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.80)',
    },

    // Content
    content: {
      flex: 1,
      gap: 7,
      paddingHorizontal: 2,
    },
    cardTitle: {
      color: T.text.title,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: -0.35,
    },
    summary: {
      color: T.text.subtitle,
      fontSize: 12,
      lineHeight: 17,
      fontWeight: '600',
      minHeight: 34,
    },

    // Two detay buttons
    bottomCtaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      marginTop: 'auto',
    },
    detayPillLeft: {
      flex: 1,
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(212,196,248,0.70)',
    },
    detayPillRight: {
      flex: 1,
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(200,176,255,0.36)' : 'rgba(196,164,252,0.78)',
    },
    detayPillInner: {
      minHeight: 34,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      paddingHorizontal: 8,
    },
    detayPillText: {
      color: T.text.body,
      fontSize: 13,
      fontWeight: '800',
      letterSpacing: -0.1,
    },
    pressed: {
      opacity: 0.84,
    },
  });
}
