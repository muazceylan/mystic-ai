/**
 * EsmaDetailScreen — Esma detay + hedef ayarı + "Zikre Başla"
 * Tema uyumlu (dark/light), Reanimated tap feedback
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

export default function EsmaDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const { getEsmaById } = useContentStore();
  const esma = getEsmaById(parseInt(id ?? '0', 10));

  const [target, setTarget] = useState(esma?.defaultTargetCount ?? 33);

  const GRAD: [string, string] = isDark
    ? ['#0D3B21', '#071A0F']
    : ['#F0FDF4', '#DCFCE7'];
  const ACCENT = isDark ? '#4ADE80' : '#16A34A';
  const TEXT = isDark ? '#F8FAFC' : '#111827';
  const SUBTEXT = isDark ? '#86EFAC' : '#6B7280';
  const SURFACE = isDark ? 'rgba(20,60,30,0.65)' : 'rgba(240,253,244,0.85)';
  const BORDER = isDark ? 'rgba(74,222,128,0.18)' : 'rgba(22,163,74,0.18)';

  if (!esma) {
    return (
      <SafeScreen style={{ backgroundColor: GRAD[0] }}>
        <LinearGradient colors={GRAD} style={styles.container}>
          <View style={styles.center}>
            <Text style={{ color: TEXT, fontSize: 15 }}>Esma bulunamadı.</Text>
            <Pressable onPress={() => router.back()} style={{ marginTop: 16 }}>
              <Text style={{ color: ACCENT, fontWeight: '700' }}>← Geri Dön</Text>
            </Pressable>
          </View>
        </LinearGradient>
      </SafeScreen>
    );
  }

  const startCounter = () => {
    router.push({
      pathname: '/spiritual/counter',
      params: {
        itemType: 'esma',
        itemId: esma.id,
        itemName: encodeURIComponent(esma.nameTr),
        target,
        transliteration: encodeURIComponent(esma.transliteration),
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
          <Text style={[styles.orderText, { color: ACCENT }]}>
            {esma.order}. Esma
          </Text>
          <Text style={[styles.headerTitle, { color: TEXT }]}>
            {esma.nameTr.toUpperCase()}
          </Text>
        </View>
        <HeaderRightIcons tintColor={TEXT} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Ana Kart */}
        <View style={[styles.mainCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
          <Text style={[styles.arabicWatermark, { color: TEXT + '10' }]}>{esma.nameAr}</Text>
          <Text style={[styles.arabicText, { color: TEXT }]}>{esma.nameAr}</Text>
          <Text style={[styles.transliteration, { color: ACCENT }]}>{esma.transliteration}</Text>
          <View style={[styles.divider, { backgroundColor: BORDER }]} />
          <Text style={[styles.meaning, { color: TEXT + 'CC' }]}>{esma.meaningTr}</Text>
        </View>

        {/* Fayda */}
        <View style={[styles.benefitCard, { backgroundColor: ACCENT + '12', borderColor: ACCENT + '30' }]}>
          <View style={styles.benefitHeader}>
            <Ionicons name="sparkles-outline" size={14} color={ACCENT} />
            <Text style={[styles.benefitLabel, { color: ACCENT }]}>Faydası</Text>
          </View>
          <Text style={[styles.benefitText, { color: TEXT + 'DD' }]}>{esma.shortBenefit}</Text>
        </View>

        {/* Hedef Ayarı */}
        <View style={[styles.targetCard, { backgroundColor: SURFACE, borderColor: BORDER }]}>
          <View style={styles.targetHeaderRow}>
            <Ionicons name="repeat-outline" size={14} color={SUBTEXT} />
            <Text style={[styles.targetLabel, { color: SUBTEXT }]}>
              Zikir Hedefi · Önerilen: {esma.defaultTargetCount}
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
          {/* Hızlı seçim */}
          <View style={styles.presetRow}>
            {[33, 99, 100, 1000].map((n) => (
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
          {esma.tags.map((t) => (
            <View key={t} style={[styles.tagChip, { backgroundColor: ACCENT + '12', borderColor: ACCENT + '25' }]}>
              <Text style={[styles.tagText, { color: SUBTEXT }]}>#{t}</Text>
            </View>
          ))}
        </View>

        {/* Kaynak */}
        {esma.sources.length > 0 && (
          <View style={[styles.sourceRow, { borderColor: BORDER }]}>
            <Ionicons name="shield-checkmark-outline" size={12} color={SUBTEXT + '88'} />
            <Text style={[styles.source, { color: SUBTEXT + '88' }]}>
              {esma.sources[0].provider} · {esma.sources[0].licenseNote}
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
          Bu içerikler bilgilendirme amaçlıdır. Dini hüküm değildir.
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
  headerCenter: { flex: 1, alignItems: 'center', gap: 3 },
  orderText: { fontSize: 12, fontWeight: '700', letterSpacing: 1 },
  headerTitle: { fontSize: 18, fontWeight: '900', letterSpacing: 1.5 },
  content: { padding: 16, gap: 12, paddingBottom: 44 },
  mainCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  arabicWatermark: {
    position: 'absolute',
    fontSize: 96,
    fontWeight: '900',
    top: -8,
  },
  arabicText: { fontSize: 44, fontWeight: '900', textAlign: 'center', zIndex: 1 },
  transliteration: { fontSize: 16, fontWeight: '700', letterSpacing: 1, zIndex: 1 },
  divider: { width: '60%', height: 1, marginVertical: 4 },
  meaning: { fontSize: 14, textAlign: 'center', lineHeight: 22, zIndex: 1 },
  benefitCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  benefitHeader: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  benefitLabel: { fontSize: 12, fontWeight: '700' },
  benefitText: { fontSize: 14, lineHeight: 21 },
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
  source: { fontSize: 11, flex: 1 },
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
