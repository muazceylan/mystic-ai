/**
 * CustomSetDetailScreen — Set detay / duzenleme ekrani
 */
import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCustomSetStore } from '../store/useCustomSetStore';
import { useContentStore } from '../store/useContentStore';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOW } from '../../constants/tokens';
import type { CustomSetItem, SpiritualItemType } from '../types';

const ACCENT = '#F59E0B';

type AddTab = 'esma' | 'dua' | 'sure';

function getTypeIcon(type: SpiritualItemType): string {
  switch (type) {
    case 'dua':
      return 'book-outline';
    case 'esma':
      return 'sparkles-outline';
    case 'sure':
      return 'library-outline';
    default:
      return 'document-outline';
  }
}

export default function CustomSetDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const {
    getSetById,
    renameSet,
    removeItem,
    reorderItems,
    addItem,
    isItemInSet,
  } = useCustomSetStore();
  const {
    getEsmaById,
    getDuaById,
    getSureById,
    searchEsma,
    searchDua,
    esmaList,
    duaList,
    sureList,
    pureDuaList,
  } = useContentStore();

  const set = getSetById(id ?? '');

  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(set?.name ?? '');
  const [showAddModal, setShowAddModal] = useState(false);
  const [addTab, setAddTab] = useState<AddTab>('esma');
  const [addSearch, setAddSearch] = useState('');

  const gradColors: [string, string] = isDark
    ? ['#1C1917', '#292524']
    : ['#FFFBEB', '#FEF3C7'];

  const TEXT = isDark ? '#FFFBEB' : '#1C1917';
  const SUBTEXT = isDark ? '#FCD34D' : '#92400E';
  const SURFACE = isDark ? '#292524' : '#FFFFFF';
  const BORDER = isDark ? '#44403C' : '#FDE68A';
  const OVERLAY = isDark ? 'rgba(0,0,0,0.85)' : 'rgba(0,0,0,0.5)';

  // Resolve item info
  const resolveItem = useCallback(
    (item: CustomSetItem) => {
      if (item.itemType === 'esma') {
        const esma = getEsmaById(item.itemId);
        return {
          name: esma?.nameTr ?? 'Bilinmeyen Esma',
          arabic: esma?.nameAr ?? '',
          target: esma?.defaultTargetCount ?? 33,
        };
      }
      // dua or sure
      const dua = getDuaById(item.itemId);
      return {
        name: dua?.title ?? 'Bilinmeyen Dua',
        arabic: dua?.arabic ? dua.arabic.slice(0, 30) : '',
        target: dua?.defaultTargetCount ?? 3,
      };
    },
    [getEsmaById, getDuaById],
  );

  // Handle name save on blur
  const handleNameBlur = () => {
    setEditingName(false);
    const trimmed = nameValue.trim();
    if (trimmed && set && trimmed !== set.name) {
      renameSet(set.id, trimmed);
    } else if (set) {
      setNameValue(set.name);
    }
  };

  // Swap items for reorder
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

  // Start routine
  const handleStartRoutine = () => {
    if (!set || set.items.length === 0) return;
    const first = set.items[0];
    const resolved = resolveItem(first);
    router.push({
      pathname: '/spiritual/counter',
      params: {
        itemType: first.itemType === 'sure' ? 'dua' : first.itemType,
        itemId: first.itemId.toString(),
        itemName: resolved.name,
        target: resolved.target.toString(),
        setItems: JSON.stringify(set.items),
        setIndex: '0',
      },
    });
  };

  // Add modal filtered items
  const addFilteredItems = useMemo(() => {
    const q = addSearch.toLowerCase().trim();
    if (addTab === 'esma') {
      return searchEsma(q);
    }
    if (addTab === 'sure') {
      return sureList.filter((d) => {
        if (q === '') return true;
        return (
          d.title.toLowerCase().includes(q) ||
          d.meaningTr.toLowerCase().includes(q)
        );
      });
    }
    // dua (exclude sure)
    return pureDuaList.filter((d) => {
      if (q === '') return true;
      return (
        d.title.toLowerCase().includes(q) ||
        d.meaningTr.toLowerCase().includes(q)
      );
    });
  }, [addTab, addSearch, searchEsma, sureList, pureDuaList]);

  // Not found
  if (!set) {
    return (
      <SafeScreen style={{ backgroundColor: gradColors[0] }}>
        <LinearGradient colors={gradColors} style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle-outline" size={48} color={ACCENT} />
            <Text style={[styles.errorText, { color: TEXT }]}>
              Set bulunamadi
            </Text>
            <Pressable
              style={[styles.errorBtn, { backgroundColor: ACCENT }]}
              onPress={() => router.back()}
            >
              <Text style={styles.errorBtnText}>Geri Don</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </SafeScreen>
    );
  }

  const renderItem = ({
    item,
    index,
  }: {
    item: CustomSetItem;
    index: number;
  }) => {
    const resolved = resolveItem(item);
    return (
      <View
        style={[
          styles.itemCard,
          { backgroundColor: SURFACE, borderColor: BORDER },
        ]}
      >
        <Ionicons
          name={getTypeIcon(item.itemType) as any}
          size={20}
          color={ACCENT}
        />
        <View style={styles.itemInfo}>
          <Text style={[styles.itemName, { color: TEXT }]} numberOfLines={1}>
            {resolved.name}
          </Text>
          {resolved.arabic ? (
            <Text
              style={[styles.itemArabic, { color: SUBTEXT }]}
              numberOfLines={1}
            >
              {resolved.arabic}
            </Text>
          ) : null}
        </View>

        {/* Reorder */}
        <View style={styles.reorderBtns}>
          <Pressable
            onPress={() => handleSwap(index, 'up')}
            hitSlop={6}
            disabled={index === 0}
          >
            <Ionicons
              name="chevron-up"
              size={18}
              color={index === 0 ? SUBTEXT + '44' : SUBTEXT}
            />
          </Pressable>
          <Pressable
            onPress={() => handleSwap(index, 'down')}
            hitSlop={6}
            disabled={index === set.items.length - 1}
          >
            <Ionicons
              name="chevron-down"
              size={18}
              color={
                index === set.items.length - 1 ? SUBTEXT + '44' : SUBTEXT
              }
            />
          </Pressable>
        </View>

        {/* Delete */}
        <Pressable
          onPress={() => removeItem(set.id, item.itemType, item.itemId)}
          hitSlop={8}
        >
          <Ionicons name="trash-outline" size={18} color="#EF4444" />
        </Pressable>
      </View>
    );
  };

  return (
    <SafeScreen style={{ backgroundColor: gradColors[0] }}>
      <LinearGradient colors={gradColors} style={styles.container}>
        {/* Header with editable name */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={TEXT} />
        </Pressable>

        {editingName ? (
          <TextInput
            style={[styles.headerTitleInput, { color: TEXT, borderColor: ACCENT }]}
            value={nameValue}
            onChangeText={setNameValue}
            onBlur={handleNameBlur}
            onSubmitEditing={handleNameBlur}
            autoFocus
            returnKeyType="done"
            maxLength={40}
          />
        ) : (
          <Pressable onPress={() => setEditingName(true)} style={styles.titleArea}>
            <Text style={[styles.headerTitle, { color: TEXT }]} numberOfLines={1}>
              {set.name}
            </Text>
            <Ionicons name="pencil-outline" size={14} color={SUBTEXT} />
          </Pressable>
        )}

        <View style={styles.backBtn} />
      </View>

      {/* Items list */}
      <FlatList
        data={set.items}
        keyExtractor={(item) => `${item.itemType}-${item.itemId}`}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyItems}>
            <Ionicons name="cube-outline" size={40} color={ACCENT + '55'} />
            <Text style={[styles.emptyItemsText, { color: SUBTEXT }]}>
              Henuz oge eklenmedi
            </Text>
          </View>
        }
      />

      {/* Bottom buttons */}
      <View style={styles.bottomBar}>
        <Pressable
          style={[styles.addBtn, { borderColor: ACCENT }]}
          onPress={() => {
            setAddSearch('');
            setShowAddModal(true);
          }}
        >
          <Ionicons name="add-circle-outline" size={20} color={ACCENT} />
          <Text style={[styles.addBtnText, { color: ACCENT }]}>Oge Ekle</Text>
        </Pressable>

        {set.items.length > 0 && (
          <Pressable
            style={[styles.startBtn, { backgroundColor: ACCENT }]}
            onPress={handleStartRoutine}
          >
            <Ionicons name="play" size={20} color="#FFFFFF" />
            <Text style={styles.startBtnText}>Rutini Baslat</Text>
          </Pressable>
        )}
      </View>

      {/* Add Item Modal */}
      <Modal visible={showAddModal} animationType="slide" transparent>
        <View style={[styles.modalOverlay, { backgroundColor: OVERLAY }]}>
          <SafeAreaView style={styles.modalSafe}>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={[styles.modalContent, { backgroundColor: isDark ? '#1C1917' : '#FFFBEB' }]}
            >
              {/* Modal header */}
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: TEXT }]}>Oge Ekle</Text>
                <Pressable onPress={() => setShowAddModal(false)} hitSlop={10}>
                  <Ionicons name="close" size={24} color={TEXT} />
                </Pressable>
              </View>

              {/* Tab chips */}
              <View style={styles.chipRow}>
                {(['esma', 'dua', 'sure'] as AddTab[]).map((t) => (
                  <Pressable
                    key={t}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: addTab === t ? ACCENT : SURFACE,
                        borderColor: addTab === t ? ACCENT : BORDER,
                      },
                    ]}
                    onPress={() => {
                      setAddTab(t);
                      setAddSearch('');
                    }}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: addTab === t ? '#FFFFFF' : TEXT },
                      ]}
                    >
                      {t === 'esma' ? 'Esma' : t === 'dua' ? 'Dua' : 'Sure'}
                    </Text>
                  </Pressable>
                ))}
              </View>

              {/* Search */}
              <View
                style={[
                  styles.searchRow,
                  { backgroundColor: SURFACE, borderColor: BORDER },
                ]}
              >
                <Ionicons name="search" size={16} color={SUBTEXT} />
                <TextInput
                  style={[styles.searchInput, { color: TEXT }]}
                  placeholder="Ara..."
                  placeholderTextColor={TEXT + '44'}
                  value={addSearch}
                  onChangeText={setAddSearch}
                />
                {addSearch.length > 0 && (
                  <Pressable onPress={() => setAddSearch('')}>
                    <Ionicons name="close-circle" size={18} color={TEXT + '88'} />
                  </Pressable>
                )}
              </View>

              {/* Results */}
              <FlatList
                data={addFilteredItems as any[]}
                keyExtractor={(item) => item.id.toString()}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.modalListContent}
                renderItem={({ item }) => {
                  const itemType: SpiritualItemType = addTab;
                  const alreadyIn = isItemInSet(set.id, itemType, item.id);

                  const name =
                    addTab === 'esma'
                      ? (item as any).nameTr
                      : (item as any).title;
                  const sub =
                    addTab === 'esma'
                      ? (item as any).meaningTr
                      : (item as any).meaningTr;

                  return (
                    <View
                      style={[
                        styles.addItemRow,
                        { borderColor: BORDER },
                      ]}
                    >
                      <View style={styles.addItemInfo}>
                        <Text
                          style={[styles.addItemName, { color: TEXT }]}
                          numberOfLines={1}
                        >
                          {name}
                        </Text>
                        <Text
                          style={[styles.addItemSub, { color: SUBTEXT }]}
                          numberOfLines={1}
                        >
                          {sub}
                        </Text>
                      </View>
                      <Pressable
                        onPress={() => {
                          if (!alreadyIn) {
                            addItem(set.id, itemType, item.id);
                          }
                        }}
                        disabled={alreadyIn}
                        hitSlop={8}
                      >
                        <Ionicons
                          name={alreadyIn ? 'checkmark-circle' : 'add-circle'}
                          size={28}
                          color={alreadyIn ? '#10B981' : ACCENT}
                        />
                      </Pressable>
                    </View>
                  );
                }}
                ListEmptyComponent={
                  <Text style={[styles.emptySearch, { color: SUBTEXT }]}>
                    Sonuc bulunamadi
                  </Text>
                }
              />
            </KeyboardAvoidingView>
          </SafeAreaView>
        </View>
      </Modal>
      </LinearGradient>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 56,
    paddingHorizontal: SPACING.lgXl,
    paddingBottom: SPACING.md,
  },
  backBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  titleArea: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  headerTitle: { ...TYPOGRAPHY.H2 },
  headerTitleInput: {
    flex: 1,
    ...TYPOGRAPHY.H2,
    textAlign: 'center',
    borderBottomWidth: 2,
    paddingBottom: 4,
  },

  // List
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 16,
    gap: SPACING.sm,
  },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
    ...SHADOW.sm,
  },
  itemInfo: { flex: 1, gap: 2 },
  itemName: { ...TYPOGRAPHY.BodyBold },
  itemArabic: { ...TYPOGRAPHY.Caption, fontStyle: 'italic' },
  reorderBtns: { gap: 2 },

  // Empty items
  emptyItems: {
    alignItems: 'center',
    paddingTop: 60,
    gap: SPACING.md,
  },
  emptyItemsText: { ...TYPOGRAPHY.Body },

  // Bottom bar
  bottomBar: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1.5,
  },
  addBtnText: { ...TYPOGRAPHY.BodyBold },
  startBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.mdLg,
    borderRadius: RADIUS.md,
    ...SHADOW.md,
  },
  startBtnText: { ...TYPOGRAPHY.BodyBold, color: '#FFFFFF' },

  // Error state
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  errorText: { ...TYPOGRAPHY.H3 },
  errorBtn: {
    paddingHorizontal: SPACING.xl,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
  },
  errorBtnText: { ...TYPOGRAPHY.BodyBold, color: '#FFFFFF' },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalSafe: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    height: '80%',
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    paddingTop: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  modalTitle: { ...TYPOGRAPHY.H3 },

  // Chips
  chipRow: {
    flexDirection: 'row',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  chip: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  chipText: { ...TYPOGRAPHY.SmallBold },

  // Search in modal
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: SPACING.sm,
  },
  searchInput: { flex: 1, ...TYPOGRAPHY.Body },

  modalListContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 32,
  },
  addItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: SPACING.md,
  },
  addItemInfo: { flex: 1, gap: 2 },
  addItemName: { ...TYPOGRAPHY.BodyBold },
  addItemSub: { ...TYPOGRAPHY.Caption },
  emptySearch: {
    textAlign: 'center',
    marginTop: 32,
    ...TYPOGRAPHY.Small,
  },
});
