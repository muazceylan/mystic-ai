import React from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import type { DecisionHeroModel } from './model';
import { getCompassTokens } from './tokens';

interface DecisionInsightHeroProps {
  hero: DecisionHeroModel;
  onPressDetail: () => void;
}

export function DecisionInsightHero({ hero, onPressDetail }: DecisionInsightHeroProps) {
  const { colors, isDark } = useTheme();
  const { width } = useWindowDimensions();
  const T = getCompassTokens(colors, isDark);
  const compactActions = width <= 460;
  const S = styles(colors, isDark, T, compactActions);
  const strongest = hero.strongCategories[0] ?? 'Günlük odak';

  return (
    <View style={S.shell}>
      <LinearGradient colors={T.hero.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.card}>
        <View pointerEvents="none" style={S.topGlow} />
        <View pointerEvents="none" style={S.cloudFront} />

        <View style={S.topSection}>
          <LinearGradient
            colors={isDark ? ['rgba(92,67,176,0.32)', 'rgba(255,255,255,0.08)'] : ['rgba(255,255,255,0.78)', 'rgba(233,223,255,0.44)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={S.topSectionSurface}
          >
            <View pointerEvents="none" style={S.topSectionGlow} />
            <View pointerEvents="none" style={S.topSectionMist} />

            <View style={S.kickerRow}>
              <Ionicons name="sparkles" size={16} color={isDark ? '#E9DDFD' : '#8A61E8'} />
              <Text style={S.kicker}>GÜNÜN İÇGÖRÜSÜ</Text>
            </View>
            <Text style={S.headline}>{hero.headline}</Text>
          </LinearGradient>
        </View>

        <LinearGradient
          colors={isDark ? ['rgba(255,255,255,0.84)', 'rgba(244,236,255,0.72)'] : ['rgba(255,255,255,0.98)', 'rgba(248,242,255,0.92)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={S.messageBand}
        >
          <Text style={S.messageText}>{hero.explanation}</Text>
        </LinearGradient>

        <LinearGradient
          colors={isDark ? ['rgba(255,255,255,0.38)', 'rgba(255,255,255,0.24)'] : ['rgba(255,255,255,0.84)', 'rgba(252,248,255,0.64)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[S.actionModule, compactActions && S.actionModuleCompact]}
        >
          <View style={S.actionColumn}>
            <View style={S.actionHeader}>
              <Text style={S.actionTitle}>Bugün yap</Text>
              <Ionicons name="chevron-forward" size={15} color={T.text.body} />
            </View>
            {hero.doItems.slice(0, 3).map((item, index) => (
              <View key={`do-${index}`} style={S.actionRow}>
                <View style={S.actionDot}>
                  <Ionicons name="checkmark" size={12} color={colors.primary} />
                </View>
                <Text style={S.actionText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={[S.divider, compactActions && S.dividerCompact]} />

          <View style={S.actionColumn}>
            <View style={S.actionHeader}>
              <Text style={S.actionTitle}>Bugün kaçın</Text>
              <Ionicons name="warning-outline" size={15} color="#E0A545" />
            </View>
            {hero.avoidItems.slice(0, 2).map((item, index) => (
              <View key={`avoid-${index}`} style={S.actionRow}>
                <View style={S.warnDot}>
                  <Ionicons name="ellipse-outline" size={11} color="#B05B86" />
                </View>
                <Text style={S.actionText}>{item}</Text>
              </View>
            ))}
          </View>
        </LinearGradient>

        <View style={S.bottomRow}>
          <View style={S.strongWrap}>
            <Text style={S.bottomStrongLabel}>En güçlü alanlar:</Text>
            <Text style={S.bottomStrongValue} numberOfLines={1}>{strongest}</Text>
          </View>

          <Pressable onPress={onPressDetail} style={({ pressed }) => [S.detailButton, pressed && S.pressed]}>
            <Text style={S.detailText}>Detayı Gör</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        </View>
      </LinearGradient>
    </View>
  );
}

function styles(
  C: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
  T: ReturnType<typeof getCompassTokens>,
  compactActions: boolean,
) {
  return StyleSheet.create({
    shell: {
      marginBottom: 18,
      borderRadius: T.radii.card,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(208,188,255,0.24)' : 'rgba(205,178,246,0.72)',
      ...T.shadows.hero,
    },
    card: {
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 14,
      gap: 10,
      position: 'relative',
    },
    topGlow: {
      position: 'absolute',
      top: -40,
      left: -20,
      width: 220,
      height: 110,
      borderRadius: 56,
      backgroundColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.48)',
    },
    cloudFront: {
      position: 'absolute',
      left: -24,
      right: -12,
      bottom: -10,
      height: 76,
      borderRadius: 38,
      backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,243,253,0.32)',
    },
    topSection: {
      minHeight: 92,
      borderRadius: 22,
      overflow: 'hidden',
    },
    topSectionSurface: {
      position: 'relative',
      overflow: 'hidden',
      paddingHorizontal: 16,
      paddingTop: 13,
      paddingBottom: 15,
      gap: 8,
      borderRadius: 22,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.56)',
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.50)',
    },
    topSectionGlow: {
      position: 'absolute',
      left: -24,
      top: -12,
      width: 210,
      height: 88,
      borderRadius: 50,
      backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.20)',
    },
    topSectionMist: {
      position: 'absolute',
      right: -30,
      top: 8,
      width: 140,
      height: 72,
      borderRadius: 36,
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.14)',
    },
    kickerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
    },
    kicker: {
      color: isDark ? '#E9DDFD' : '#7C53DD',
      fontSize: 14.2,
      fontWeight: '700',
      letterSpacing: 0.28,
    },
    headline: {
      color: isDark ? '#FCF8FF' : '#171220',
      fontSize: 17,
      lineHeight: 23.5,
      fontWeight: '700',
      letterSpacing: -0.2,
      maxWidth: '100%',
    },
    messageBand: {
      borderRadius: 18,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.36)' : 'rgba(255,255,255,0.70)',
      paddingHorizontal: 14,
      paddingVertical: 11,
    },
    messageText: {
      color: isDark ? '#F7F2FD' : '#2D2538',
      fontSize: 13,
      lineHeight: 18.4,
      fontWeight: '500',
    },
    actionModule: {
      borderRadius: 22,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.58)',
      paddingHorizontal: 12,
      paddingVertical: 11,
      flexDirection: 'row',
      gap: 10,
    },
    actionModuleCompact: {
      flexDirection: 'column',
    },
    actionColumn: {
      flex: 1,
      gap: 8,
      minWidth: 0,
      paddingRight: compactActions ? 0 : 2,
    },
    actionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginBottom: 2,
      minHeight: 22,
    },
    actionTitle: {
      color: isDark ? '#FCF8FF' : '#1C1527',
      fontSize: 14,
      fontWeight: '700',
      letterSpacing: -0.08,
      flexShrink: 0,
    },
    divider: {
      width: 1,
      alignSelf: 'stretch',
      backgroundColor: 'rgba(204,188,226,0.72)',
    },
    dividerCompact: {
      width: '100%',
      height: 1,
    },
    actionRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 8,
      minWidth: 0,
    },
    actionDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(240,231,255,0.92)',
      borderWidth: 1,
      borderColor: T.border.soft,
    },
    warnDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,239,247,0.94)',
      borderWidth: 1,
      borderColor: 'rgba(234,192,216,0.72)',
    },
    actionText: {
      flex: 1,
      color: isDark ? '#F2ECFA' : '#342B42',
      fontSize: 12.6,
      lineHeight: 18.4,
      fontWeight: '500',
      minWidth: 0,
      flexShrink: 1,
    },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 2,
    },
    strongWrap: {
      flex: 1,
      minWidth: 0,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    bottomStrongLabel: {
      color: isDark ? '#D9CFF0' : '#6A617C',
      fontSize: 12.4,
      fontWeight: '600',
      flexShrink: 0,
    },
    bottomStrongValue: {
      flex: 1,
      color: isDark ? '#F7F0FF' : '#4C31A1',
      fontSize: 13,
      fontWeight: '700',
      minWidth: 0,
    },
    detailButton: {
      minHeight: 40,
      borderRadius: 20,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(210,186,255,0.40)' : 'rgba(192,165,243,0.78)',
      backgroundColor: isDark ? 'rgba(236,226,255,0.24)' : 'rgba(236,218,255,0.84)',
    },
    detailText: {
      color: C.primary,
      fontSize: 13.5,
      fontWeight: '700',
      letterSpacing: -0.1,
    },
    pressed: {
      opacity: 0.86,
    },
  });
}
