import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { useContentStore } from '../store/useContentStore';
import { SafeScreen, AppHeader, HeaderRightIcons } from '../../components/ui';
import type { BreathingTechnique } from '../types';

const ACCENT = '#7C3AED';

const DIFFICULTY_COLOR: Record<string, string> = {
  BEGINNER: '#16A34A',
  INTERMEDIATE: '#D97706',
  ADVANCED: '#DC2626',
};

function formatPattern(p: BreathingTechnique['pattern']): string {
  const parts = [p.inhale, p.hold1, p.exhale, p.hold2].filter(
    (v): v is number => v !== undefined && v !== 0,
  );
  return parts.join('-');
}

export default function BreathingListScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { breathingTechniques } = useContentStore();
  const s = makeStyles(colors, isDark);

  const difficultyLabel: Record<string, string> = {
    BEGINNER: t('spiritual.breathingList.difficultyBeginner'),
    INTERMEDIATE: t('spiritual.breathingList.difficultyIntermediate'),
    ADVANCED: t('spiritual.breathingList.difficultyAdvanced'),
  };

  const renderCard = ({ item }: { item: BreathingTechnique }) => {
    const diffLabel = difficultyLabel[item.difficulty] ?? item.difficulty;
    const diffColor = DIFFICULTY_COLOR[item.difficulty] ?? ACCENT;
    const durationMin = t('spiritual.breathingList.durationMin', { min: Math.floor(item.defaultDurationSec / 60) });
    const patternStr = formatPattern(item.pattern);

    return (
      <Pressable
        style={s.card}
        onPress={() =>
          router.push({
            pathname: '/spiritual/breathing/session',
            params: { id: item.id },
          })
        }
      >
        <View style={s.iconWrap}>
          <Ionicons
            name={item.icon as any}
            size={28}
            color={ACCENT}
          />
        </View>

        <View style={s.cardBody}>
          <Text style={s.cardTitle} numberOfLines={1}>
            {item.titleTr}
          </Text>
          <Text style={s.cardDesc} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={s.metaRow}>
            <View style={[s.badge, { backgroundColor: diffColor + '20' }]}>
              <Text style={[s.badgeText, { color: diffColor }]}>
                {diffLabel}
              </Text>
            </View>

            <View style={s.metaItem}>
              <Ionicons name="time-outline" size={14} color={colors.muted} />
              <Text style={s.metaText}>{durationMin}</Text>
            </View>

            <View style={s.metaItem}>
              <Ionicons name="pulse-outline" size={14} color={colors.muted} />
              <Text style={s.metaText}>{patternStr}</Text>
            </View>
          </View>
        </View>

        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.muted}
          style={s.chevron}
        />
      </Pressable>
    );
  };

  return (
    <SafeScreen style={{ backgroundColor: isDark ? '#1E1B2E' : '#F5F3FF' }}>
      <LinearGradient
        colors={isDark ? ['#1E1B2E', '#2D2640'] : ['#F5F3FF', '#EDE9FE']}
        style={s.flex}
      >
        <AppHeader
        title={t('spiritual.breathingList.title')}
        onBack={() => router.back()}
        transparent
        rightActions={<HeaderRightIcons />}
      />

      <FlatList
        data={breathingTechniques}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
      />
      </LinearGradient>
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    flex: {
      flex: 1,
    },
    list: {
      padding: 16,
      gap: 14,
      paddingBottom: 40,
    },
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : '#FFFFFF',
      borderRadius: 16,
      padding: 16,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(124,58,237,0.2)' : '#E9D5FF',
      shadowColor: '#7C3AED',
      shadowOpacity: isDark ? 0.15 : 0.08,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
      elevation: 4,
    },
    iconWrap: {
      width: 52,
      height: 52,
      borderRadius: 14,
      backgroundColor: isDark ? 'rgba(124,58,237,0.18)' : '#F3E8FF',
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 14,
    },
    cardBody: {
      flex: 1,
      gap: 6,
    },
    cardTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: C.text,
    },
    cardDesc: {
      fontSize: 13,
      lineHeight: 18,
      color: C.subtext,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      marginTop: 4,
    },
    badge: {
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 11,
      fontWeight: '700',
    },
    metaItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
    },
    metaText: {
      fontSize: 12,
      fontWeight: '500',
      color: C.muted,
    },
    chevron: {
      marginLeft: 8,
    },
  });
}
