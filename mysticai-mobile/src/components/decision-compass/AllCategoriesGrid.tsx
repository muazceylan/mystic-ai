import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { statusColors } from './palette';
import { statusLabel, type DecisionCategoryModel } from './model';
import { ScoreRing } from './ScoreRing';
import { StatusPill } from './StatusPill';
import { getCompassTokens } from './tokens';

interface AllCategoriesGridProps {
  featuredCategories: DecisionCategoryModel[];
  compactCategories: DecisionCategoryModel[];
  columnWidth: number;
  onPressCategory: (category: DecisionCategoryModel) => void;
}

type VariantTone = {
  cardGradient: [string, string];
  artGradient: [string, string];
  glowColor: string;
  sceneIcon: keyof typeof Ionicons.glyphMap;
};

function normalizeHaystack(category: DecisionCategoryModel) {
  return `${category.id} ${category.title} ${category.subLabel}`.toLocaleLowerCase('tr-TR');
}

function toneForCategory(
  category: DecisionCategoryModel,
  index: number,
  isDark: boolean,
  T: ReturnType<typeof getCompassTokens>,
): VariantTone {
  const haystack = normalizeHaystack(category);
  if (haystack.includes('transit')) {
    return {
      cardGradient: T.gradients.featuredCosmic as [string, string],
      artGradient: isDark ? ['rgba(184,166,255,0.42)', 'rgba(138,112,236,0.26)'] : ['#E7D9FF', '#DCCBFF'],
      glowColor: isDark ? 'rgba(201,188,255,0.18)' : 'rgba(240,230,255,0.92)',
      sceneIcon: 'planet-outline',
    };
  }

  if (haystack.includes('ay')) {
    return {
      cardGradient: T.gradients.featuredMoon as [string, string],
      artGradient: isDark ? ['rgba(220,224,255,0.34)', 'rgba(190,172,255,0.24)'] : ['#EEE9FF', '#F7ECFF'],
      glowColor: isDark ? 'rgba(214,216,255,0.16)' : 'rgba(244,240,255,0.96)',
      sceneIcon: 'moon-outline',
    };
  }

  if (haystack.includes('kariyer') || haystack.includes('iş') || haystack.includes('work')) {
    return {
      cardGradient: T.gradients.featuredPink as [string, string],
      artGradient: isDark ? ['rgba(255,194,224,0.36)', 'rgba(216,172,255,0.24)'] : ['#F8D7F3', '#E9D8FF'],
      glowColor: isDark ? 'rgba(255,206,226,0.14)' : 'rgba(255,239,248,0.94)',
      sceneIcon: 'briefcase-outline',
    };
  }

  if (haystack.includes('resmi') || haystack.includes('belge')) {
    return {
      cardGradient: T.gradients.featuredBlue as [string, string],
      artGradient: isDark ? ['rgba(190,208,255,0.34)', 'rgba(184,166,255,0.24)'] : ['#DCE7FF', '#E9DDFF'],
      glowColor: isDark ? 'rgba(198,214,255,0.14)' : 'rgba(236,242,255,0.94)',
      sceneIcon: 'document-text-outline',
    };
  }

  if (haystack.includes('aktivite') || haystack.includes('spor')) {
    return {
      cardGradient: T.gradients.featuredGold as [string, string],
      artGradient: isDark ? ['rgba(255,219,172,0.34)', 'rgba(226,176,255,0.22)'] : ['#FFE8C8', '#F3D9FF'],
      glowColor: isDark ? 'rgba(255,224,184,0.14)' : 'rgba(255,246,224,0.96)',
      sceneIcon: 'trophy-outline',
    };
  }

  const gradients = [
    T.gradients.featuredLilac as [string, string],
    T.gradients.featuredBlue as [string, string],
    T.gradients.featuredPink as [string, string],
  ];

  const art = [
    T.featuredArtGradients[0] as [string, string],
    T.featuredArtGradients[1] as [string, string],
    T.featuredArtGradients[2] as [string, string],
  ];

  return {
    cardGradient: gradients[index % gradients.length],
    artGradient: art[index % art.length],
    glowColor: isDark ? 'rgba(226,214,255,0.14)' : 'rgba(248,240,255,0.92)',
    sceneIcon: category.icon,
  };
}

function compactGradientForCategory(
  category: DecisionCategoryModel,
  isDark: boolean,
  T: ReturnType<typeof getCompassTokens>,
): [string, string] {
  const haystack = normalizeHaystack(category);
  if (haystack.includes('transit')) return T.gradients.featuredCosmic as [string, string];
  if (haystack.includes('ay')) return T.gradients.featuredMoon as [string, string];
  if (haystack.includes('aktivite')) return T.gradients.featuredGold as [string, string];
  return T.gradients.miniCard as [string, string];
}

