/**
 * CustomSetListScreen — Ruhsal Cantam (custom set list)
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  Alert,
  StyleSheet,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useCustomSetStore } from '../store/useCustomSetStore';
import { AppHeader } from '../../components/ui';
import { useTheme } from '../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS, SHADOW } from '../../constants/tokens';
import type { CustomSet } from '../types';

const ACCENT = '#F59E0B';

export default function CustomSetListScreen() {
  const { colors, isDark } = useTheme();
  const { sets, createSet, deleteSet } = useCustomSetStore();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState('');

  const gradColors: [string, string] = isDark
    ? ['#1C1917', '#292524']
    : ['#FFFBEB', '#FEF3C7'];

  const TEXT = isDark ? '#FFFBEB' : '#1C1917';
  const SUBTEXT = isDark ? '#FCD34D' : '#92400E';
  const SURFACE = isDark ? '#292524' : '#FFFFFF';
  const BORDER = isDark ? '#44403C' : '#FDE68A';

  const handleCreate = () => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    createSet(trimmed);
    setNewName('');
    setIsCreating(false);
  };

  const handleLongPress = (set: CustomSet) => {
    Alert.alert(set.name, 'Bu seti silmek istiyor musunuz?', [
      { text: 'Vazgec', style: 'cancel' },
      {
        text: 'Sil',
        style: 'destructive',
        onPress: () => deleteSet(set.id),
      },
    ]);
  };

  const renderSet = ({ item }: { item: CustomSet }) => (
    <Pressable
      style={[styles.setCard, { backgroundColor: SURFACE, borderColor: BORDER }]}
      onPress={() =>
        router.push({
          pathname: '/spiritual/custom-sets/[id]',
          params: { id: item.id },
        })
      }
      onLongPress={() => handleLongPress(item)}
    >
      <View style={[styles.iconCircle, { backgroundColor: ACCENT + '22' }]}>
        <Ionicons name="folder-open-outline" size={22} color={ACCENT} />
      </View>
      <View style={styles.setInfo}>
        <Text style={[styles.setName, { color: TEXT }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.setCount, { color: SUBTEXT }]}>
          {item.items.length} oge
        </Text>
      </View>
      <View style={[styles.badge, { backgroundColor: ACCENT + '22' }]}>
        <Text style={[styles.badgeText, { color: ACCENT }]}>
          {item.items.length}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={SUBTEXT} />
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="albums-outline" size={56} color={ACCENT + '66'} />
      <Text style={[styles.emptyText, { color: SUBTEXT }]}>
        Henuz set olusturmadiniz
      </Text>
      <Pressable
        style={[styles.emptyCta, { backgroundColor: ACCENT }]}
        onPress={() => setIsCreating(true)}
      >
        <Ionicons name="add" size={18} color="#FFFFFF" />
        <Text style={styles.emptyCtaText}>Ilk setini olustur</Text>
      </Pressable>
    </View>
  );

  return (
    <LinearGradient colors={gradColors} style={styles.container}>
      <AppHeader title="Ruhsal Cantam" onBack={() => router.back()} />

      {/* Create button / inline input */}
      <View style={styles.createSection}>
        {isCreating ? (
          <View
            style={[
              styles.createRow,
              { backgroundColor: SURFACE, borderColor: BORDER },
            ]}
          >
            <TextInput
              style={[styles.createInput, { color: TEXT }]}
              placeholder="Set adi..."
              placeholderTextColor={TEXT + '55'}
              value={newName}
              onChangeText={setNewName}
              autoFocus
              onSubmitEditing={handleCreate}
              returnKeyType="done"
            />
            <Pressable onPress={handleCreate} hitSlop={8}>
              <Ionicons
                name="checkmark-circle"
                size={28}
                color={newName.trim() ? ACCENT : ACCENT + '44'}
              />
            </Pressable>
            <Pressable
              onPress={() => {
                setIsCreating(false);
                setNewName('');
              }}
              hitSlop={8}
            >
              <Ionicons name="close-circle" size={28} color={SUBTEXT + '88'} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            style={[styles.createBtn, { backgroundColor: ACCENT }]}
            onPress={() => setIsCreating(true)}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.createBtnText}>Yeni Set Olustur</Text>
          </Pressable>
        )}
      </View>

      {/* Set list */}
      <FlatList
        data={sets}
        keyExtractor={(item) => item.id}
        renderItem={renderSet}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  createSection: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    ...SHADOW.sm,
  },
  createBtnText: {
    ...TYPOGRAPHY.BodyBold,
    color: '#FFFFFF',
  },
  createRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  createInput: {
    flex: 1,
    ...TYPOGRAPHY.Body,
    paddingVertical: SPACING.xs,
  },
  listContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 40,
    gap: SPACING.sm,
  },
  setCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.md,
    borderWidth: 1,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    ...SHADOW.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  setInfo: {
    flex: 1,
    gap: 2,
  },
  setName: {
    ...TYPOGRAPHY.BodyBold,
  },
  setCount: {
    ...TYPOGRAPHY.Caption,
  },
  badge: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    ...TYPOGRAPHY.SmallBold,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 80,
    gap: SPACING.lg,
  },
  emptyText: {
    ...TYPOGRAPHY.Body,
    textAlign: 'center',
  },
  emptyCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.md,
  },
  emptyCtaText: {
    ...TYPOGRAPHY.BodyBold,
    color: '#FFFFFF',
  },
});
