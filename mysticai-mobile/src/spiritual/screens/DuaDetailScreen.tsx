/**
 * DuaDetailScreen — Dua/Sure detay + hedef ayarı + "Zikre Başla"
 * Tema uyumlu tasarım, Arapça / Okunuş / Meal sekmeleri
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen, HeaderRightIcons } from '../../components/ui';
import { useContentStore } from '../store/useContentStore';

type TextTab = 'arabic' | 'transliteration' | 'meaning';

const TAB_LABELS: Record<TextTab, string> = {
  arabic: 'Arapça',
  transliteration: 'Okunuş',
  meaning: 'Meal',
};

export default function DuaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { getDuaById } = useContentStore();
  const dua = getDuaById(parseInt(id ?? '0', 10));

  const [target, setTarget] = useState(dua?.defaultTargetCount ?? 33);
  const [textTab, setTextTab] = useState<TextTab>('arabic');

  const isSure = dua?.category === 'SURE';
  // Renk paleti: Sure için yeşil-teal, Dua için indigo-mavi
  const GRAD: [string, string] = isSure
    ? (isDark ? ['#0B2D1E', '#061209'] : ['#F0FDF4', '#DCFCE7'])
    : (isDark ? ['#0D1B4B', '#060D2A'] : ['#EEF2FF', '#E0E7FF']);
  const ACCENT = isSure
    ? (isDark ? '#4ADE80' : '#16A34A')
    : (isDark ? '#818CF8' : '#4F46E5');
  const TEXT = isDark ? '#F8FAFC' : '#111827';
  const SUBTEXT = isDark ? (isSure ? '#86EFAC' : '#A5B4FC') : '#6B7280';
  const SURFACE = isDark
    ? (isSure ? 'rgba(20,60,30,0.65)' : 'rgba(15,25,70,0.65)')
    : (isSure ? 'rgba(240,253,244,0.85)' : 'rgba(238,242,255,0.85)');
  const BORDER = isDark
    ? (isSure ? 'rgba(74,222,128,0.18)' : 'rgba(129,140,248,0.18)')
    : (isSure ? 'rgba(22,163,74,0.18)' : 'rgba(79,70,229,0.18)');

  if (!dua) {
    return (
      <SafeScreen style={{ backgroundColor: GRAD[0] }}>
        <LinearGradient colors={GRAD} style={styles.container}>
          <View style={styles.center}>
            <Text style={{ color: TEXT, fontSize: 15 }}>Dua bulunamadı.</Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
              <Text style={{ color: ACCENT, fontWeight: '700' }}>← Geri Dön</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </SafeScreen>
    );
  }

  const textContent: Record<TextTab, string> = {
    arabic: dua.arabic,
    transliteration: dua.transliteration,
    meaning: dua.meaningTr,
  };

  const startCounter = () => {
    router.push({
      pathname: '/spiritual/counter',
      params: {
        itemType: 'dua',
        itemId: dua.id,
        itemName: encodeURIComponent(dua.title),
        target,
        transliteration: encodeURIComponent(dua.transliteration),
      },
    });
  };

  return (
    <SafeScreen style={{ backgroundColor: GRAD[0] }}>
      <LinearGradient colors={GRAD} style={styles.container}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={TEXT} />
          </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: TEXT }]} numberOfLines={1}>
            {dua.title}
          </Text>
          <View style={[styles.categoryBadge, { backgroundColor: ACCENT + '20', borderColor: ACCENT + '40' }]}>
            <Text style={[styles.categoryText, { color: ACCENT }]}>{dua.category}</Text>
          </View>
        </View>
        <HeaderRightIcons tintColor={TEXT} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Metin Sekmeleri */}
        <View style={[styles.segmentBar, { backgroundColor: SURFACE, borderColor: BORDER }]}>
          {(['arabic', 'transliteration', 'meaning'] as TextTab[]).map((t) => (
            <Pressable
              key={t}
              style={[
                styles.segmentItem,
                textTab === t && { backgroundColor: ACCENT },
              ]}
              onPress={() => setTextTab(t)}
            >
              <Text style={[
                styles.segmentText,
                { color: textTab === t ? (isDark ? '#000' : '#fff') : SUBTEXT },
              ]}>
                {TAB_LABELS[t]}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Metin Kartı */}
        <View style={[styles.textCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
          {textTab === 'arabic' && (
            <Text style={[styles.arabicText, { color: TEXT }]}>
              {textContent.arabic}
            </Text>
          )}
          {textTab === 'transliteration' && (
            <Text style={[styles.transliterationText, { color: TEXT }]}>
              {textContent.transliteration}
            </Text>
          )}
          {textTab === 'meaning' && (
            <Text style={[styles.meaningText, { color: TEXT + 'EE' }]}>
              {textContent.meaning}
            </Text>
          )}
        </View>

        {/* Fayda */}
        <View style={[styles.benefitCard, { backgroundColor: ACCENT + '12', borderColor: ACCENT + '30' }]}>
          <View style={styles.benefitHeader}>
            <Ionicons name="sparkles-outline" size={14} color={ACCENT} />
            <Text style={[styles.benefitLabel, { color: ACCENT }]}>Faydası</Text>
          </View>
          <Text style={[styles.benefitText, { color: TEXT + 'DD' }]}>{dua.shortBenefit}</Text>
        </View>

        {/* Ayet Referansı */}
        {dua.relatedAyahRef && (
          <View style={[styles.ayahRef, { backgroundColor: SURFACE, borderColor: BORDER }]}>
            <Ionicons name="book-outline" size={14} color={SUBTEXT} />
            <Text style={[styles.ayahText, { color: SUBTEXT }]}>
              {dua.relatedAyahRef.surah} Suresi, {dua.relatedAyahRef.ayah}. Ayet
            </Text>
          </View>
        )}

        {/* Hedef Ayarı */}
        <View style={[styles.targetCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
          <View style={styles.targetHeaderRow}>
            <Ionicons name="repeat-outline" size={14} color={SUBTEXT} />
            <Text style={[styles.targetLabel, { color: SUBTEXT }]}>
              Zikir Hedefi · Önerilen: {dua.defaultTargetCount}
            </Text>
          </View>
          <View style={styles.targetRow}>
            <Pressable
              style={[styles.stepBtn, { borderColor: ACCENT + '50', backgroundColor: ACCENT + '10' }]}
              onPress={() => setTarget((t) => Math.max(1, t - 1))}
              hitSlop={8}
            >
              <Ionicons name="remove" size={20} color={ACCENT} />
            </Pressable>
            <Text style={[styles.targetValue, { color: TEXT }]}>{target}</Text>
            <Pressable
              style={[styles.stepBtn, { borderColor: ACCENT + '50', backgroundColor: ACCENT + '10' }]}
              onPress={() => setTarget((t) => t + 1)}
              hitSlop={8}
            >
              <Ionicons name="add" size={20} color={ACCENT} />
            </Pressable>
          </View>
          {/* Hızlı seçim çipleri */}
          <View style={styles.presetRow}>
            {[3, 7, 33, 100].map((n) => (
              <Pressable
                key={n}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: target === n ? ACCENT : ACCENT + '12',
                    borderColor: ACCENT + '40',
                  },
                ]}
                onPress={() => setTarget(n)}
              >
                <Text style={[
                  styles.presetText,
                  { color: target === n ? (isDark ? '#000' : '#fff') : ACCENT },
                ]}>
                  {n}×
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Tags */}
        <View style={styles.tagsRow}>
          {dua.tags.map((t) => (
            <View key={t} style={[styles.tagChip, { backgroundColor: ACCENT + '12', borderColor: ACCENT + '25' }]}>
              <Text style={[styles.tagText, { color: SUBTEXT }]}>#{t}</Text>
            </View>
          ))}
        </View>

        {/* Kaynak */}
        {dua.sources.length > 0 && (
          <View style={[styles.sourceRow, { borderColor: BORDER }]}>
            <Ionicons name="shield-checkmark-outline" size={12} color={SUBTEXT + '88'} />
            <Text style={[styles.source, { color: SUBTEXT + '88' }]}>
              {dua.sources[0].provider} · {dua.sources[0].ref}
            </Text>
          </View>
        )}

        {/* CTA */}
        <View style={styles.ctaGroup}>
          <Pressable
            style={({ pressed }) => [
              styles.primaryCta,
              { backgroundColor: ACCENT, opacity: pressed ? 0.85 : 1 },
            ]}
            onPress={startCounter}
          >
            <Ionicons name="sync-outline" size={18} color={isDark ? '#000' : '#fff'} />
            <Text style={[styles.primaryCtaText, { color: isDark ? '#000' : '#fff' }]}>
              Zikre Başla ({target}×)
            </Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.secondaryCta,
              { borderColor: ACCENT + '50', backgroundColor: ACCENT + '0E', opacity: pressed ? 0.75 : 1 },
            ]}
            onPress={() => router.push('/spiritual/journal')}
          >
            <Ionicons name="journal-outline" size={16} color={ACCENT} />
            <Text style={[styles.secondaryCtaText, { color: ACCENT }]}>Günlüğüm</Text>
          </Pressable>
        </View>

        <Text style={[styles.disclaimer, { color: SUBTEXT + '60' }]}>
          Bu içerikler bilgilendirme amaçlıdır. Dini hüküm ya da tıbbi tavsiye değildir.
        </Text>
      </ScrollView>
      </LinearGradient>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: { width: 40, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, alignItems: 'center', gap: 5 },
  headerTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center' },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryText: { fontSize: 11, fontWeight: '700' },
  content: { padding: 16, gap: 12, paddingBottom: 44 },
  segmentBar: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    padding: 3,
    gap: 2,
  },
  segmentItem: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 10,
  },
  segmentText: { fontSize: 13, fontWeight: '700' },
  textCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    minHeight: 110,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicText: {
    fontSize: 22,
    lineHeight: 40,
    textAlign: 'center',
    fontWeight: '500',
  },
  transliterationText: {
    fontSize: 15,
    lineHeight: 26,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  meaningText: {
    fontSize: 14,
    lineHeight: 24,
    textAlign: 'center',
  },
  benefitCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  benefitHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitLabel: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  benefitText: { fontSize: 14, lineHeight: 21 },
  ayahRef: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  ayahText: { fontSize: 13, fontWeight: '500' },
  targetCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    gap: 12,
    alignItems: 'center',
  },
  targetHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  targetLabel: { fontSize: 13, fontWeight: '600' },
  targetRow: { flexDirection: 'row', alignItems: 'center', gap: 24 },
  stepBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  targetValue: { fontSize: 40, fontWeight: '900', minWidth: 64, textAlign: 'center', lineHeight: 48 },
  presetRow: { flexDirection: 'row', gap: 8 },
  presetChip: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  presetText: { fontSize: 13, fontWeight: '700' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  tagChip: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 11, fontWeight: '600' },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 8,
  },
  source: { fontSize: 11 },
  ctaGroup: { gap: 10, marginTop: 4 },
  primaryCta: {
    borderRadius: 16,
    paddingVertical: 15,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryCtaText: { fontWeight: '800', fontSize: 16 },
  secondaryCta: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 13,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryCtaText: { fontWeight: '700', fontSize: 14 },
  disclaimer: { fontSize: 11, textAlign: 'center', lineHeight: 16, marginTop: 4 },
});
