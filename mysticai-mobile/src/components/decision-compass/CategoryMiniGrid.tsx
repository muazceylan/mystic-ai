import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { DecisionCompassPremiumBadge } from './DecisionCompassPremiumBadge';
import { statusColors } from './palette';
import { statusLabel, type DecisionCategoryModel } from './model';
import { getCompassTokens } from './tokens';
import { StatusPill } from './StatusPill';

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
      <View pointerEvents="none" style={S.sectionGlow} />
      <View pointerEvents="none" style={S.sectionEdge} />

      <View style={S.headerRow}>
        <Text style={S.title}>Diğer Kategoriler</Text>
        {onPressShowAll ? (
          <Pressable onPress={onPressShowAll} style={({ pressed }) => [S.arrowBtn, pressed && S.pressed]}>
            <Ionicons name="chevron-forward" size={18} color={T.text.subtitle} />
          </Pressable>
        ) : null}
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={S.sliderRow}>
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
                <View pointerEvents="none" style={[S.cardGlow, { backgroundColor: tint.soft }]} />
                <View pointerEvents="none" style={S.cardHighlight} />

                <View style={S.topRow}>
                  <DecisionCompassPremiumBadge iconName={category.icon} status={category.status} size="sm" />

                  <View style={S.labelWrap}>
                    <Text style={S.cardTitle} numberOfLines={2}>{category.title}</Text>
                    <Text style={S.subLabel} numberOfLines={2}>{category.subLabel}</Text>
                  </View>

                  <LinearGradient colors={tint.pill} start={{ x: 0, y: 0.5 }} end={{ x: 1, y: 0.5 }} style={S.scoreChip}>
                    <Text style={[S.scoreText, { color: tint.text }]}>{Math.round(category.score)}%</Text>
                  </LinearGradient>
                </View>

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
      </ScrollView>

      {onPressShowAll ? (
        <Pressable onPress={onPressShowAll} style={({ pressed }) => [S.showAllShell, pressed && S.pressed]}>
          <LinearGradient
            colors={T.gradients.pillPrimary as [string, string]}
            start={{ x: 0, y: 0.05 }}
            end={{ x: 1, y: 1 }}
            style={S.showAllBtn}
          >
            <View pointerEvents="none" style={S.showAllGlow} />
            <View pointerEvents="none" style={S.showAllEdge} />

            <View style={S.showAllContent}>
              <DecisionCompassPremiumBadge iconName="apps-outline" tone="hero" size="sm" />

              <View style={S.showAllTextWrap}>
                <Text style={S.showAllMeta}>Tüm Liste</Text>
                <Text style={S.showAllLabel}>Tüm kategorileri gör</Text>
              </View>

              <LinearGradient
                colors={T.chip.selectedGradient as [string, string]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={S.showAllArrowShell}
              >
                <Ionicons name="arrow-forward" size={16} color={colors.primary} />
              </LinearGradient>
            </View>
          </LinearGradient>
        </Pressable>
      ) : null}
    </LinearGradient>
  );
}

function styles(C: ReturnType<typeof useTheme>['colors'], isDark: boolean, T: ReturnType<typeof getCompassTokens>) {
  return StyleSheet.create({
    section: {
      borderRadius: T.radii.card,
      padding: 14,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(216,194,255,0.22)' : 'rgba(200,176,248,0.60)',
      marginBottom: 12,
      gap: 12,
      overflow: 'hidden',
      position: 'relative',
      ...T.shadows.soft,
    },
    sectionGlow: {
      position: 'absolute',
      top: -42,
      right: -24,
      width: 180,
      height: 96,
      borderRadius: 70,
      backgroundColor: isDark ? 'rgba(210,186,255,0.12)' : 'rgba(255,255,255,0.66)',
    },
    sectionEdge: {
      position: 'absolute',
      top: 8,
      left: 14,
      right: 14,
      height: 16,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.48)',
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
    sliderRow: {
      gap: 10,
      paddingRight: 8,
      paddingBottom: 4,
    },
    cardShell: {
      width: 210,
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(218,196,255,0.18)' : 'rgba(204,184,248,0.58)',
      overflow: 'hidden',
    },
    card: {
      minHeight: 134,
      padding: 13,
      justifyContent: 'space-between',
      gap: 12,
      backgroundColor: T.surface.mini,
      position: 'relative',
      overflow: 'hidden',
    },
    cardGlow: {
      position: 'absolute',
      top: -18,
      left: -6,
      width: 118,
      height: 72,
      borderRadius: 40,
      opacity: 0.90,
    },
    cardHighlight: {
      position: 'absolute',
      top: 2,
      left: 10,
      right: 10,
      height: 12,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.50)',
    },
    topRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    labelWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
      paddingTop: 1,
    },
    cardTitle: {
      color: T.text.title,
      fontSize: 14.4,
      fontWeight: '900',
      letterSpacing: -0.22,
      lineHeight: 18.6,
    },
    subLabel: {
      color: T.text.subtitle,
      fontSize: 11.4,
      lineHeight: 14.8,
      fontWeight: '600',
    },
    scoreChip: {
      minWidth: 58,
      minHeight: 28,
      borderRadius: 13,
      paddingHorizontal: 11,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.64)',
      overflow: 'hidden',
      flexShrink: 0,
      marginTop: 1,
    },
    scoreText: {
      fontSize: 12.8,
      fontWeight: '900',
      letterSpacing: -0.2,
    },
    footerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 8,
      marginTop: 'auto',
      minHeight: 28,
    },
    detailHint: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      flexShrink: 0,
    },
    detailHintText: {
      color: C.primary,
      fontSize: 12.3,
      fontWeight: '900',
      letterSpacing: -0.1,
    },
    pressed: {
      opacity: 0.86,
    },
    showAllShell: {
      alignSelf: 'stretch',
      marginTop: 4,
      borderRadius: 22,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(202,178,255,0.42)' : 'rgba(192,164,248,0.78)',
      ...T.shadows.ambient,
    },
    showAllBtn: {
      minHeight: 68,
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    },
    showAllGlow: {
      position: 'absolute',
      top: -28,
      right: -20,
      width: 156,
      height: 84,
      borderRadius: 56,
      backgroundColor: isDark ? 'rgba(222,204,255,0.14)' : 'rgba(255,255,255,0.78)',
    },
    showAllEdge: {
      position: 'absolute',
      top: 1,
      left: 14,
      right: 14,
      height: 15,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.58)',
    },
    showAllContent: {
      minHeight: 68,
      paddingHorizontal: 16,
      paddingVertical: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    showAllTextWrap: {
      flex: 1,
      minWidth: 0,
      gap: 2,
    },
    showAllMeta: {
      color: T.text.subtitle,
      fontSize: 10.8,
      fontWeight: '700',
      letterSpacing: 0.25,
      textTransform: 'uppercase',
    },
    showAllLabel: {
      color: T.text.title,
      fontSize: 15.8,
      fontWeight: '900',
      letterSpacing: -0.24,
    },
    showAllArrowShell: {
      width: 38,
      height: 38,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(216,194,255,0.26)' : 'rgba(198,170,246,0.60)',
    },
  });
}