function DetailPill({ onPress }: { onPress: () => void }) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = gridStyles(colors, isDark, T);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [S.detailPill, pressed && S.pressed]}>
      <LinearGradient colors={T.gradients.pillPrimary as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.detailPillFill}>
        <Text style={S.detailPillText}>Detay</Text>
        <Ionicons name="chevron-forward" size={14} color={colors.primary} />
      </LinearGradient>
    </Pressable>
  );
}

function FeaturedAllCategoryCard({
  category,
  width,
  index,
  onPress,
}: {
  category: DecisionCategoryModel;
  width: number;
  index: number;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = gridStyles(colors, isDark, T);
  const tint = statusColors(category.status, isDark);
  const tone = toneForCategory(category, index, isDark, T);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [S.featuredShell, { width }, pressed && S.pressed]}>
      <LinearGradient colors={tone.cardGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.featuredCard}>
        <View pointerEvents="none" style={[S.featuredGlow, { backgroundColor: tone.glowColor }]} />

        <LinearGradient colors={tone.artGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.featuredArt}>
          <View pointerEvents="none" style={S.cloudLayerLarge} />
          <View pointerEvents="none" style={S.cloudLayerMid} />
          <View pointerEvents="none" style={S.cloudLayerLow} />
          <View pointerEvents="none" style={S.sparkleA} />
          <View pointerEvents="none" style={S.sparkleB} />
          <View pointerEvents="none" style={S.sparkleC} />

          <View style={S.featuredIconBubble}>
            <Ionicons name={category.icon} size={18} color={colors.primary} />
          </View>

          <View style={S.sceneIconWrap}>
            <Ionicons name={tone.sceneIcon} size={30} color="rgba(161,111,240,0.92)" />
          </View>

          <ScoreRing
            score={category.score}
            size={74}
            ringColors={tint.ring}
            textColor={tint.text}
            centerFill={isDark ? 'rgba(22,16,42,0.78)' : 'rgba(255,249,255,0.96)'}
          />
        </LinearGradient>

        <View style={S.featuredContent}>
          <Text style={S.featuredTitle} numberOfLines={2}>{category.title}</Text>
          <Text style={S.featuredMeta} numberOfLines={1}>{category.subLabel}</Text>

          <View style={S.featuredFooter}>
            <StatusPill label={statusLabel(category.status)} textColor={tint.text} gradient={tint.pill} compact />
            <DetailPill onPress={onPress} />
          </View>
        </View>
      </LinearGradient>
    </Pressable>
  );
}

function CompactAllCategoryCard({
  category,
  width,
  onPress,
}: {
  category: DecisionCategoryModel;
  width: number;
  onPress: () => void;
}) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = gridStyles(colors, isDark, T);
  const tint = statusColors(category.status, isDark);
  const compactGradient = compactGradientForCategory(category, isDark, T);

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [S.compactShell, { width }, pressed && S.pressed]}>
      <LinearGradient colors={compactGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.compactCard}>
        <View pointerEvents="none" style={S.compactShine} />
        <View pointerEvents="none" style={S.compactCloud} />

        <View style={S.compactTop}>
          <View style={S.compactIconBubble}>
            <Ionicons name={category.icon} size={16} color={colors.primary} />
          </View>

          <LinearGradient colors={tint.pill} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={S.compactScorePill}>
            <Text style={[S.compactScoreText, { color: tint.text }]}>{Math.round(category.score)}%</Text>
          </LinearGradient>
        </View>

        <View style={S.compactContent}>
          <Text style={S.compactTitle} numberOfLines={2}>{category.title}</Text>
          <Text style={S.compactMeta} numberOfLines={2}>{category.subLabel}</Text>
        </View>

        <View style={S.compactFooter}>
          <StatusPill label={statusLabel(category.status)} textColor={tint.text} gradient={tint.pill} compact />
          <DetailPill onPress={onPress} />
        </View>
      </LinearGradient>
    </Pressable>
  );
}

export function AllCategoriesGrid({
  featuredCategories,
  compactCategories,
  columnWidth,
  onPressCategory,
}: AllCategoriesGridProps) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = gridStyles(colors, isDark, T);

  return (
    <View style={S.wrap}>
      <Text style={S.sectionTitle}>Tüm Kategoriler</Text>

      <View style={S.grid}>
        {featuredCategories.map((category, index) => (
          <FeaturedAllCategoryCard
            key={category.id}
            category={category}
            width={columnWidth}
            index={index}
            onPress={() => onPressCategory(category)}
          />
        ))}

        {compactCategories.map((category) => (
          <CompactAllCategoryCard
            key={category.id}
            category={category}
            width={columnWidth}
            onPress={() => onPressCategory(category)}
          />
        ))}
      </View>
    </View>
  );
}

