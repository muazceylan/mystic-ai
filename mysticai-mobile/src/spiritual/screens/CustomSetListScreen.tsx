/**
 * CustomSetListScreen — Ruhsal Çantam
 */
import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../utils/haptics';
import { useCustomSetStore } from '../store/useCustomSetStore';
import { useContentStore } from '../store/useContentStore';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SafeScreen, AppHeader, HeaderRightIcons } from '../../components/ui';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOW } from '../../constants/tokens';
import type { CustomSet, CustomSetItem } from '../types';

/* ─── Icon per item type ─── */
const ITEM_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; darkColor: string }> = {
  esma: { icon: 'sparkles-outline', color: '#16A34A', darkColor: '#4ADE80' },
  dua: { icon: 'book-outline', color: '#4F46E5', darkColor: '#818CF8' },
  sure: { icon: 'library-outline', color: '#D97706', darkColor: '#FCD34D' },
};

export default function CustomSetListScreen() {
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark);
  const { sets, createSet, deleteSet, renameSet } = useCustomSetStore();
  const { getEsmaById, getDuaById } = useContentStore();

  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');

  /* accent — mor tema */
  const accent = isDark ? '#A78BFA' : '#7C3AED';
  const accentSoft = isDark ? 'rgba(167,139,250,0.14)' : 'rgba(124,58,237,0.08)';

  const handleCreate = useCallback(() => {
    const trimmed = inputText.trim();
    if (!trimmed) return;
    createSet(trimmed);
    setInputText('');
    setIsCreating(false);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [inputText, createSet]);

  const handleRename = useCallback(() => {
    if (!editingId) return;
    const trimmed = inputText.trim();
    if (!trimmed) return;
    renameSet(editingId, trimmed);
    setEditingId(null);
    setInputText('');
  }, [editingId, inputText, renameSet]);

  const handleDelete = useCallback((set: CustomSet) => {
    Alert.alert(
      'Seti Sil',
      `"${set.name}" setini silmek istediğinize emin misiniz?`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: () => {
            deleteSet(set.id);
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          },
        },
      ],
    );
  }, [deleteSet]);

  const startRename = useCallback((set: CustomSet) => {
    setEditingId(set.id);
    setInputText(set.name);
    setIsCreating(false);
  }, []);

  /* resolve first 3 item names for preview */
  const getPreviewItems = useCallback(
    (items: CustomSetItem[]): string[] => {
      return items.slice(0, 3).map((it) => {
        if (it.itemType === 'esma') {
          return getEsmaById(it.itemId)?.nameTr ?? 'Esma';
        }
        return getDuaById(it.itemId)?.title ?? 'Dua';
      });
    },
    [getEsmaById, getDuaById],
  );

  /* count items by type */
  const getTypeCounts = useCallback((items: CustomSetItem[]) => {
    const counts: Record<string, number> = {};
    for (const it of items) {
      counts[it.itemType] = (counts[it.itemType] ?? 0) + 1;
    }
    return counts;
  }, []);

  const cancelInput = useCallback(() => {
    setIsCreating(false);
    setEditingId(null);
    setInputText('');
  }, []);

  /* ─── Render set card ─── */
  const renderSet = ({ item }: { item: CustomSet }) => {
    const isEditing = editingId === item.id;
    const previews = getPreviewItems(item.items);
    const typeCounts = getTypeCounts(item.items);
    const isEmpty = item.items.length === 0;

    return (
      <Pressable
        style={({ pressed }) => [
          S.card,
          pressed && !isEditing && { opacity: 0.88, transform: [{ scale: 0.985 }] },
        ]}
        onPress={() => {
          if (isEditing) return;
          router.push({ pathname: '/spiritual/custom-sets/[id]', params: { id: item.id } });
        }}
        onLongPress={() => {
          if (isEditing) return;
          Alert.alert(item.name, undefined, [
            { text: 'Yeniden Adlandır', onPress: () => startRename(item) },
            { text: 'Sil', style: 'destructive', onPress: () => handleDelete(item) },
            { text: 'Vazgeç', style: 'cancel' },
          ]);
        }}
      >
        {/* Card header */}
        <View style={S.cardHeader}>
          <View style={[S.cardIcon, { backgroundColor: accentSoft }]}>
            <Ionicons name="sparkles" size={18} color={accent} />
          </View>
          <View style={S.cardHeaderText}>
            {isEditing ? (
              <View style={S.renameRow}>
                <TextInput
                  style={[S.renameInput, { color: colors.text, borderColor: accent + '55' }]}
                  value={inputText}
                  onChangeText={setInputText}
                  autoFocus
                  onSubmitEditing={handleRename}
                  returnKeyType="done"
                  selectTextOnFocus
                />
                <Pressable onPress={handleRename} hitSlop={8}>
                  <Ionicons name="checkmark-circle" size={24} color={accent} />
                </Pressable>
                <Pressable onPress={cancelInput} hitSlop={8}>
                  <Ionicons name="close-circle" size={24} color={colors.muted} />
                </Pressable>
              </View>
            ) : (
              <>
                <Text style={S.cardName} numberOfLines={1}>{item.name}</Text>
                <Text style={S.cardDate}>
                  {item.items.length} öğe
                </Text>
              </>
            )}
          </View>
          {!isEditing && (
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          )}
        </View>

        {/* Type badges */}
        {!isEmpty && !isEditing && (
          <View style={S.typeBadges}>
            {Object.entries(typeCounts).map(([type, count]) => {
              const meta = ITEM_ICONS[type] ?? ITEM_ICONS.dua;
              const clr = isDark ? meta.darkColor : meta.color;
              return (
                <View key={type} style={[S.typeBadge, { backgroundColor: clr + '14', borderColor: clr + '22' }]}>
                  <Ionicons name={meta.icon} size={12} color={clr} />
                  <Text style={[S.typeBadgeText, { color: clr }]}>
                    {count} {type === 'esma' ? 'Esma' : type === 'sure' ? 'Sure' : 'Dua'}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Preview items */}
        {!isEmpty && !isEditing && previews.length > 0 && (
          <View style={S.previewRow}>
            {previews.map((name, i) => (
              <View key={i} style={S.previewChip}>
                <View style={[S.previewDot, { backgroundColor: accent + '66' }]} />
                <Text style={S.previewText} numberOfLines={1}>{name}</Text>
              </View>
            ))}
            {item.items.length > 3 && (
              <Text style={S.previewMore}>+{item.items.length - 3}</Text>
            )}
          </View>
        )}

        {/* Empty state inline */}
        {isEmpty && !isEditing && (
          <View style={S.cardEmptyRow}>
            <Ionicons name="add-circle-outline" size={14} color={colors.muted} />
            <Text style={S.cardEmptyText}>Esma veya dua ekleyin</Text>
          </View>
        )}
      </Pressable>
    );
  };

  /* ─── Global empty state ─── */
  const renderEmpty = () => (
    <View style={S.emptyWrap}>
      <View style={[S.emptyIconWrap, { backgroundColor: accentSoft }]}>
        <Ionicons name="sparkles-outline" size={40} color={accent} />
      </View>
      <Text style={S.emptyTitle}>Henüz set oluşturmadınız</Text>
      <Text style={S.emptySub}>
        Kendi dua ve esma koleksiyonlarınızı oluşturun, günlük pratiklerinizi kişiselleştirin.
      </Text>
      <Pressable
        style={({ pressed }) => [
          S.emptyCta,
          { backgroundColor: accent },
          pressed && { opacity: 0.85 },
        ]}
        onPress={() => { setIsCreating(true); setInputText(''); }}
      >
        <Ionicons name="add" size={18} color="#FFF" />
        <Text style={S.emptyCtaText}>İlk Setini Oluştur</Text>
      </Pressable>
    </View>
  );

  return (
    <SafeScreen>
      <AppHeader title="Ruhsal Çantam" onBack={() => router.back()} rightActions={<HeaderRightIcons />} />

      {/* ─── Stats strip ─── */}
      {sets.length > 0 && (
        <View style={S.statsRow}>
          <View style={S.statItem}>
            <Text style={S.statValue}>{sets.length}</Text>
            <Text style={S.statLabel}>Set</Text>
          </View>
          <View style={[S.statDivider, { backgroundColor: colors.border }]} />
          <View style={S.statItem}>
            <Text style={S.statValue}>
              {sets.reduce((sum, s) => sum + s.items.length, 0)}
            </Text>
            <Text style={S.statLabel}>Öğe</Text>
          </View>
          <View style={[S.statDivider, { backgroundColor: colors.border }]} />
          <View style={S.statItem}>
            <Text style={S.statValue}>
              {sets.reduce((sum, s) => sum + s.items.filter((i) => i.itemType === 'esma').length, 0)}
            </Text>
            <Text style={S.statLabel}>Esma</Text>
          </View>
        </View>
      )}

      {/* ─── Create input ─── */}
      {isCreating && (
        <View style={S.createSection}>
          <View style={S.createRow}>
            <View style={[S.createIcon, { backgroundColor: accentSoft }]}>
              <Ionicons name="add-circle" size={16} color={accent} />
            </View>
            <TextInput
              style={[S.createInput, { color: colors.text }]}
              placeholder="Set adı girin..."
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              autoFocus
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            <Pressable
              onPress={handleCreate}
              hitSlop={8}
              style={({ pressed }) => [
                S.createConfirm,
                { backgroundColor: inputText.trim() ? accent : colors.border },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="checkmark" size={18} color="#FFF" />
            </Pressable>
            <Pressable onPress={cancelInput} hitSlop={8}>
              <Ionicons name="close" size={20} color={colors.muted} />
            </Pressable>
          </View>
        </View>
      )}

      {/* ─── Set list ─── */}
      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        renderItem={renderSet}
        contentContainerStyle={S.listContent}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      />

      {/* ─── FAB ─── */}
      {sets.length > 0 && !isCreating && (
        <Pressable
          style={({ pressed }) => [
            S.fab,
            { backgroundColor: accent },
            pressed && { opacity: 0.85, transform: [{ scale: 0.92 }] },
          ]}
          onPress={() => { setIsCreating(true); setInputText(''); }}
        >
          <Ionicons name="add" size={26} color="#FFF" />
        </Pressable>
      )}
    </SafeScreen>
  );
}

/* ─── Styles ─── */
function makeStyles(C: ThemeColors, isDark: boolean) {
  const accent = isDark ? '#A78BFA' : '#7C3AED';

  return StyleSheet.create({
    /* Stats */
    statsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginHorizontal: SPACING.lgXl,
      marginBottom: SPACING.md,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.lg,
      backgroundColor: isDark ? 'rgba(30,41,59,0.55)' : C.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.12)' : C.border,
    },
    statItem: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '800',
      color: accent,
      letterSpacing: -0.5,
    },
    statLabel: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.subtext,
      textTransform: 'uppercase',
      letterSpacing: 0.8,
    },
    statDivider: {
      width: 1,
      height: 28,
    },

    /* Create */
    createSection: {
      paddingHorizontal: SPACING.lgXl,
      marginBottom: SPACING.md,
    },
    createRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.smMd,
      backgroundColor: isDark ? 'rgba(30,41,59,0.70)' : C.surface,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.16)' : C.border,
      borderRadius: RADIUS.lg,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.smMd,
    },
    createIcon: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    createInput: {
      flex: 1,
      ...TYPOGRAPHY.Body,
      paddingVertical: SPACING.xs,
    },
    createConfirm: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },

    /* List */
    listContent: {
      paddingHorizontal: SPACING.lgXl,
      paddingBottom: 100,
      gap: SPACING.smMd,
    },

    /* Card */
    card: {
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(148,163,184,0.12)' : C.border,
      backgroundColor: isDark ? 'rgba(30,41,59,0.60)' : C.surface,
      padding: SPACING.mdLg,
      gap: SPACING.smMd,
      ...SHADOW.sm,
    },
    cardHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.md,
    },
    cardIcon: {
      width: 38,
      height: 38,
      borderRadius: RADIUS.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cardHeaderText: {
      flex: 1,
      gap: 2,
    },
    cardName: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    cardDate: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.subtext,
    },

    /* Rename inline */
    renameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    renameInput: {
      flex: 1,
      ...TYPOGRAPHY.Body,
      borderBottomWidth: 1.5,
      paddingVertical: 2,
    },

    /* Type badges */
    typeBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: SPACING.smMd,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      borderWidth: 1,
    },
    typeBadgeText: {
      ...TYPOGRAPHY.CaptionBold,
    },

    /* Preview */
    previewRow: {
      flexDirection: 'row',
      alignItems: 'center',
      flexWrap: 'wrap',
      gap: SPACING.sm,
    },
    previewChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
    },
    previewDot: {
      width: 4,
      height: 4,
      borderRadius: 2,
    },
    previewText: {
      ...TYPOGRAPHY.CaptionSmall,
      color: C.subtext,
      maxWidth: 100,
    },
    previewMore: {
      ...TYPOGRAPHY.CaptionBold,
      color: C.muted,
    },

    /* Card empty inline */
    cardEmptyRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: SPACING.xs,
    },
    cardEmptyText: {
      ...TYPOGRAPHY.Caption,
      color: C.muted,
      fontStyle: 'italic',
    },

    /* Global empty */
    emptyWrap: {
      alignItems: 'center',
      paddingTop: 80,
      paddingHorizontal: SPACING.xxl,
      gap: SPACING.md,
    },
    emptyIconWrap: {
      width: 72,
      height: 72,
      borderRadius: 36,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.sm,
    },
    emptyTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
      textAlign: 'center',
    },
    emptySub: {
      ...TYPOGRAPHY.Body,
      color: C.subtext,
      textAlign: 'center',
      lineHeight: 22,
    },
    emptyCta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.xl,
      borderRadius: RADIUS.full,
      marginTop: SPACING.sm,
    },
    emptyCtaText: {
      ...TYPOGRAPHY.BodyBold,
      color: '#FFF',
    },

    /* FAB */
    fab: {
      position: 'absolute',
      bottom: Platform.OS === 'ios' ? 110 : 90,
      right: SPACING.lgXl,
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems: 'center',
      justifyContent: 'center',
      ...SHADOW.lg,
    },
  });
}
