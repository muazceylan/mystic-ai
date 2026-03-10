import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import type { DecisionHeroModel } from './model';
import { getCompassTokens } from './tokens';
import { SoftActionButton } from './SoftActionButton';

interface DecisionInsightHeroProps {
  hero: DecisionHeroModel;
  onPressDetail: () => void;
}

// Scene atmosphere sparkles (scattered around the hero area)
const SCENE_SPARKLES: Array<{ top: number; left?: number; right?: number; size: number; opacity: number }> = [
  { top: 16, left: 18, size: 10, opacity: 0.76 },
  { top: 38, left: 52, size: 6, opacity: 0.52 },
  { top: 24, right: 168, size: 11, opacity: 0.66 },
  { top: 60, right: 188, size: 6, opacity: 0.40 },
  { top: 110, right: 190, size: 7, opacity: 0.38 },
  { top: 128, left: 32, size: 6, opacity: 0.32 },
];

function SceneSparkle({ top, left, right, size, opacity, color }: {
  top: number; left?: number; right?: number; size: number; opacity: number; color: string;
}) {
  return (
    <Ionicons
      pointerEvents="none"
      name="sparkles"
      size={size}
      color={color}
      style={{ position: 'absolute', top, left, right, opacity }}
    />
  );
}

/**
 * KawaiiIllustrationPanel — right-side decorative character panel
 * Rendered purely with View primitives to match reference illustration
 */
function KawaiiIllustrationPanel({
  isDark,
  primaryColor,
}: {
  isDark: boolean;
  primaryColor: string;
}) {
  // Color palette
  const bgGradient = isDark
    ? ['rgba(108,52,172,0.84)', 'rgba(90,40,152,0.74)', 'rgba(72,28,130,0.66)'] as [string, string, string]
    : ['#BA8CE8', '#D0A8F4', '#E6C8FA'] as [string, string, string];

  const cream = isDark ? 'rgba(255,248,238,0.88)' : '#FEF4E4';
  const eyeColor = isDark ? '#1E0E38' : '#3A1E52';
  const cheekColor = isDark ? 'rgba(255,140,175,0.70)' : 'rgba(255,148,184,0.78)';
  const starColor = isDark ? 'rgba(255,240,255,0.84)' : 'rgba(255,255,255,0.94)';
  const chartColor = isDark ? 'rgba(240,224,255,0.78)' : 'rgba(255,255,255,0.86)';

  return (
    <LinearGradient
      pointerEvents="none"
      colors={bgGradient}
      start={{ x: 0.1, y: 0 }}
      end={{ x: 0.92, y: 1 }}
      style={kawaiiStyles.panel}
    >
      {/* Ambient glow orb — top right */}
      <View style={kawaiiStyles.panelOrb} />

      {/* ── Sparkle stars ── */}
      <Ionicons name="sparkles" size={12} color={starColor} style={[kawaiiStyles.star, { top: 10, left: 12, opacity: 0.92 }]} />
      <Ionicons name="sparkles" size={8}  color={starColor} style={[kawaiiStyles.star, { top: 12, left: 62, opacity: 0.76 }]} />
      <Ionicons name="star"     size={7}  color={starColor} style={[kawaiiStyles.star, { top: 28, left: 78, opacity: 0.68 }]} />
      <Ionicons name="sparkles" size={8}  color={starColor} style={[kawaiiStyles.star, { top: 66, left: 14, opacity: 0.60 }]} />

      {/* ── Chart lines (bottom-left) ── */}
      <View style={[kawaiiStyles.chartLineA, { backgroundColor: chartColor }]} />
      <View style={[kawaiiStyles.chartLineB, { backgroundColor: chartColor }]} />
      <View style={[kawaiiStyles.chartLineC, { backgroundColor: chartColor }]} />
      <View style={[kawaiiStyles.chartStem,  { backgroundColor: chartColor }]} />
      <View style={[kawaiiStyles.chartHeadA, { backgroundColor: chartColor }]} />
      <View style={[kawaiiStyles.chartHeadB, { backgroundColor: chartColor }]} />

      {/* ── Character: ears ── */}
      <View style={[kawaiiStyles.charEarL, { backgroundColor: cream }]} />
      <View style={[kawaiiStyles.charEarR, { backgroundColor: cream }]} />

      {/* ── Character: head ── */}
      <View style={[kawaiiStyles.charHead, { backgroundColor: cream }]} />

      {/* Head highlight shine */}
      <View style={kawaiiStyles.charHeadShine} />

      {/* ── Character: eyes ── */}
      <View style={[kawaiiStyles.charEyeL, { backgroundColor: eyeColor }]} />
      <View style={[kawaiiStyles.charEyeR, { backgroundColor: eyeColor }]} />

      {/* ── Character: blush cheeks ── */}
      <View style={[kawaiiStyles.charCheekL, { backgroundColor: cheekColor }]} />
      <View style={[kawaiiStyles.charCheekR, { backgroundColor: cheekColor }]} />

      {/* ── Character: body ── */}
      <View style={[kawaiiStyles.charBody, { backgroundColor: cream }]} />
    </LinearGradient>
  );
}

