import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { buildDailyTheme, scoreContent } from '../engine/recommendationEngine';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { useContentStore } from '../store/useContentStore';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen, AppHeader, HeaderRightIcons } from '../../components/ui';
import { platformColor } from '../../theme';
import type { EsmaItem, DuaItem } from '../types';

type Tab = 'esma' | 'dua' | 'sure';

interface ScoredEsma {
  item: EsmaItem;
  score: number;
}

interface ScoredDua {
  item: DuaItem;
  score: number;
}

export default function AllRecommendationsScreen() {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const { chart } = useNatalChartStore();
  const { esmaList, pureDuaList, sureList } = useContentStore();
  const [activeTab, setActiveTab] = useState<Tab>('esma');
  const rowBg = isDark
    ? platformColor('rgba(30,41,59,0.7)', colors.card)
    : platformColor('rgba(255,255,255,0.85)', colors.surface);
  const rowBorder = isDark
    ? platformColor('rgba(148,163,184,0.16)', colors.border)
    : platformColor('rgba(226,232,240,0.85)', colors.border);
  const inactiveTabBg = isDark
    ? platformColor('rgba(30,41,59,0.5)', colors.card)
    : platformColor('rgba(255,255,255,0.6)', colors.surface);
  const activeTabBg = isDark
    ? platformColor('rgba(74,222,128,0.20)', 'rgba(74,222,128,0.12)')
    : platformColor('rgba(22,163,74,0.12)', '#ECFDF3');

  const theme = useMemo(() => buildDailyTheme(chart), [chart]);

  const scoredEsma = useMemo<ScoredEsma[]>(() => {
    return esmaList
      .map((item) => ({ item, score: scoreContent(item.tags, theme.tags, theme.score) }))
      .sort((a, b) => b.score - a.score);
  }, [esmaList, theme]);

  const scoredDua = useMemo<ScoredDua[]>(() => {
    return pureDuaList
      .map((item) => ({ item, score: scoreContent(item.tags, theme.tags, theme.score) }))
      .sort((a, b) => b.score - a.score);
  }, [pureDuaList, theme]);

  const scoredSure = useMemo<ScoredDua[]>(() => {
    return sureList
      .map((item) => ({ item, score: scoreContent(item.tags, theme.tags, theme.score) }))
      .sort((a, b) => b.score - a.score);
  }, [sureList, theme]);

  const handlePressEsma = useCallback((id: number) => {
    router.push({ pathname: '/spiritual/asma/[id]', params: { id } });
  }, []);

  const handlePressDua = useCallback((id: number) => {
    router.push({ pathname: '/spiritual/dua/[id]', params: { id } });
  }, []);

  const renderEsmaItem = useCallback(({ item }: { item: ScoredEsma }) => (
    <Pressable
      style={[s.row, { backgroundColor: rowBg, borderColor: rowBorder }]}
      onPress={() => handlePressEsma(item.item.id)}
    >
      <View style={s.rowLeft}>
        <Text style={[s.rowName, { color: colors.text }]}>{item.item.nameTr}</Text>
        <Text style={[s.rowSub, { color: colors.subtext }]}>{item.item.shortBenefit}</Text>
      </View>
      <View style={[s.scoreBadge, { backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.10)' }]}>
        <Text style={[s.scoreText, { color: isDark ? '#4ADE80' : '#16A34A' }]}>{item.score}</Text>
      </View>
    </Pressable>
  ), [colors, handlePressEsma, rowBg, rowBorder]);

  const renderDuaItem = useCallback(({ item }: { item: ScoredDua }) => (
    <Pressable
      style={[s.row, { backgroundColor: rowBg, borderColor: rowBorder }]}
      onPress={() => handlePressDua(item.item.id)}
    >
      <View style={s.rowLeft}>
        <Text style={[s.rowName, { color: colors.text }]}>{item.item.title}</Text>
        <Text style={[s.rowSub, { color: colors.subtext }]}>{item.item.shortBenefit}</Text>
      </View>
      <View style={[s.scoreBadge, { backgroundColor: isDark ? 'rgba(74,222,128,0.15)' : 'rgba(22,163,74,0.10)' }]}>
        <Text style={[s.scoreText, { color: isDark ? '#4ADE80' : '#16A34A' }]}>{item.score}</Text>
      </View>
    </Pressable>
  ), [colors, handlePressDua, rowBg, rowBorder]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'esma', label: t('spiritual.tabs.esma') },
    { key: 'dua', label: t('spiritual.tabs.dua') },
    { key: 'sure', label: t('spiritual.tabs.sure') },
  ];

  return (
    <SafeScreen style={{ backgroundColor: isDark ? '#0B1A12' : '#ECFDF5' }}>
      <LinearGradient
        colors={isDark ? ['#0B1A12', '#0F2318', '#0B1A12'] : ['#ECFDF5', '#F0FDF4', '#ECFDF5']}
        style={s.container}
      >
        <AppHeader title={t('spiritual.allRecommendations.title')} transparent rightActions={<HeaderRightIcons />} />

      <View style={s.tabRow}>
        {tabs.map((tab) => {
          const active = activeTab === tab.key;
          return (
            <Pressable
              key={tab.key}
              style={[
                s.tabPill,
                {
                  backgroundColor: active
                    ? activeTabBg
                    : inactiveTabBg,
                  borderColor: active
                    ? (isDark ? '#4ADE80' : '#16A34A')
                    : rowBorder,
                },
              ]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text
                style={[
                  s.tabText,
                  { color: active ? (isDark ? '#4ADE80' : '#16A34A') : colors.subtext },
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={s.themeInfo}>
        <Ionicons name="sparkles-outline" size={12} color={isDark ? '#86EFAC' : '#166534'} />
        <Text style={[s.themeText, { color: isDark ? '#86EFAC' : '#166534' }]}>
          {t('spiritual.allRecommendations.themeLabel', { tags: theme.tags.slice(0, 3).join(', ') })}
        </Text>
      </View>

      {activeTab === 'esma' && (
        <FlatList
          data={scoredEsma}
          keyExtractor={(item) => String(item.item.id)}
          renderItem={renderEsmaItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {activeTab === 'dua' && (
        <FlatList
          data={scoredDua}
          keyExtractor={(item) => String(item.item.id)}
          renderItem={renderDuaItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {activeTab === 'sure' && (
        <FlatList
          data={scoredSure}
          keyExtractor={(item) => String(item.item.id)}
          renderItem={renderDuaItem}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
        />
      )}
      </LinearGradient>
    </SafeScreen>
  );
}

const s = StyleSheet.create({
  container: {
    flex: 1,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 20,
    marginTop: 4,
    marginBottom: 8,
  },
  tabPill: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '700',
  },
  themeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  themeText: {
    fontSize: 11,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  rowLeft: {
    flex: 1,
    gap: 2,
  },
  rowName: {
    fontSize: 14,
    fontWeight: '700',
  },
  rowSub: {
    fontSize: 12,
    lineHeight: 16,
  },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    marginLeft: 8,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '800',
  },
});
