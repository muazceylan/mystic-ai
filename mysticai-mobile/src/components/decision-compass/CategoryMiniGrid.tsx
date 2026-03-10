import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { statusColors } from './palette';
import { statusLabel, type DecisionCategoryModel } from './model';
import { getCompassTokens } from './tokens';
import { StatusPill } from './StatusPill';
import { SoftActionButton } from './SoftActionButton';

interface CategoryMiniGridProps {
  categories: DecisionCategoryModel[];
  onPressCategory: (category: DecisionCategoryModel) => void;
  onPressShowAll?: () => void;
}

export function CategoryMiniGrid({
  categories,
  onPressCategory,
  onPressShowAll,
}: CategoryMiniGridProps) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = styles(colors, isDark, T);

  return (
    <LinearGradient
      colors={T.gradients.section as [string, string]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={S.section}
    >
      {/* Section atmosphere */}
      <View pointerEvents="none" style={S.sectionGlowTop} />
      <View pointerEvents="none" style={S.sectionGlowRight} />
      <View pointerEvents="none" style={S.sectionEdgeShine} />

      {/* Header */}
      <View style={S.headerRow}>
        <Text style={S.title}>Diğer Kategoriler</Text>
        {onPressShowAll ? (
          <Pressable onPress={onPressShowAll} style={({ pressed }) => [S.arrowBtn, pressed && S.pressed]}>
            <Ionicons name="chevron-forward" size={18} color={T.text.subtitle} />
          </Pressable>
        ) : null}
      </View>

      {/* Grid */}
      <View style={S.grid}>
        {categories.map((category) => {
          const tint = statusColors(category.status, isDark);
          return (
            <Pressable
              key={category.id}
              onPress={() => onPressCategory(category)}
              style={({ pressed }) => [S.cardShell, pressed && S.pressed]}
            >
              <LinearGradient
                colors={T.chip.defaultGradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={S.card}
              >
                <View pointerEvents="none" style={S.cardHighlight} />
                <View pointerEvents="none" style={S.cardGlow} />

                {/* Top row: icon + title + score */}
                <View style={S.topRow}>
                  <View style={S.iconGroup}>
                    <LinearGradient
                      colors={isDark
                        ? ['rgba(196,168,255,0.26)', 'rgba(166,136,244,0.16)']
                        : ['rgba(242,234,255,0.99)', 'rgba(230,218,255,0.92)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={S.iconBubble}
                    >
                      <Ionicons name={category.icon} size={15} color={colors.primary} />
                    </LinearGradient>

                    <View style={S.labelWrap}>
                      <Text style={S.cardTitle} numberOfLines={1}>{category.title}</Text>
                      <Text style={S.subLabel} numberOfLines={1}>{category.subLabel}</Text>
                    </View>
                  </View>

                  {/* Score chip */}
                  <LinearGradient colors={tint.pill} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={S.scoreChip}>
                    <Text style={[S.scoreText, { color: tint.text }]}>{Math.round(category.score)}%</Text>
                  </LinearGradient>
                </View>

                {/* Footer: status pill only (clean, like reference) */}
                <View style={S.footerRow}>
                  <StatusPill label={statusLabel(category.status)} textColor={tint.text} gradient={tint.pill} compact />
                  <View style={S.detailHint}>
                    <Text style={S.detailHintText}>Detay</Text>
                    <Ionicons name="chevron-forward" size={12} color={colors.primary} />
                  </View>
                </View>
              </LinearGradient>
            </Pressable>
          );
        })}
      </View>

      {/* Show all button */}
      {onPressShowAll ? (
        <SoftActionButton
          label="Tüm kategorileri gör"
          onPress={onPressShowAll}
          gradient={T.gradients.pillPrimary as [string, string]}
          borderColor={isDark ? 'rgba(202,178,255,0.42)' : 'rgba(192,164,248,0.78)'}
          textColor={colors.primary}
          iconColor={colors.primary}
          large
          style={S.showAllBtn}
        />
      ) : null}
    </LinearGradient>
  );
}

function styles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean, T: ReturnType<typeof getCompassTokens>) {
  return StyleSheet.create({
    section: {
      borderRadius: T.radii.card,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(216,194,255,0.22)' : 'rgba(200,176,248,0.60)',
      marginBottom: 12,
      gap: 13,
      overflow: 'hidden',
      position: 'relative',
      shadowColor: isDark ? '#000000' : '#C2A8EE',
      shadowOpacity: isDark ? 0.28 : 0.16,
      shadowRadius: isDark ? 24 : 20,
      shadowOffset: { width: 0, height: isDark ? 14 : 12 },
      elevation: isDark ? 7 : 5,
    },
    sectionGlowTop: {
      position: 'absolute',
      top: -68,
      right: -32,
      width: 208,
      height: 138,
      borderRadius: 86,
      backgroundColor: isDark ? 'rgba(210,186,255,0.14)' : 'rgba(255,255,255,0.76)',
    },
    sectionGlowRight: {
      position: 'absolute',
      right: -20,
      top: 34,
      width: 150,
      height: 110,
      borderRadius: 68,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(252,248,255,0.60)',
    },
    sectionEdgeShine: {
      position: 'absolute',
      top: 8,
      left: 16,
      right: 16,
      height: 18,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.52)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    title: {
      color: T.text.title,
      fontSize: 17,
      fontWeight: '900',
      letterSpacing: -0.35,
    },
    arrowBtn: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: T.border.soft,
      backgroundColor: T.surface.soft,
      ...T.shadows.soft,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      rowGap: 10,
    },
    cardShell: {
      width: '48.4%',
      borderRadius: 20,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(218,196,255,0.18)' : 'rgba(204,184,248,0.58)',
      overflow: 'hidden',
      shadowColor: isDark ? '#000000' : '#BAA0EE',
      shadowOpacity: isDark ? 0.20 : 0.12,
      shadowRadius: isDark ? 14 : 12,
      shadowOffset: { width: 0, height: isDark ? 8 : 6 },
      elevation: isDark ? 4 : 3,
    },
    card: {
      minHeight: 134,
      padding: 12,
      justifyContent: 'space-between',
      gap: 9,
      backgroundColor: T.surface.mini,
      position: 'relative',
    },
    cardHighlight: {
      position: 'absolute',
      top: 2,
      left: 10,
      right: 10,
      height: 13,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.52)',
    },
    cardGlow: {
      position: 'absolute',
      top: -18,
      right: -14,
      width: 76,
      height: 56,
      borderRadius: 38,
      backgroundColor: isDark ? 'rgba(208,186,255,0.10)' : 'rgba(242,234,255,0.72)',
    },
    topRow: {
      gap: 8,
    },
    iconGroup: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    iconBubble: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(196,168,255,0.28)' : 'rgba(216,200,255,0.66)',
    },
    labelWrap: {
      flex: 1,
      minWidth: 0,
      gap: 1,
    },
    cardTitle: {
      color: T.text.title,
      fontSize: 15.5,
      fontWeight: '900',
      letterSpacing: -0.25,
    },
    subLabel: {
      color: T.text.subtitle,
      fontSize: 12,
      fontWeight: '600',
    },
    scoreChip: {
      alignSelf: 'flex-start',
      minHeight: 26,
      borderRadius: 13,
      paddingHorizontal: 10,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.64)',
      overflow: 'hidden',
    },
    scoreText: {
      fontSize: 12.5,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
    },
    detailHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 1,
    },
    detailHintText: {
      color: C.primary,
      fontSize: 14,
      fontWeight: '900',
      letterSpacing: -0.1,
    },
    showAllBtn: {
      alignSelf: 'stretch',
      justifyContent: 'center',
    },
    pressed: {
      opacity: 0.86,
    },
  });
}