function gridStyles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean, T: ReturnType<typeof getCompassTokens>) {
  return StyleSheet.create({
    wrap: {
      gap: 12,
      marginBottom: 10,
    },
    sectionTitle: {
      color: T.text.title,
      fontSize: 18.5,
      fontWeight: '900',
      letterSpacing: -0.42,
      marginHorizontal: 2,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
    },
    featuredShell: {
      borderRadius: 24,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(218,196,255,0.22)' : 'rgba(209,188,248,0.72)',
      ...T.shadows.ambient,
    },
    featuredCard: {
      minHeight: 250,
      padding: 10,
      gap: 10,
      position: 'relative',
      backgroundColor: T.colors.surface.featured,
    },
    featuredGlow: {
      position: 'absolute',
      top: -24,
      left: -14,
      width: 170,
      height: 100,
      borderRadius: 60,
      opacity: 0.94,
    },
    featuredArt: {
      minHeight: 112,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.76)',
      padding: 12,
      position: 'relative',
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'space-between',
    },
    cloudLayerLarge: {
      position: 'absolute',
      left: -26,
      right: 24,
      top: -14,
      height: 62,
      borderRadius: 40,
      backgroundColor: 'rgba(255,255,255,0.28)',
    },
    cloudLayerMid: {
      position: 'absolute',
      left: 28,
      right: -20,
      bottom: 8,
      height: 48,
      borderRadius: 28,
      backgroundColor: 'rgba(255,255,255,0.26)',
    },
    cloudLayerLow: {
      position: 'absolute',
      left: -18,
      right: -10,
      bottom: -12,
      height: 54,
      borderRadius: 32,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    sparkleA: {
      position: 'absolute',
      top: 12,
      left: 14,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: 'rgba(255,255,255,0.74)',
      transform: [{ rotate: '45deg' }],
    },
    sparkleB: {
      position: 'absolute',
      top: 32,
      left: 34,
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.62)',
      transform: [{ rotate: '45deg' }],
    },
    sparkleC: {
      position: 'absolute',
      top: 18,
      right: 66,
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.66)',
      transform: [{ rotate: '45deg' }],
    },
    featuredIconBubble: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.78)',
      backgroundColor: 'rgba(255,255,255,0.68)',
    },
    sceneIconWrap: {
      position: 'absolute',
      right: 22,
      bottom: 22,
      width: 52,
      height: 52,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.24)',
    },
    featuredContent: {
      flex: 1,
      paddingHorizontal: 2,
      gap: 5,
      justifyContent: 'space-between',
    },
    featuredTitle: {
      color: T.text.title,
      fontSize: 18,
      fontWeight: '900',
      letterSpacing: -0.38,
      lineHeight: 22.4,
    },
    featuredMeta: {
      color: T.text.subtitle,
      fontSize: 12.4,
      fontWeight: '600',
      lineHeight: 16,
    },
    featuredFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 'auto',
    },
    compactShell: {
      borderRadius: 22,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(218,196,255,0.18)' : 'rgba(206,186,248,0.62)',
      ...T.shadows.soft,
    },
    compactCard: {
      minHeight: 134,
      padding: 14,
      gap: 10,
      justifyContent: 'space-between',
      position: 'relative',
      overflow: 'hidden',
      backgroundColor: T.surface.mini,
    },
    compactShine: {
      position: 'absolute',
      top: 2,
      left: 10,
      right: 10,
      height: 14,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.54)',
    },
    compactCloud: {
      position: 'absolute',
      right: -14,
      bottom: -8,
      width: 94,
      height: 42,
      borderRadius: 24,
      backgroundColor: 'rgba(255,255,255,0.22)',
    },
    compactTop: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    compactIconBubble: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(196,168,255,0.28)' : 'rgba(216,200,255,0.66)',
      backgroundColor: isDark ? 'rgba(196,168,255,0.14)' : 'rgba(246,238,255,0.96)',
    },
    compactScorePill: {
      minWidth: 56,
      minHeight: 28,
      borderRadius: 14,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.68)',
    },
    compactScoreText: {
      fontSize: 13,
      fontWeight: '900',
      letterSpacing: -0.18,
    },
    compactContent: {
      gap: 2,
    },
    compactTitle: {
      color: T.text.title,
      fontSize: 16,
      fontWeight: '900',
      letterSpacing: -0.3,
      lineHeight: 20.4,
    },
    compactMeta: {
      color: T.text.subtitle,
      fontSize: 12.4,
      lineHeight: 15.8,
      fontWeight: '600',
    },
    compactFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 'auto',
    },
    detailPill: {
      borderRadius: 999,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(200,176,255,0.30)' : 'rgba(194,166,248,0.74)',
      ...T.shadows.soft,
    },
    detailPillFill: {
      minHeight: 38,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      backgroundColor: T.surface.soft,
    },
    detailPillText: {
      color: C.primary,
      fontSize: 13.8,
      fontWeight: '800',
      letterSpacing: -0.16,
    },
    pressed: {
      opacity: 0.84,
    },
  });
}
