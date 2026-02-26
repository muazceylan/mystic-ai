import React, { useMemo, useState, useCallback } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { buildDailyTheme, scoreContent } from '../engine/recommendationEngine';
import { useNatalChartStore } from '../../store/useNatalChartStore';
import { useContentStore } from '../store/useContentStore';
import { useTheme } from '../../context/ThemeContext';
import { AppHeader } from '../../components/ui';
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
  const { colors, isDark } = useTheme();
  const { chart } = useNatalChartStore();
  const { esmaList, pureDuaList, sureList } = useContentStore();
  const [activeTab, setActiveTab] = useState<Tab>('esma');

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
      style={[s.row, { backgroundColor: isDark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(226,232,240,0.85)' }]}
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
  ), [isDark, colors, handlePressEsma]);

  const renderDuaItem = useCallback(({ item }: { item: ScoredDua }) => (
    <Pressable
      style={[s.row, { backgroundColor: isDark ? 'rgba(30,41,59,0.7)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? 'rgba(148,163,184,0.16)' : 'rgba(226,232,240,0.85)' }]}
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
  ), [isDark, colors, handlePressDua]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'esma', label: 'Esma' },
    { key: 'dua', label: 'Dua' },
    { key: 'sure', label: 'Sure' },
  ];

  return (
    <LinearGradient
      colors={isDark ? ['#0B1A12', '#0F2318', '#0B1A12'] : ['#ECFDF5', '#F0FDF4', '#ECFDF5']}
      style={s.container}
    >
      <AppHeader title="Oneriler" onBack={() => router.back()} transparent />

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
                    ? (isDark ? 'rgba(74,222,128,0.20)' : 'rgba(22,163,74,0.12)')
                    : (isDark ? 'rgba(30,41,59,0.5)' : 'rgba(255,255,255,0.6)'),
                  borderColor: active
                    ? (isDark ? '#4ADE80' : '#16A34A')
                    : (isDark ? 'rgba(148,163,184,0.16)' : 'rgba(226,232,240,0.85)'),
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
          Tema: {theme.tags.slice(0, 3).join(', ')}
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
