/**
 * RoutinePickerScreen — Ruhsal çantadan aktif rutin seçimi
 */
import React from 'react';
import { View, Text, FlatList, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';
import { useCustomSetStore } from '../store/useCustomSetStore';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOW } from '../../constants/tokens';
import type { CustomSet, SpiritualItemType } from '../types';

const TYPE_BADGE: Record<SpiritualItemType, { label: string; color: string; darkColor: string }> = {
  esma: { label: 'Esma', color: '#B45309', darkColor: '#FBBF24' },
  dua: { label: 'Dua', color: '#4F46E5', darkColor: '#818CF8' },
  sure: { label: 'Sure', color: '#7C3AED', darkColor: '#A78BFA' },
};

export default function RoutinePickerScreen() {
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark);

  const sets = useCustomSetStore((s) => s.sets);
  const activeRoutineSetId = useCustomSetStore((s) => s.activeRoutineSetId);
  const setActiveRoutine = useCustomSetStore((s) => s.setActiveRoutine);

  const handleSelect = (setId: string) => {
    setActiveRoutine(activeRoutineSetId === setId ? null : setId);
    router.back();
  };

  const getUniqueTypes = (set: CustomSet): SpiritualItemType[] => {
    const types = new Set(set.items.map((i) => i.itemType));
    return Array.from(types);
  };

  const renderItem = ({ item }: { item: CustomSet }) => {
    const isActive = item.id === activeRoutineSetId;
    const types = getUniqueTypes(item);

    return (
      <Pressable
        style={({ pressed }) => [
          S.setCard,
          isActive && S.setCardActive,
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => handleSelect(item.id)}
      >
        <View style={S.setCardContent}>
          <View style={S.setInfo}>
            <Text style={S.setName} numberOfLines={1}>{item.name}</Text>
            <View style={S.setMeta}>
              <Text style={S.setCount}>{item.items.length} öğe</Text>
              {types.map((t) => (
                <View key={t} style={[S.badge, { backgroundColor: (isDark ? TYPE_BADGE[t].darkColor : TYPE_BADGE[t].color) + '18' }]}>
                  <Text style={[S.badgeText, { color: isDark ? TYPE_BADGE[t].darkColor : TYPE_BADGE[t].color }]}>
                    {TYPE_BADGE[t].label}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          {isActive && (
            <View style={S.checkWrap}>
              <Ionicons name="checkmark-circle" size={24} color={isDark ? '#818CF8' : '#6366F1'} />
            </View>
          )}
        </View>
      </Pressable>
    );
  };

  const EmptyState = () => (
    <View style={S.emptyWrap}>
      <Ionicons name="bag-outline" size={48} color={colors.subtext + '60'} />
      <Text style={S.emptyTitle}>Henüz liste yok</Text>
      <Text style={S.emptySub}>Ruhsal çantana öğe ekleyerek bir liste oluştur</Text>
      <Pressable
        style={({ pressed }) => [S.createBtn, pressed && { opacity: 0.85 }]}
        onPress={() => router.push('/spiritual/custom-sets')}
      >
        <Ionicons name="add" size={18} color="#FFF" />
        <Text style={S.createBtnText}>Liste Oluştur</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeScreen>
      {/* Header */}
      <View style={S.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={S.headerTitle}>Rutin Belirle</Text>
        <View style={{ width: 34 }} />
      </View>

      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={S.list}
        ListEmptyComponent={EmptyState}
        ListFooterComponent={
          sets.length > 0 ? (
            <Pressable
              style={({ pressed }) => [S.newListBtn, pressed && { opacity: 0.85 }]}
              onPress={() => router.push('/spiritual/custom-sets')}
            >
              <Ionicons name="add-circle-outline" size={18} color={isDark ? '#818CF8' : '#6366F1'} />
              <Text style={S.newListBtnText}>Yeni Liste Oluştur</Text>
            </Pressable>
          ) : null
        }
      />
    </SafeScreen>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.md,
    },
    backBtn: {
      width: 34,
      height: 34,
      borderRadius: 17,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark ? 'rgba(30,41,59,0.6)' : 'rgba(241,245,249,0.9)',
    },
    headerTitle: {
      ...TYPOGRAPHY.BodyLarge,
      color: C.text,
      letterSpacing: -0.3,
    },
    list: {
      paddingHorizontal: SPACING.md,
      paddingBottom: SPACING.xl,
      gap: SPACING.smMd,
    },
    setCard: {
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.14)' : C.border,
      backgroundColor: isDark ? 'rgba(30,41,59,0.65)' : C.surface,
      padding: SPACING.mdLg,
      ...SHADOW.sm,
    },
    setCardActive: {
      borderColor: isDark ? 'rgba(129,140,248,0.4)' : 'rgba(99,102,241,0.35)',
      backgroundColor: isDark ? 'rgba(99,102,241,0.08)' : 'rgba(99,102,241,0.04)',
    },
    setCardContent: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    setInfo: {
      flex: 1,
      gap: SPACING.xs,
    },
    setName: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    setMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      flexWrap: 'wrap',
    },
    setCount: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
    },
    badge: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 6,
    },
    badgeText: {
      fontSize: 10,
      fontWeight: '700',
    },
    checkWrap: {
      marginLeft: SPACING.md,
    },
    emptyWrap: {
      alignItems: 'center',
      paddingTop: 80,
      gap: SPACING.md,
    },
    emptyTitle: {
      ...TYPOGRAPHY.BodyLarge,
      color: C.text,
    },
    emptySub: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      textAlign: 'center',
      paddingHorizontal: SPACING.xl,
    },
    createBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.md,
      paddingHorizontal: SPACING.lg,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.md,
      backgroundColor: isDark ? '#6366F1' : '#4F46E5',
    },
    createBtnText: {
      ...TYPOGRAPHY.SmallBold,
      color: '#FFF',
    },
    newListBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      marginTop: SPACING.md,
      paddingVertical: SPACING.mdLg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: isDark ? 'rgba(129,140,248,0.3)' : 'rgba(99,102,241,0.25)',
    },
    newListBtnText: {
      ...TYPOGRAPHY.SmallBold,
      color: isDark ? '#818CF8' : '#6366F1',
    },
  });
}
