/**
 * CustomSetDetailScreen — Set detay, rutin takip, öğe yönetimi
 */
import React, { useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../../utils/haptics';
import { useCustomSetStore } from '../store/useCustomSetStore';
import { useContentStore } from '../store/useContentStore';
import { useJournalStore } from '../store/useJournalStore';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SafeScreen, HeaderRightIcons, useBottomTabBarOffset } from '../../components/ui';
import { useBackNavigation } from '../../hooks/useBackNavigation';
import { ProgressRing } from '../components/ProgressRing';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOW } from '../../constants/tokens';
import { platformColor } from '../../theme';
import type { CustomSetItem, SpiritualItemType } from '../types';
import { useBottomSheetDragGesture } from '../../components/ui/useBottomSheetDragGesture';

type AddTab = 'esma' | 'dua' | 'sure';

type TypeMetaItem = { icon: keyof typeof Ionicons.glyphMap; color: string; darkColor: string; label: string; };

export default function CustomSetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();

  const TYPE_META: Record<string, TypeMetaItem> = {
    esma: { icon: 'sparkles-outline', color: '#B45309', darkColor: '#FBBF24', label: t('spiritual.tabs.esma') },
    dua: { icon: 'book-outline', color: '#4F46E5', darkColor: '#818CF8', label: t('spiritual.tabs.dua') },
    sure: { icon: 'library-outline', color: '#7C3AED', darkColor: '#A78BFA', label: t('spiritual.tabs.sure') },
  };
  const { colors, isDark } = useTheme();
  const { bottomTabBarOffset } = useBottomTabBarOffset();
  const S = makeStyles(colors, isDark);
  const goBack = useBackNavigation();

  const {
    getSetById, renameSet, removeItem,
    reorderItems, addItem, isItemInSet, updateItemTarget,
  } = useCustomSetStore();
  const {
    getEsmaById, getDuaById,
    searchEsma, sureList, pureDuaList,
  } = useContentStore();

  const set = getSetById(id ?? '');
  const journalEntries = useJournalStore((st) => st.entries);

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(set?.name ?? '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<AddTab>('esma');
  const [addSearch, setAddSearch] = useState('');
  const [isEditMode, setIsEditMode] = useState(false);
  /** Per-item target count overrides in the add modal: "esma-3" → 99 */
  const [addItemCounts, setAddItemCounts] = useState<Record<string, number>>({});
  /** Which item's count picker is expanded: "esma-3" or null */
  const [expandedCountPicker, setExpandedCountPicker] = useState<string | null>(null);
  /** Custom count text input in the add modal count picker row */
  const [customCountText, setCustomCountText] = useState('');
  /** Which item's target is being edited inline: "esma-3" or null */
  const [editingTargetKey, setEditingTargetKey] = useState<string | null>(null);
  const [editingTargetValue, setEditingTargetValue] = useState('');
  const closeAddModal = useCallback(() => setShowAddModal(false), []);
  const { animatedStyle: addModalAnimatedStyle, gesture: addModalGesture } = useBottomSheetDragGesture({
    enabled: showAddModal,
    onClose: closeAddModal,
  });

  /* ─── Accent ─── */
  const accent = isDark ? '#A78BFA' : '#7C3AED';
  const accentSoft = isDark ? 'rgba(167,139,250,0.14)' : 'rgba(124,58,237,0.08)';
  const doneColor = isDark ? '#4ADE80' : '#16A34A';
  const primaryCta = colors.primary;

  /* ─── Resolve item info ─── */
  const resolveItem = useCallback(
    (item: CustomSetItem) => {
      if (item.itemType === 'esma') {
        const esma = getEsmaById(item.itemId);
        return {
          name: esma?.nameTr ?? t('spiritual.customSet.unknownEsma'),
          arabic: esma?.nameAr ?? '',
          sub: esma?.meaningTr ?? '',
          target: item.targetCount ?? esma?.defaultTargetCount ?? 33,
        };
      }
      const dua = getDuaById(item.itemId);
      return {
        name: dua?.title ?? t('spiritual.customSet.unknownDua'),
        arabic: dua?.arabic ? dua.arabic.slice(0, 40) : '',
        sub: dua?.shortBenefit ?? '',
        target: item.targetCount ?? dua?.defaultTargetCount ?? 3,
      };
    },
    [getEsmaById, getDuaById],
  );

  /* ─── Journal-based progress per item ─── */
  const itemKey = (it: CustomSetItem) => `${it.itemType}-${it.itemId}`;

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayEntries = useMemo(
    () => journalEntries.filter((e) => e.dateISO === todayISO),
    [journalEntries, todayISO],
  );

  /** Map: "dua-5" → { completed: 20, target: 33 } (sum of today's entries) */
  const progressMap = useMemo(() => {
    const map: Record<string, { completed: number; target: number }> = {};
    if (!set) return map;
    for (const it of set.items) {
      const key = itemKey(it);
      const resolved = resolveItem(it);
      const entries = todayEntries.filter(
        (e) => e.itemType === (it.itemType === 'sure' ? 'dua' : it.itemType) && e.itemId === it.itemId,
      );
      const totalCompleted = entries.reduce((sum, e) => sum + e.completed, 0);
      map[key] = { completed: totalCompleted, target: resolved.target };
    }
    return map;
  }, [set, todayEntries, resolveItem]);

  /** Per-item progress ratio (0..1) */
  const getItemProgress = (it: CustomSetItem): number => {
    const p = progressMap[itemKey(it)];
    if (!p || p.target <= 0) return 0;
    return Math.min(1, p.completed / p.target);
  };

  const isItemDone = (it: CustomSetItem): boolean => getItemProgress(it) >= 1;

  const totalCount = set?.items.length ?? 0;
  const completedCount = set ? set.items.filter((it) => isItemDone(it)).length : 0;
  /** Overall progress = average of individual item progress ratios */
  const progress = useMemo(() => {
    if (!set || set.items.length === 0) return 0;
    const sum = set.items.reduce((acc, it) => acc + getItemProgress(it), 0);
    return sum / set.items.length;
  }, [set, progressMap]);

  /* ─── Name editing ─── */
  const handleNameBlur = () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && set && trimmed !== set.name) {
      renameSet(set.id, trimmed);
    } else if (set) {
      setNameValue(set.name);
    }
  };

  /* ─── Reorder ─── */
  const handleSwap = (index: number, direction: 'up' | 'down') => {
    if (!set) return;
    const items = [...set.items];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;
    const temp = items[index];
    items[index] = { ...items[targetIndex], order: index };
    items[targetIndex] = { ...temp, order: targetIndex };
    reorderItems(set.id, items);
  };

  /* ─── Navigate to counter ─── */
  const handleItemPress = useCallback(
    (item: CustomSetItem) => {
      if (!set || isEditMode) return;
      const resolved = resolveItem(item);
      const key = itemKey(item);
      const prog = progressMap[key];
      const alreadyDone = prog?.completed ?? 0;
      const remaining = Math.max(0, resolved.target - alreadyDone);
      if (remaining <= 0) return; // already completed
      router.push({
        pathname: '/spiritual/counter',
        params: {
          itemType: item.itemType === 'sure' ? 'dua' : item.itemType,
          itemId: item.itemId.toString(),
          itemName: resolved.name,
          target: remaining.toString(),
          setItems: JSON.stringify(set.items),
          setIndex: set.items.indexOf(item).toString(),
        },
      });
    },
    [set, isEditMode, resolveItem, progressMap],
  );

  /* ─── Count presets ─── */
  const COUNT_PRESETS = [7, 11, 33, 99, 100, 500, 1000];

  const getDefaultCount = useCallback(
    (tab: AddTab, itemId: number): number => {
      if (tab === 'esma') {
        const esma = getEsmaById(itemId);
        return esma?.defaultTargetCount ?? 33;
      }
      const dua = getDuaById(itemId);
      return dua?.defaultTargetCount ?? 3;
    },
    [getEsmaById, getDuaById],
  );

  const getAddItemCount = useCallback(
    (tab: AddTab, itemId: number): number => {
      const key = `${tab}-${itemId}`;
      return addItemCounts[key] ?? getDefaultCount(tab, itemId);
    },
    [addItemCounts, getDefaultCount],
  );

  const setAddItemCount = useCallback((tab: AddTab, itemId: number, count: number) => {
    setAddItemCounts((prev) => ({ ...prev, [`${tab}-${itemId}`]: count }));
  }, []);

  /* ─── Add modal items ─── */
  const addFilteredItems = useMemo(() => {
    const q = addSearch.toLowerCase().trim();
    if (addTab === 'esma') return searchEsma(q);
    if (addTab === 'sure') {
      return sureList.filter((d) =>
        q === '' || d.title.toLowerCase().includes(q) || d.meaningTr.toLowerCase().includes(q),
      );
    }
    return pureDuaList.filter((d) =>
      q === '' || d.title.toLowerCase().includes(q) || d.meaningTr.toLowerCase().includes(q),
    );
  }, [addTab, addSearch, searchEsma, sureList, pureDuaList]);

  /* ─── Not found ─── */
  if (!set) {
    return (
      <SafeScreen>
        <View style={S.emptyScreen}>
          <Ionicons name="alert-circle-outline" size={48} color={accent} />
          <Text style={S.emptyTitle}>{t('spiritual.customSet.notFoundTitle')}</Text>
          <Pressable style={[S.emptyBtn, { borderColor: accent }]} onPress={goBack}>
            <Text style={[S.emptyBtnText, { color: accent }]}>{t('common.back')}</Text>
          </Pressable>
        </View>
      </SafeScreen>
    );
  }

  /* ─── Render item ─── */
  const renderItem = ({ item, index }: { item: CustomSetItem; index: number }) => {
    const resolved = resolveItem(item);
    const key = itemKey(item);
    const isDone = isItemDone(item);
    const prog = progressMap[key];
    const pct = Math.round(getItemProgress(item) * 100);
    const meta = TYPE_META[item.itemType] ?? TYPE_META.dua;
    const typeColor = isDark ? meta.darkColor : meta.color;

    return (
      <Pressable
        style={({ pressed }) => [
          S.itemCard,
          isDone && S.itemCardDone,
          pressed && !isEditMode && { opacity: 0.88, transform: [{ scale: 0.98 }] },
        ]}
        onPress={() => !isEditMode && handleItemPress(item)}
        onLongPress={() => {
          if (!isEditMode) {
            Alert.alert(resolved.name, undefined, [
              { text: t('spiritual.customSet.enterEditMode'), onPress: () => setIsEditMode(true) },
              {
                text: t('spiritual.customSet.delete'),
                style: 'destructive',
                onPress: () => removeItem(set.id, item.itemType, item.itemId),
              },
              { text: t('spiritual.customSet.cancel'), style: 'cancel' },
            ]);
          }
        }}
      >
        {/* Completion indicator */}
        <View
          style={[
            S.checkBtn,
            {
              backgroundColor: isDone ? doneColor + '18' : pct > 0 ? accent + '12' : 'transparent',
              borderColor: isDone ? doneColor : pct > 0 ? accent : colors.border,
            },
          ]}
        >
          {isDone ? (
            <Ionicons name="checkmark" size={14} color={doneColor} />
          ) : pct > 0 ? (
            <Text style={[S.checkPct, { color: accent }]}>{pct}</Text>
          ) : null}
        </View>

        {/* Type icon */}
        <View style={[S.itemIcon, { backgroundColor: typeColor + '14' }]}>
          <Ionicons name={meta.icon} size={16} color={typeColor} />
        </View>

        {/* Content */}
        <View style={S.itemBody}>
          <Text
            style={[S.itemName, isDone && { color: colors.muted, textDecorationLine: 'line-through' }]}
            numberOfLines={1}
          >
            {resolved.name}
          </Text>
          <View style={S.itemMetaRow}>
            {prog && prog.completed > 0 ? (
              <Text style={[S.itemProgressText, { color: isDone ? doneColor : accent }]}>
                {prog.completed}/{prog.target} — %{pct}
              </Text>
            ) : resolved.arabic ? (
              <Text style={S.itemArabic} numberOfLines={1}>{resolved.arabic}</Text>
            ) : resolved.sub ? (
              <Text style={S.itemSub} numberOfLines={1}>{resolved.sub}</Text>
            ) : null}
            {(!prog || prog.completed === 0) && (
              editingTargetKey === itemKey(item) ? (
                <TextInput
                  style={[S.itemTarget, S.itemTargetInput, { color: typeColor, borderBottomColor: typeColor }]}
                  value={editingTargetValue}
                  onChangeText={(t) => setEditingTargetValue(t.replace(/[^0-9]/g, ''))}
                  onBlur={() => {
                    const num = parseInt(editingTargetValue, 10);
                    if (num > 0) updateItemTarget(set.id, item.itemType, item.itemId, num);
                    setEditingTargetKey(null);
                  }}
                  onSubmitEditing={() => {
                    const num = parseInt(editingTargetValue, 10);
                    if (num > 0) updateItemTarget(set.id, item.itemType, item.itemId, num);
                    setEditingTargetKey(null);
                  }}
                  keyboardType="number-pad"
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <Pressable
                  onPress={() => {
                    setEditingTargetKey(itemKey(item));
                    setEditingTargetValue(String(resolved.target));
                  }}
                  hitSlop={6}
                >
                  <Text style={[S.itemTarget, { color: typeColor }]}>
                    {resolved.target}x
                  </Text>
                </Pressable>
              )
            )}
          </View>
        </View>

        {/* Edit mode: reorder + delete */}
        {isEditMode ? (
          <View style={S.editActions}>
            <Pressable
              onPress={() => handleSwap(index, 'up')}
              hitSlop={6}
              disabled={index === 0}
              style={({ pressed }) => pressed && { opacity: 0.5 }}
            >
              <Ionicons name="chevron-up" size={18} color={index === 0 ? colors.border : colors.subtext} />
            </Pressable>
            <Pressable
              onPress={() => handleSwap(index, 'down')}
              hitSlop={6}
              disabled={index === set.items.length - 1}
              style={({ pressed }) => pressed && { opacity: 0.5 }}
            >
              <Ionicons
                name="chevron-down"
                size={18}
                color={index === set.items.length - 1 ? colors.border : colors.subtext}
              />
            </Pressable>
            <Pressable
              onPress={() => removeItem(set.id, item.itemType, item.itemId)}
              hitSlop={8}
            >
              <Ionicons name="trash-outline" size={16} color={colors.red} />
            </Pressable>
          </View>
        ) : (
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        )}
      </Pressable>
    );
  };

  const bottomBar = (
    <View style={[S.bottomBar, { paddingBottom: Math.max(20, bottomTabBarOffset > 0 ? 20 : 36) }]}>
      <Pressable
        style={({ pressed }) => [
          S.addBtn,
          {
            backgroundColor: accentSoft,
            borderColor: isDark ? platformColor(colors.surfaceGlassBorder, colors.border) : accent + '22',
          },
          pressed && { opacity: 0.8 },
        ]}
        onPress={() => { setAddSearch(''); setAddItemCounts({}); setExpandedCountPicker(null); setCustomCountText(''); setShowAddModal(true); }}
      >
        <Ionicons name={totalCount > 0 ? 'pencil-outline' : 'add-circle-outline'} size={18} color={accent} />
        <Text style={[S.addBtnText, { color: accent }]}>{totalCount > 0 ? t('spiritual.customSet.editItems') : t('spiritual.customSet.addItems')}</Text>
      </Pressable>

      {totalCount > 0 && completedCount < totalCount && (
        <Pressable
          style={({ pressed }) => [
            S.startBtn,
            { backgroundColor: primaryCta },
            pressed && { opacity: 0.85 },
          ]}
          onPress={() => {
            const next = set.items.find((it) => !isItemDone(it));
            if (next) handleItemPress(next);
          }}
        >
          <Ionicons name="play" size={18} color="#FFF" />
          <Text style={S.startBtnText}>{t('spiritual.customSet.continuePractice')}</Text>
        </Pressable>
      )}

      {totalCount > 0 && completedCount >= totalCount && (
        <View style={[S.startBtn, { backgroundColor: doneColor }]}>
          <Ionicons name="checkmark-circle" size={18} color="#FFF" />
          <Text style={S.startBtnText}>{t('spiritual.customSet.completedStatus')}</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeScreen>
      {/* ─── Header ─── */}
      <View style={S.header}>
        <Pressable onPress={goBack} hitSlop={12} style={S.backBtn}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <View style={S.headerCenter}>
          {editingName ? (
            <TextInput
              style={[S.headerInput, { color: colors.text, borderColor: accent }]}
              value={nameValue}
              onChangeText={setNameValue}
              onBlur={handleNameBlur}
              onSubmitEditing={handleNameBlur}
              autoFocus
              returnKeyType="done"
              maxLength={40}
            />
          ) : (
            <Pressable onPress={() => setEditingName(true)} style={S.headerTitleRow}>
              <Text style={S.headerTitle} numberOfLines={1}>{set.name}</Text>
              <Ionicons name="pencil-outline" size={12} color={colors.muted} />
            </Pressable>
          )}
          <Text style={S.headerSub}>{t('spiritual.customSet.cardItemCount', { count: totalCount })}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Pressable
            onPress={() => setIsEditMode((p) => !p)}
            hitSlop={12}
            style={[S.editToggle, isEditMode && { backgroundColor: accent + '22' }]}
          >
            <Ionicons
              name={isEditMode ? 'checkmark' : 'create-outline'}
              size={18}
              color={isEditMode ? accent : colors.subtext}
            />
          </Pressable>
          <HeaderRightIcons />
        </View>
      </View>

      {/* ─── Progress card ─── */}
      {totalCount > 0 && (
        <View style={S.progressCard}>
          <ProgressRing
            size={72}
            strokeWidth={6}
            progress={progress}
            color={progress >= 1 ? doneColor : accent}
            trackColor={isDark ? 'rgba(148,163,184,0.10)' : 'rgba(0,0,0,0.05)'}
          />
          <View style={S.progressInner}>
            <Text style={S.progressPercent}>
              %{Math.round(progress * 100)}
            </Text>
            <Text style={S.progressHint}>{t('spiritual.customSet.progressHint')}</Text>
          </View>
          <View style={S.progressStats}>
            <View style={S.progressStatRow}>
              <View style={[S.progressStatDot, { backgroundColor: doneColor }]} />
              <Text style={S.progressStatText}>
                {t('spiritual.customSet.completedCount', { count: completedCount })}
              </Text>
            </View>
            <View style={S.progressStatRow}>
              <View style={[S.progressStatDot, { backgroundColor: colors.border }]} />
              <Text style={S.progressStatText}>
                {t('spiritual.customSet.remainingCount', { count: totalCount - completedCount })}
              </Text>
            </View>
            {progress >= 1 && (
              <View style={[S.allDoneBadge, { backgroundColor: doneColor + '18' }]}>
                <Ionicons name="checkmark-circle" size={14} color={doneColor} />
                <Text style={[S.allDoneText, { color: doneColor }]}>
                  {t('spiritual.customSet.completedBanner')}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}

      {/* ─── Item list ─── */}
      <FlatList
        data={set.items}
        keyExtractor={(item) => itemKey(item)}
        renderItem={renderItem}
        contentContainerStyle={S.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={S.emptyItems}>
            <View style={[S.emptyItemsIcon, { backgroundColor: accentSoft }]}>
              <Ionicons name="sparkles-outline" size={32} color={accent} />
            </View>
            <Text style={S.emptyItemsTitle}>{t('spiritual.customSet.emptyItemsTitle')}</Text>
            <Text style={S.emptyItemsSub}>{t('spiritual.customSet.emptyItemsSub')}</Text>
          </View>
        }
        ListFooterComponent={bottomBar}
      />

      {/* ─── Bottom bar ─── */}
      <View style={S.hiddenBottomBar}>
        <Pressable
          style={({ pressed }) => [
            S.addBtn,
            { borderColor: accent },
            pressed && { opacity: 0.8 },
          ]}
          onPress={() => { setAddSearch(''); setAddItemCounts({}); setExpandedCountPicker(null); setCustomCountText(''); setShowAddModal(true); }}
        >
          <Ionicons name={totalCount > 0 ? 'pencil-outline' : 'add-circle-outline'} size={18} color={accent} />
          <Text style={[S.addBtnText, { color: accent }]}>{totalCount > 0 ? t('spiritual.customSet.editItems') : t('spiritual.customSet.addItems')}</Text>
        </Pressable>

        {totalCount > 0 && completedCount < totalCount && (
          <Pressable
            style={({ pressed }) => [
              S.startBtn,
              { backgroundColor: accent },
              pressed && { opacity: 0.85 },
            ]}
            onPress={() => {
              /* find first incomplete item */
              const next = set.items.find((it) => !isItemDone(it));
              if (next) handleItemPress(next);
            }}
          >
            <Ionicons name="play" size={18} color="#FFF" />
            <Text style={S.startBtnText}>{t('spiritual.customSet.continuePractice')}</Text>
          </Pressable>
        )}

        {totalCount > 0 && completedCount >= totalCount && (
          <View style={[S.startBtn, { backgroundColor: doneColor }]}>
            <Ionicons name="checkmark-circle" size={18} color="#FFF" />
            <Text style={S.startBtnText}>{t('spiritual.customSet.completedStatus')}</Text>
          </View>
        )}
      </View>

      {/* ─── Add Item Modal ─── */}
      <Modal visible={showAddModal} animationType="slide" transparent onRequestClose={closeAddModal}>
        <View style={S.modalOverlay}>
          <SafeAreaView style={S.modalSafe}>
            <Animated.View style={[S.modalContent, addModalAnimatedStyle]}>
              <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              >
              {/* Modal header */}
                <GestureDetector gesture={addModalGesture}>
                  <View>
                    <View style={S.modalHandle} />
                    <View style={S.modalHeader}>
                      <Text style={S.modalTitle}>{totalCount > 0 ? t('spiritual.customSet.editItems') : t('spiritual.customSet.addItems')}</Text>
                      <Pressable onPress={closeAddModal} hitSlop={10}>
                        <Ionicons name="close" size={22} color={colors.text} />
                      </Pressable>
                    </View>
                  </View>
                </GestureDetector>

              {/* Tab chips */}
              <View style={S.chipRow}>
                {(['esma', 'dua', 'sure'] as AddTab[]).map((tab) => {
                  const meta = TYPE_META[tab];
                  const clr = isDark ? meta.darkColor : meta.color;
                  const isActive = addTab === tab;
                  return (
                    <Pressable
                      key={tab}
                      style={[
                        S.chip,
                        {
                          backgroundColor: isActive ? clr + '18' : 'transparent',
                          borderColor: isActive ? clr + '44' : colors.border,
                        },
                      ]}
                      onPress={() => { setAddTab(tab); setAddSearch(''); setExpandedCountPicker(null); }}
                    >
                      <Ionicons name={meta.icon} size={14} color={isActive ? clr : colors.subtext} />
                      <Text style={[S.chipText, { color: isActive ? clr : colors.subtext }]}>
                        {meta.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {/* Search */}
                <View style={S.searchRow}>
                  <Ionicons name="search" size={16} color={colors.muted} />
                  <TextInput
                    style={[S.searchInput, { color: colors.text }]}
                    placeholder={t('spiritual.customSet.searchPlaceholder')}
                    placeholderTextColor={colors.muted}
                    value={addSearch}
                    onChangeText={setAddSearch}
                  />
                  {addSearch.length > 0 && (
                    <Pressable onPress={() => setAddSearch('')} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color={colors.muted} />
                    </Pressable>
                  )}
                </View>

              {/* Select All / Remove All */}
              {(() => {
                const filtered = addFilteredItems as any[];
                if (filtered.length === 0) return null;
                const unaddedCount = filtered.filter(
                  (item) => !isItemInSet(set.id, addTab as SpiritualItemType, item.id),
                ).length;
                const allAdded = unaddedCount === 0;
                return (
                  <Pressable
                    style={({ pressed }) => [
                      S.selectAllBtn,
                      { borderColor: accent + '44', backgroundColor: pressed ? accent + '18' : accent + '0C' },
                    ]}
                    onPress={() => {
                      if (allAdded) {
                        filtered.forEach((item) => {
                          removeItem(set.id, addTab as SpiritualItemType, item.id);
                        });
                      } else {
                        filtered.forEach((item) => {
                          if (!isItemInSet(set.id, addTab as SpiritualItemType, item.id)) {
                            addItem(set.id, addTab as SpiritualItemType, item.id, getDefaultCount(addTab, item.id));
                          }
                        });
                      }
                      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    }}
                  >
                    <Ionicons
                      name={allAdded ? 'trash-outline' : 'checkmark-done-outline'}
                      size={15}
                      color={allAdded ? colors.error ?? '#EF4444' : accent}
                    />
                    <Text style={[S.selectAllText, { color: allAdded ? colors.error ?? '#EF4444' : accent }]}>
                      {allAdded
                        ? t('spiritual.customSet.removeAllFiltered', { count: filtered.length })
                        : t('spiritual.customSet.addAllFiltered', { count: unaddedCount })}
                    </Text>
                  </Pressable>
                );
              })()}

              {/* Results */}
                <FlatList
                data={addFilteredItems as any[]}
                keyExtractor={(item) => item.id.toString()}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={S.modalListContent}
                showsVerticalScrollIndicator={false}
                renderItem={({ item: addItem_ }) => {
                  const itemType: SpiritualItemType = addTab;
                  const alreadyIn = isItemInSet(set.id, itemType, addItem_.id);
                  const meta = TYPE_META[addTab];
                  const clr = isDark ? meta.darkColor : meta.color;
                  const name = addTab === 'esma' ? addItem_.nameTr : addItem_.title;
                  const sub = addItem_.meaningTr;
                  const pickerKey = `${addTab}-${addItem_.id}`;
                  const isPickerOpen = expandedCountPicker === pickerKey;
                  const selectedCount = getAddItemCount(addTab, addItem_.id);

                  return (
                    <View>
                      <View style={S.addItemRow}>
                        <View style={[S.addItemIcon, { backgroundColor: clr + '14' }]}>
                          <Ionicons name={meta.icon} size={14} color={clr} />
                        </View>
                        <View style={S.addItemInfo}>
                          <Text style={S.addItemName} numberOfLines={1}>{name}</Text>
                          <Text style={S.addItemSub} numberOfLines={1}>{sub}</Text>
                        </View>
                        {/* Count badge */}
                        {!alreadyIn && (
                          <Pressable
                            onPress={() => { setExpandedCountPicker(isPickerOpen ? null : pickerKey); setCustomCountText(''); }}
                            style={[
                              S.countBadge,
                              {
                                backgroundColor: isPickerOpen ? accent + '18' : (isDark ? 'rgba(148,163,184,0.10)' : 'rgba(0,0,0,0.04)'),
                                borderColor: isPickerOpen ? accent + '44' : colors.border,
                              },
                            ]}
                            hitSlop={4}
                          >
                            <Text style={[S.countBadgeText, { color: isPickerOpen ? accent : colors.text }]}>
                              {selectedCount}x
                            </Text>
                            <Ionicons
                              name={isPickerOpen ? 'chevron-up' : 'chevron-down'}
                              size={10}
                              color={isPickerOpen ? accent : colors.subtext}
                            />
                          </Pressable>
                        )}
                        <Pressable
                          onPress={() => {
                            if (alreadyIn) {
                              removeItem(set.id, itemType, addItem_.id);
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            } else {
                              addItem(set.id, itemType, addItem_.id, selectedCount);
                              setExpandedCountPicker(null);
                              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            }
                          }}
                          hitSlop={8}
                        >
                          <Ionicons
                            name={alreadyIn ? 'checkmark-circle' : 'add-circle'}
                            size={26}
                            color={alreadyIn ? doneColor : accent}
                          />
                        </Pressable>
                      </View>
                      {/* Count picker presets */}
                      {isPickerOpen && !alreadyIn && (
                        <View style={S.countPickerRow}>
                          {COUNT_PRESETS.map((n) => (
                            <Pressable
                              key={n}
                              style={[
                                S.countChip,
                                {
                                  backgroundColor: selectedCount === n ? accent + '18' : 'transparent',
                                  borderColor: selectedCount === n ? accent : colors.border,
                                },
                              ]}
                              onPress={() => {
                                setAddItemCount(addTab, addItem_.id, n);
                                void Haptics.selectionAsync();
                              }}
                            >
                              <Text
                                style={[
                                  S.countChipText,
                                  { color: selectedCount === n ? accent : colors.subtext },
                                ]}
                              >
                                {n}
                              </Text>
                            </Pressable>
                          ))}
                          <TextInput
                            style={[S.countChip, S.countChipInput, { borderColor: colors.border, color: colors.text }]}
                            value={customCountText}
                            onChangeText={(t) => {
                              const clean = t.replace(/[^0-9]/g, '');
                              setCustomCountText(clean);
                              const num = parseInt(clean, 10);
                              if (num > 0) setAddItemCount(addTab, addItem_.id, num);
                            }}
                            keyboardType="number-pad"
                            placeholder={t('spiritual.customSet.countPlaceholder')}
                            placeholderTextColor={colors.subtext}
                            maxLength={5}
                          />
                        </View>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <Text style={S.modalEmpty}>{t('spiritual.customSet.searchNoResults')}</Text>
                }
              />
              </KeyboardAvoidingView>
            </Animated.View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeScreen>
  );
}

/* ─── Styles ─── */
function makeStyles(C: ThemeColors, isDark: boolean) {
  const accent = isDark ? '#A78BFA' : '#7C3AED';

  return StyleSheet.create({
    /* Empty / Error screen */
    emptyScreen: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      padding: SPACING.xxl,
      gap: SPACING.md,
      backgroundColor: C.bg,
    },
    emptyTitle: { ...TYPOGRAPHY.H3, color: C.text },
    emptyBtn: {
      paddingHorizontal: SPACING.xl,
      paddingVertical: SPACING.smMd,
      borderRadius: RADIUS.full,
      borderWidth: 1,
    },
    emptyBtnText: { ...TYPOGRAPHY.SmallBold },

    /* Header */
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: SPACING.lg,
      paddingTop: SPACING.md,
      paddingBottom: SPACING.md,
      gap: SPACING.sm,
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark
        ? platformColor('rgba(255,255,255,0.06)', C.card)
        : platformColor('rgba(0,0,0,0.04)', '#F1F5F9'),
    },
    headerCenter: {
      flex: 1,
      alignItems: 'center',
      gap: 2,
    },
    headerTitleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    headerTitle: {
      ...TYPOGRAPHY.BodyLarge,
      color: C.text,
      letterSpacing: -0.3,
    },
    headerInput: {
      ...TYPOGRAPHY.BodyLarge,
      textAlign: 'center',
      borderBottomWidth: 2,
      paddingBottom: 2,
      minWidth: 120,
    },
    headerSub: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.subtext,
    },
    editToggle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: isDark
        ? platformColor('rgba(255,255,255,0.06)', C.card)
        : platformColor('rgba(0,0,0,0.04)', '#F1F5F9'),
    },

    /* Progress card */
    progressCard: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: SPACING.lgXl,
      marginBottom: SPACING.md,
      padding: SPACING.mdLg,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? platformColor('rgba(148,163,184,0.12)', C.border) : C.border,
      backgroundColor: isDark ? platformColor('rgba(30,41,59,0.55)', C.card) : C.surface,
      gap: SPACING.md,
    },
    progressInner: {
      position: 'absolute',
      left: SPACING.mdLg,
      width: 72,
      height: 72,
      alignItems: 'center',
      justifyContent: 'center',
    },
    progressPercent: {
      fontSize: 18,
      fontWeight: '900',
      color: accent,
      letterSpacing: -0.5,
    },
    progressHint: {
      ...TYPOGRAPHY.CaptionXS,
      color: C.subtext,
    },
    progressStats: {
      flex: 1,
      marginLeft: 72 + SPACING.md - SPACING.md, // offset for the ring
      gap: SPACING.sm,
    },
    progressStatRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    progressStatDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    progressStatText: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
    },
    allDoneBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACING.smMd,
      paddingVertical: SPACING.xs,
      borderRadius: RADIUS.full,
      alignSelf: 'flex-start',
    },
    allDoneText: {
      ...TYPOGRAPHY.CaptionBold,
    },

    /* List */
    listContent: {
      paddingHorizontal: SPACING.lgXl,
      paddingBottom: SPACING.xl,
      gap: SPACING.sm,
    },

    /* Item card */
    itemCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.smMd,
      padding: SPACING.md,
      borderRadius: RADIUS.lg,
      borderWidth: 1,
      borderColor: isDark ? platformColor('rgba(148,163,184,0.12)', C.border) : C.border,
      backgroundColor: isDark ? platformColor('rgba(30,41,59,0.55)', C.card) : C.surface,
    },
    itemCardDone: {
      opacity: 0.7,
      backgroundColor: isDark
        ? platformColor('rgba(30,41,59,0.35)', '#182233')
        : platformColor('rgba(248,250,252,0.7)', '#F8FAFC'),
    },
    checkBtn: {
      width: 24,
      height: 24,
      borderRadius: 12,
      borderWidth: 1.5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemIcon: {
      width: 32,
      height: 32,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    itemBody: {
      flex: 1,
      gap: 3,
    },
    itemName: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
    },
    itemMetaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },
    itemArabic: {
      ...TYPOGRAPHY.CaptionSmall,
      color: C.subtext,
      flex: 1,
    },
    itemSub: {
      ...TYPOGRAPHY.CaptionSmall,
      color: C.subtext,
      flex: 1,
    },
    itemTarget: {
      ...TYPOGRAPHY.CaptionBold,
    },
    itemTargetInput: {
      borderBottomWidth: 1,
      minWidth: 36,
      paddingHorizontal: 2,
      paddingVertical: 0,
      textAlign: 'center',
    },
    countChipInput: {
      minWidth: 44,
      textAlign: 'center',
      fontSize: 12,
      fontWeight: '600' as const,
    },
    itemProgressText: {
      ...TYPOGRAPHY.CaptionBold,
      flex: 1,
    },
    checkPct: {
      fontSize: 9,
      fontWeight: '800',
      letterSpacing: -0.3,
    },
    editActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.sm,
    },

    /* Empty items */
    emptyItems: {
      alignItems: 'center',
      paddingTop: 60,
      gap: SPACING.md,
    },
    emptyItemsIcon: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: SPACING.xs,
    },
    emptyItemsTitle: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
    },
    emptyItemsSub: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      textAlign: 'center',
      maxWidth: 240,
    },

    /* Bottom bar */
    bottomBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: SPACING.smMd,
      paddingHorizontal: SPACING.lgXl,
      paddingTop: SPACING.md,
      paddingBottom: 20,
      borderTopWidth: 1,
      borderTopColor: isDark ? platformColor(C.surfaceGlassBorder, C.border) : C.borderLight,
      backgroundColor: isDark ? platformColor(C.surfaceGlass, C.card) : platformColor(C.surfaceGlass, C.surface),
    },
    hiddenBottomBar: {
      display: 'none',
    },
    addBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.md,
      paddingHorizontal: SPACING.lg,
      borderRadius: RADIUS.full,
      borderWidth: 1.5,
      ...SHADOW.sm,
    },
    addBtnText: { ...TYPOGRAPHY.SmallBold },
    startBtn: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: SPACING.sm,
      paddingVertical: SPACING.md,
      borderRadius: RADIUS.full,
      ...SHADOW.sm,
    },
    startBtnText: { ...TYPOGRAPHY.BodyBold, color: '#FFF' },

    /* Modal */
    modalOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: isDark ? 'rgba(0,0,0,0.80)' : 'rgba(0,0,0,0.45)',
    },
    modalSafe: { flex: 1, justifyContent: 'flex-end' },
    modalContent: {
      height: '78%',
      borderTopLeftRadius: RADIUS.xl,
      borderTopRightRadius: RADIUS.xl,
      backgroundColor: C.bg,
      paddingTop: SPACING.sm,
    },
    modalHandle: {
      width: 36,
      height: 4,
      borderRadius: 2,
      backgroundColor: C.border,
      alignSelf: 'center',
      marginBottom: SPACING.md,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: SPACING.lgXl,
      paddingBottom: SPACING.md,
    },
    modalTitle: { ...TYPOGRAPHY.H3, color: C.text },

    /* Chips */
    chipRow: {
      flexDirection: 'row',
      gap: SPACING.sm,
      paddingHorizontal: SPACING.lgXl,
      paddingBottom: SPACING.md,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: SPACING.mdLg,
      paddingVertical: SPACING.sm,
      borderRadius: RADIUS.full,
      borderWidth: 1,
    },
    chipText: { ...TYPOGRAPHY.SmallBold },

    /* Search */
    searchRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginHorizontal: SPACING.lgXl,
      marginBottom: SPACING.md,
      borderWidth: 1,
      borderColor: isDark ? platformColor('rgba(148,163,184,0.14)', C.border) : C.border,
      borderRadius: RADIUS.md,
      paddingHorizontal: SPACING.md,
      paddingVertical: SPACING.sm,
      gap: SPACING.sm,
      backgroundColor: isDark ? platformColor('rgba(30,41,59,0.50)', C.card) : C.surface,
    },
    searchInput: { flex: 1, ...TYPOGRAPHY.Body },
    selectAllBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      marginHorizontal: SPACING.lgXl,
      marginTop: SPACING.sm,
      marginBottom: SPACING.xs,
      paddingVertical: SPACING.smMd,
      borderRadius: RADIUS.md,
      borderWidth: 1,
    },
    selectAllText: { ...TYPOGRAPHY.Caption, fontWeight: '700' },

    /* Modal list */
    modalListContent: {
      paddingHorizontal: SPACING.lgXl,
      paddingBottom: 32,
    },
    addItemRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: SPACING.smMd,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: isDark ? 'rgba(148,163,184,0.08)' : C.border,
      gap: SPACING.smMd,
    },
    addItemIcon: {
      width: 30,
      height: 30,
      borderRadius: RADIUS.sm,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addItemInfo: { flex: 1, gap: 2 },
    addItemName: { ...TYPOGRAPHY.SmallBold, color: C.text },
    addItemSub: { ...TYPOGRAPHY.Caption, color: C.subtext },

    /* Count badge & picker */
    countBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      paddingHorizontal: SPACING.sm,
      paddingVertical: 4,
      borderRadius: RADIUS.sm,
      borderWidth: 1,
    },
    countBadgeText: {
      fontSize: 12,
      fontWeight: '700',
      letterSpacing: -0.3,
    },
    countPickerRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 6,
      paddingLeft: 30 + SPACING.smMd,
      paddingBottom: SPACING.sm,
      paddingTop: 2,
    },
    countChip: {
      paddingHorizontal: SPACING.smMd,
      paddingVertical: 5,
      borderRadius: RADIUS.full,
      borderWidth: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    countChipText: {
      fontSize: 12,
      fontWeight: '600',
    },

    modalEmpty: {
      textAlign: 'center',
      marginTop: 32,
      ...TYPOGRAPHY.Body,
      color: C.muted,
    },
  });
}
