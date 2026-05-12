import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import type { DecisionHeroModel } from './model';
import { DecisionCompassPremiumBadge } from './DecisionCompassPremiumBadge';
import { getCompassTokens } from './tokens';

interface DecisionInsightHeroProps {
  hero: DecisionHeroModel;
  onPressDetail?: () => void;
}

export function DecisionInsightHero({ hero }: DecisionInsightHeroProps) {
  const { colors, isDark } = useTheme();
  const { t } = useTranslation();
  const T = getCompassTokens(colors, isDark);
  const S = styles(colors, isDark, T);
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={S.shell}>
      <LinearGradient colors={T.hero.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={S.card}>
        <View pointerEvents="none" style={S.topGlow} />
        <View pointerEvents="none" style={S.cloudFront} />

        <Pressable
          onPress={() => setExpanded((v) => !v)}
          style={({ pressed }) => [pressed && S.pressed]}
        >
          <LinearGradient
            colors={isDark ? ['rgba(92,67,176,0.32)', 'rgba(255,255,255,0.08)'] : ['rgba(255,255,255,0.78)', 'rgba(233,223,255,0.44)']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={S.topSectionSurface}
          >
            <View pointerEvents="none" style={S.topSectionGlow} />
            <View pointerEvents="none" style={S.topSectionMist} />

            <View style={S.kickerRow}>
              <DecisionCompassPremiumBadge iconName="sparkles" tone="hero" size="xs" />
              <Text style={S.kicker}>{t('decisionCompassScreen.heroKicker')}</Text>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color={isDark ? '#C4B0F0' : '#7C53DD'}
                style={S.chevron}
              />
            </View>
            <Text style={S.headline}>{hero.headline}</Text>
          </LinearGradient>
        </Pressable>

        {expanded && (
          <LinearGradient
            colors={isDark ? ['rgba(255,255,255,0.84)', 'rgba(244,236,255,0.72)'] : ['rgba(255,255,255,0.98)', 'rgba(248,242,255,0.92)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={S.messageBand}
          >
            <Text style={S.messageText}>{hero.explanation}</Text>
          </LinearGradient>
        )}
      </LinearGradient>
    </View>
  );
}

function styles(
  C: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
  T: ReturnType<typeof getCompassTokens>,
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
      flex: 1,
      color: isDark ? '#E9DDFD' : '#7C53DD',
      fontSize: 14.2,
      fontWeight: '700',
      letterSpacing: 0.28,
    },
    chevron: {
      marginLeft: 'auto',
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
      color: '#2D2538',
      fontSize: 13,
      lineHeight: 18.4,
      fontWeight: '500',
    },
    pressed: {
      opacity: 0.86,
    },
  });
}