/** Styles for the kawaii illustration — panel is 162×136, character right-aligned */
const kawaiiStyles = StyleSheet.create({
  panel: {
    position: 'absolute',
    top: 12,
    right: 8,
    width: 162,
    height: 136,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.42)',
    overflow: 'hidden',
  },
  panelOrb: {
    position: 'absolute',
    top: -22,
    right: -22,
    width: 110,
    height: 88,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  star: {
    position: 'absolute',
  },

  // Chart lines (bottom-left of panel)
  chartLineA: {
    position: 'absolute',
    left: 14,
    bottom: 32,
    width: 20,
    height: 4,
    borderRadius: 3,
    opacity: 0.88,
    transform: [{ rotate: '-42deg' }],
  },
  chartLineB: {
    position: 'absolute',
    left: 32,
    bottom: 48,
    width: 18,
    height: 4,
    borderRadius: 3,
    opacity: 0.88,
    transform: [{ rotate: '26deg' }],
  },
  chartLineC: {
    position: 'absolute',
    left: 46,
    bottom: 60,
    width: 22,
    height: 4,
    borderRadius: 3,
    opacity: 0.88,
    transform: [{ rotate: '-32deg' }],
  },
  chartStem: {
    position: 'absolute',
    left: 64,
    bottom: 62,
    width: 4,
    height: 28,
    borderRadius: 3,
    opacity: 0.88,
    transform: [{ rotate: '32deg' }],
  },
  chartHeadA: {
    position: 'absolute',
    left: 60,
    bottom: 88,
    width: 12,
    height: 4,
    borderRadius: 3,
    opacity: 0.88,
    transform: [{ rotate: '-34deg' }],
  },
  chartHeadB: {
    position: 'absolute',
    left: 54,
    bottom: 80,
    width: 12,
    height: 4,
    borderRadius: 3,
    opacity: 0.88,
    transform: [{ rotate: '42deg' }],
  },

  // Character elements
  // Ears (above the head)
  charEarL: {
    position: 'absolute',
    top: 14,
    left: 96,
    width: 14,
    height: 20,
    borderRadius: 8,
  },
  charEarR: {
    position: 'absolute',
    top: 10,
    left: 118,
    width: 14,
    height: 20,
    borderRadius: 8,
  },
  // Head
  charHead: {
    position: 'absolute',
    top: 28,
    left: 90,
    width: 52,
    height: 50,
    borderRadius: 26,
  },
  charHeadShine: {
    position: 'absolute',
    top: 32,
    left: 94,
    width: 26,
    height: 11,
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.44)',
  },
  // Eyes
  charEyeL: {
    position: 'absolute',
    top: 48,
    left: 103,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  charEyeR: {
    position: 'absolute',
    top: 48,
    left: 124,
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  // Cheeks
  charCheekL: {
    position: 'absolute',
    top: 62,
    left: 91,
    width: 14,
    height: 9,
    borderRadius: 5,
  },
  charCheekR: {
    position: 'absolute',
    top: 62,
    left: 127,
    width: 14,
    height: 9,
    borderRadius: 5,
  },
  // Body
  charBody: {
    position: 'absolute',
    top: 76,
    left: 99,
    width: 36,
    height: 28,
    borderRadius: 18,
  },
});

// ─────────────────────────────────────────────────────────────────────────────

export function DecisionInsightHero({ hero, onPressDetail }: DecisionInsightHeroProps) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = styles(colors, isDark, T);
  const strongCategories = hero.strongCategories.slice(0, 2);

  return (
    <View style={S.shell}>
      <LinearGradient colors={T.hero.gradient} start={{ x: 0.02, y: 0.02 }} end={{ x: 1, y: 1 }} style={S.card}>
        {/* ── Background atmosphere ── */}
        <View pointerEvents="none" style={S.glowTop} />
        <View pointerEvents="none" style={S.glowBottom} />
        <View pointerEvents="none" style={S.glowBottomLeft} />
        <View pointerEvents="none" style={S.edgeShine} />

        {/* ── Layer 1: Scene / decorative header ── */}
        <View style={S.scene}>
          <LinearGradient
            pointerEvents="none"
            colors={T.gradients.heroOverlay}
            start={{ x: 0.08, y: 0.1 }}
            end={{ x: 0.95, y: 0.95 }}
            style={S.sceneSheen}
          />
          <View pointerEvents="none" style={S.sceneGlow} />
          <View pointerEvents="none" style={S.cloudLarge} />
          <View pointerEvents="none" style={S.cloudMid} />
          <View pointerEvents="none" style={S.cloudSmall} />

          {/* Scene atmosphere sparkles */}
          {SCENE_SPARKLES.map((sp, i) => (
            <SceneSparkle
              key={`sp-${i}`}
              top={sp.top}
              left={sp.left}
              right={sp.right}
              size={sp.size}
              opacity={sp.opacity}
              color={isDark ? '#F2EEFF' : '#FFFCFF'}
            />
          ))}

          {/* Panel glow halo (behind the illustration panel) */}
          <View pointerEvents="none" style={S.panelGlowHalo} />

          {/* ── Kawaii character illustration ── */}
          <KawaiiIllustrationPanel isDark={isDark} primaryColor={colors.primary} />

          {/* ── Kicker label ── */}
          <View style={S.kickerWrap}>
            <Ionicons name="sparkles" size={13} color={colors.primary} style={{ opacity: 0.88 }} />
            <Text style={S.kicker}>Günün İçgörüsü</Text>
          </View>

          {/* ── Main headline ── */}
          <Text style={S.headline}>{hero.headline}</Text>
        </View>

        {/* ── Layer 2: Explanation surface ── */}
        <LinearGradient
          colors={isDark
            ? ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0.06)']
            : ['rgba(255,255,255,0.90)', 'rgba(252,246,255,0.68)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.explanationBand}
        >
          <View pointerEvents="none" style={S.explanationShine} />
          <Text style={S.explanation}>{hero.explanation}</Text>
        </LinearGradient>

        {/* ── Layer 3: Action module (Bugün yap / kaçın) ── */}
        <LinearGradient colors={T.hero.panelGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.dualPane}>
          <View pointerEvents="none" style={S.panelAmbient} />
          <View style={S.column}>
            <View style={S.columnTitleRow}>
              <Text style={S.columnTitle}>Bugün yap</Text>
              <Ionicons name="chevron-forward" size={14} color={T.text.body} />
            </View>
            {hero.doItems.slice(0, 3).map((item, i) => (
              <View key={`do-${i}`} style={S.itemRow}>
                <View style={S.dotWrap}>
                  <Ionicons name="checkmark" size={11} color={colors.primary} />
                </View>
                <Text style={S.itemText} numberOfLines={1}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={S.divider} />

          <View style={S.column}>
            <View style={S.columnTitleRow}>
              <Text style={S.columnTitle}>Bugün kaçın</Text>
              <Ionicons name="warning-outline" size={13} color={isDark ? '#FFDDB3' : '#D89C4E'} />
            </View>
            {hero.avoidItems.slice(0, 2).map((item, i) => (
              <View key={`av-${i}`} style={S.itemRow}>
                <View style={S.warnDotWrap}>
                  <Ionicons name="alert-outline" size={10} color={isDark ? '#FFD7E8' : '#B55C88'} />
                </View>
                <Text style={S.itemText} numberOfLines={1}>{item}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        {/* ── Bottom row: strong areas + CTA ── */}
        <View style={S.bottomRow}>
          <View style={S.strongWrap}>
            <Text style={S.strongLabel}>En güçlü alanlar:</Text>
            <View style={S.tagsRow}>
              {(strongCategories.length ? strongCategories : ['Günlük odak']).map((label) => (
                <LinearGradient
                  key={label}
                  colors={isDark
                    ? ['rgba(200,172,255,0.30)', 'rgba(170,140,240,0.20)']
                    : ['rgba(248,241,255,0.99)', 'rgba(236,224,255,0.94)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={S.tagPill}
                >
                  <View pointerEvents="none" style={S.tagPillShine} />
                  <Text style={S.tagText} numberOfLines={1}>{label}</Text>
                </LinearGradient>
              ))}
            </View>
          </View>

          <SoftActionButton
            label="Detayı Gör"
            onPress={onPressDetail}
            gradient={T.hero.ctaGradient as [string, string]}
            borderColor={isDark ? 'rgba(210,185,255,0.46)' : 'rgba(192,162,255,0.84)'}
            textColor={colors.primary}
            iconColor={colors.primary}
            large
          />
        </View>
      </LinearGradient>
    </View>
  );
}

function styles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean, T: ReturnType<typeof getCompassTokens>) {
  return StyleSheet.create({
    shell: {
      marginBottom: 20,
      borderRadius: T.radii.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(200,178,255,0.28)' : 'rgba(180,152,248,0.68)',
      ...T.shadows.hero,
    },
    card: {
      paddingHorizontal: 14,
      paddingTop: 13,
      paddingBottom: 14,
      gap: 10,
    },

    // Background atmosphere
    glowTop: {
      position: 'absolute',
      top: -90,
      left: -58,
      width: 254,
      height: 194,
      borderRadius: 132,
      backgroundColor: T.colors.glow.hero,
      opacity: 0.90,
    },
    glowBottom: {
      position: 'absolute',
      right: -68,
      bottom: -78,
      width: 262,
      height: 178,
      borderRadius: 132,
      backgroundColor: isDark ? 'rgba(140,112,220,0.22)' : 'rgba(212,194,255,0.56)',
    },
    glowBottomLeft: {
      position: 'absolute',
      left: -52,
      bottom: -44,
      width: 200,
      height: 128,
      borderRadius: 102,
      backgroundColor: isDark ? 'rgba(255,192,224,0.10)' : 'rgba(255,220,238,0.46)',
    },
    edgeShine: {
      position: 'absolute',
      left: 14,
      right: 14,
      top: 10,
      height: 22,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.50)',
    },

    // Scene
    scene: {
      minHeight: 162,
      borderRadius: T.radii.panel,
      paddingHorizontal: 14,
      paddingTop: 13,
      paddingBottom: 40,
      overflow: 'hidden',
      position: 'relative',
    },
    sceneSheen: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      borderRadius: T.radii.panel,
    },
    sceneGlow: {
      position: 'absolute',
      top: 12,
      right: 60,
      width: 170,
      height: 128,
      borderRadius: 92,
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,238,252,0.76)',
    },
    cloudLarge: {
      position: 'absolute',
      left: -40,
      bottom: -28,
      width: 218,
      height: 96,
      borderRadius: 60,
      backgroundColor: isDark ? 'rgba(255,255,255,0.11)' : 'rgba(255,255,255,0.68)',
    },
    cloudMid: {
      position: 'absolute',
      left: 116,
      bottom: -14,
      width: 190,
      height: 76,
      borderRadius: 52,
      backgroundColor: isDark ? 'rgba(248,240,255,0.10)' : 'rgba(255,250,255,0.62)',
    },
    cloudSmall: {
      position: 'absolute',
      right: -30,
      bottom: -20,
      width: 140,
      height: 72,
      borderRadius: 44,
      backgroundColor: isDark ? 'rgba(232,220,255,0.10)' : 'rgba(252,244,255,0.66)',
    },

    // Panel glow halo — bloom effect behind illustration panel
    panelGlowHalo: {
      position: 'absolute',
      top: 6,
      right: 2,
      width: 178,
      height: 150,
      borderRadius: 90,
      backgroundColor: isDark ? 'rgba(188,160,255,0.20)' : 'rgba(226,208,255,0.62)',
    },

    // Kicker + headline
    kickerWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      minHeight: 20,
      marginBottom: 8,
    },
    kicker: {
      color: C.primary,
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: 0.68,
      textTransform: 'uppercase',
      textShadowColor: isDark ? 'rgba(0,0,0,0.18)' : 'rgba(255,255,255,0.72)',
      textShadowRadius: 8,
    },
    headline: {
      color: T.text.title,
      fontSize: 20,
      lineHeight: 27,
      fontWeight: '900',
      letterSpacing: -0.65,
      // paddingRight reserves space for the illustration panel (width 162 + right 8 = 170)
      paddingRight: 160,
    },

    // Layer 2: Explanation band
    explanationBand: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.74)',
      paddingHorizontal: 13,
      paddingVertical: 11,
      position: 'relative',
      overflow: 'hidden',
    },
    explanationShine: {
      position: 'absolute',
      top: 2,
      left: 10,
      right: 10,
      height: 14,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.54)',
    },
    explanation: {
      color: T.text.body,
      fontSize: 14.5,
      lineHeight: 22,
      fontWeight: '600',
    },

    // Layer 3: Dual pane
    dualPane: {
      borderRadius: 20,
      borderWidth: 1,
      borderColor: T.border.thin,
      paddingHorizontal: 13,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 11,
      overflow: 'hidden',
      position: 'relative',
    },
    panelAmbient: {
      position: 'absolute',
      top: -12,
      left: 22,
      width: 186,
      height: 58,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.44)',
    },
    column: {
      flex: 1,
      gap: 8,
    },
    columnTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 1,
    },
    divider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(196,180,228,0.48)',
    },
    columnTitle: {
      color: T.text.title,
      fontSize: 15.5,
      fontWeight: '900',
      letterSpacing: -0.3,
    },
    itemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    dotWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(186,158,255,0.24)' : 'rgba(236,226,255,0.96)',
      borderWidth: 1,
      borderColor: T.border.soft,
    },
    warnDotWrap: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(255,172,210,0.20)' : 'rgba(255,238,246,0.96)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,202,228,0.30)' : 'rgba(238,182,216,0.42)',
    },
    itemText: {
      flex: 1,
      color: T.text.body,
      fontSize: 13,
      lineHeight: 18,
      fontWeight: '700',
    },

    // Bottom row
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 10,
    },
    strongWrap: {
      flex: 1,
      gap: 6,
      paddingRight: 6,
    },
    strongLabel: {
      color: T.text.subtitle,
      fontSize: 13,
      fontWeight: '800',
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
    },
    tagPill: {
      minHeight: 28,
      borderRadius: 999,
      paddingHorizontal: 12,
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(200,172,255,0.36)' : 'rgba(204,180,252,0.70)',
      overflow: 'hidden',
      position: 'relative',
    },
    tagPillShine: {
      position: 'absolute',
      top: 1,
      left: 6,
      right: 6,
      height: 9,
      borderRadius: 999,
      backgroundColor: 'rgba(255,255,255,0.32)',
    },
    tagText: {
      color: C.primary,
      fontSize: 12.5,
      fontWeight: '800',
    },
  });
}
