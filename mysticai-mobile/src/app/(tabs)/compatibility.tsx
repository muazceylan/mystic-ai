import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Animated,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAuthStore } from '../../store/useAuthStore';
import { useSynastryStore } from '../../store/useSynastryStore';
import { RelationshipType, SavedPersonResponse } from '../../services/synastry.service';
import { COLORS } from '../../constants/colors';
import i18n from '../../i18n';
import { ErrorStateCard, SafeScreen } from '../../components/ui';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RelationshipTypeOption {
  key: RelationshipType;
  emoji: string;
  labelTR: string;
  labelEN: string;
  color: string;
  bgColor: string;
}

const RELATIONSHIP_TYPES: RelationshipTypeOption[] = [
  { key: 'LOVE', emoji: '💍', labelTR: 'Aşk', labelEN: 'Love', color: COLORS.pink, bgColor: COLORS.pinkBg },
  { key: 'BUSINESS', emoji: '🤝', labelTR: 'İş', labelEN: 'Business', color: COLORS.blue, bgColor: COLORS.blueBg },
  { key: 'FRIENDSHIP', emoji: '🌟', labelTR: 'Arkadaş', labelEN: 'Friend', color: COLORS.orange, bgColor: COLORS.neutralBg },
  { key: 'RIVAL', emoji: '🥊', labelTR: 'Rakip', labelEN: 'Rival', color: COLORS.redDark, bgColor: COLORS.redBg },
];

// ─── Circular Progress ────────────────────────────────────────────────────────

const CircularScore: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const animValue = useRef(new Animated.Value(0)).current;
  const size = 160;
  const strokeWidth = 12;

  useEffect(() => {
    Animated.timing(animValue, {
      toValue: score,
      duration: 1200,
      useNativeDriver: false,
    }).start();
  }, [score]);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {/* Light background track */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: COLORS.border,
        }}
      />
      {/* Score arc */}
      <Animated.View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderTopColor: 'transparent',
          borderRightColor: score > 25 ? color : 'transparent',
          borderBottomColor: score > 50 ? color : 'transparent',
          borderLeftColor: score > 75 ? color : 'transparent',
          transform: [{ rotate: '-90deg' }],
        }}
      />
      {/* Center text */}
      <View style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Text style={[styles.scoreNumber, { color }]}>{score}%</Text>
        <Text style={styles.scoreLabel}>Uyum</Text>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function CompatibilityScreen() {
  const { user } = useAuthStore();
  const {
    savedPeople,
    currentSynastry,
    isLoadingPeople,
    isAnalyzing,
    error,
    loadSavedPeople,
    analyze,
    pollSynastry,
    clearSynastry,
  } = useSynastryStore();

  const locale = i18n.language;

  const [selectedPerson, setSelectedPerson] = useState<SavedPersonResponse | null>(null);
  const [selectedType, setSelectedType] = useState<RelationshipType | null>(null);
  const [isPolling, setIsPolling] = useState(false);

  useEffect(() => {
    if (user?.id) {
      loadSavedPeople(user.id);
    }
  }, [user?.id]);

  const handleAnalyze = async () => {
    if (!selectedPerson || !selectedType || !user?.id) return;

    try {
      const result = await analyze(user.id, selectedPerson.id, selectedType, locale);

      if (result.status === 'PENDING') {
        setIsPolling(true);
        await pollSynastry(result.id);
        setIsPolling(false);
      }
    } catch (e) {
      Alert.alert('Hata', 'Analiz başlatılamadı. Lütfen önce doğum haritanızı hesaplayın.');
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return COLORS.strengthGreen;
    if (score >= 40) return COLORS.orange;
    return COLORS.redDark;
  };

  const isLoading = isAnalyzing || isPolling;
  const showResults = currentSynastry?.status === 'COMPLETED';

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Uyum Analizi</Text>
        <Text style={styles.headerSubtitle}>Sinastri & İlişki Haritası</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── SECTION 1: Saved People ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Önemli Kişiler</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/add-person')}
              accessibilityLabel="Kişi ekle"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="add-circle" size={26} color={COLORS.primary} />
            </TouchableOpacity>
          </View>

          {isLoadingPeople ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 16 }} />
          ) : error ? (
            <ErrorStateCard
              message={error}
              onRetry={() => user?.id && loadSavedPeople(user.id)}
              style={{ marginTop: 16 }}
              accessibilityLabel="Kişileri tekrar yükle"
            />
          ) : savedPeople.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyPeopleCard}
              onPress={() => router.push('/add-person')}
              accessibilityLabel="Kişi ekle"
              accessibilityRole="button"
            >
              <Ionicons name="person-add-outline" size={32} color={COLORS.subtext} />
              <Text style={styles.emptyPeopleText}>Kişi ekle</Text>
              <Text style={styles.emptyPeopleHint}>
                Sevdiklerinizi ekleyerek uyum analizi yapın
              </Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.peopleScroll}>
              {/* Add Person Button */}
              <TouchableOpacity
                style={styles.addPersonCard}
                onPress={() => router.push('/add-person')}
                accessibilityLabel="Kişi ekle"
                accessibilityRole="button"
              >
                <View style={styles.addPersonIcon}>
                  <Ionicons name="add" size={22} color={COLORS.primary} />
                </View>
                <Text style={styles.addPersonLabel}>Ekle</Text>
              </TouchableOpacity>

              {savedPeople.map((person) => (
                <TouchableOpacity
                  key={person.id}
                  style={[
                    styles.personCard,
                    selectedPerson?.id === person.id && styles.personCardSelected,
                  ]}
                  onPress={() => {
                    setSelectedPerson(person);
                    clearSynastry();
                  }}
                  accessibilityLabel={`${person.name} seç`}
                  accessibilityRole="button"
                  onLongPress={() => {
                    Alert.alert(
                      person.name,
                      'Bu kişiyi silmek istiyor musunuz?',
                      [
                        { text: 'İptal', style: 'cancel' },
                        {
                          text: 'Sil',
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await useSynastryStore.getState().removePerson(person.id, user!.id!);
                            } catch {
                              Alert.alert('Hata', 'Kişi silinemedi');
                            }
                          },
                        },
                      ],
                    );
                  }}
                >
                  <View style={[
                    styles.personAvatar,
                    selectedPerson?.id === person.id && styles.personAvatarSelected,
                  ]}>
                    <Text style={[
                      styles.personAvatarText,
                      selectedPerson?.id === person.id && styles.personAvatarTextSelected,
                    ]}>
                      {person.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.personName} numberOfLines={1}>
                    {person.name}
                  </Text>
                  <Text style={styles.personSign}>{person.sunSign ?? '–'}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>

        {/* ── SECTION 2: Relationship Type ────────────────────────── */}
        {selectedPerson && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>İlişki Türü</Text>
            <View style={styles.typeGrid}>
              {RELATIONSHIP_TYPES.map((t) => {
                const isSelected = selectedType === t.key;
                return (
                  <TouchableOpacity
                    key={t.key}
                    style={[
                      styles.typeCard,
                      isSelected && { borderColor: t.color, backgroundColor: t.bgColor },
                    ]}
                    onPress={() => {
                      setSelectedType(t.key);
                      clearSynastry();
                    }}
                    accessibilityLabel={locale === 'en' ? t.labelEN : t.labelTR}
                    accessibilityRole="button"
                  >
                    <Text style={styles.typeEmoji}>{t.emoji}</Text>
                    <Text style={[styles.typeLabel, isSelected && { color: t.color }]}>
                      {locale === 'en' ? t.labelEN : t.labelTR}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* ── ANALYZE BUTTON ──────────────────────────────────────── */}
        {selectedPerson && selectedType && !showResults && (
          <View style={styles.analyzeSection}>
            <TouchableOpacity
              style={[styles.analyzeButton, isLoading && styles.analyzeButtonDisabled]}
              onPress={handleAnalyze}
              disabled={isLoading}
              accessibilityLabel={`${selectedPerson.name} ile karşılaştır`}
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator color={COLORS.white} size="small" />
              ) : (
                <Ionicons name="sparkles" size={20} color={COLORS.white} />
              )}
              <Text style={styles.analyzeButtonText}>
                {isLoading ? 'Analiz ediliyor...' : `${selectedPerson.name} ile Karşılaştır`}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── SECTION 3: Analysis Results ─────────────────────────── */}
        {showResults && currentSynastry && (
          <View style={styles.section}>

            {/* Match Score */}
            <View style={styles.scoreCard}>
              <CircularScore
                score={currentSynastry.harmonyScore ?? 0}
                color={getScoreColor(currentSynastry.harmonyScore ?? 0)}
              />
              <View style={styles.scoreInfo}>
                <Text style={styles.scorePersonName}>{currentSynastry.personName}</Text>
                <View style={styles.scoreTypeRow}>
                  <Text style={styles.scoreTypeEmoji}>
                    {RELATIONSHIP_TYPES.find((t) => t.key === currentSynastry.relationshipType)?.emoji}
                  </Text>
                  <Text style={styles.scoreTypeLabel}>
                    {RELATIONSHIP_TYPES.find((t) => t.key === currentSynastry.relationshipType)?.labelTR}
                  </Text>
                </View>
                {currentSynastry.harmonyInsight && (
                  <Text style={styles.harmonyInsight}>{currentSynastry.harmonyInsight}</Text>
                )}
              </View>
            </View>

            {/* Strengths */}
            {currentSynastry.strengths.length > 0 && (
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}>💚 Güçlü Noktalar</Text>
                {currentSynastry.strengths.map((s, i) => (
                  <View key={i} style={[styles.breakdownCard, styles.strengthCard]}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.strengthGreen} style={{ marginRight: 10, marginTop: 1 }} />
                    <Text style={styles.breakdownText}>{s}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Challenges */}
            {currentSynastry.challenges.length > 0 && (
              <View style={styles.breakdownSection}>
                <Text style={styles.breakdownTitle}>🔥 Zorluklar</Text>
                {currentSynastry.challenges.map((c, i) => (
                  <View key={i} style={[styles.breakdownCard, styles.challengeCard]}>
                    <Ionicons name="alert-circle" size={18} color={COLORS.warningDark} style={{ marginRight: 10, marginTop: 1 }} />
                    <Text style={styles.breakdownText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Key Warning */}
            {currentSynastry.keyWarning && (
              <View style={[styles.breakdownCard, styles.warningCard]}>
                <Ionicons name="warning" size={18} color={COLORS.orange} style={{ marginRight: 10, marginTop: 1 }} />
                <Text style={[styles.breakdownText, { color: COLORS.warningDark }]}>
                  {currentSynastry.keyWarning}
                </Text>
              </View>
            )}

            {/* Cosmic Advice */}
            {currentSynastry.cosmicAdvice && (
              <View style={styles.cosmicAdviceCard}>
                <Text style={styles.cosmicAdviceTitle}>✨ Kozmik Tavsiye</Text>
                <Text style={styles.cosmicAdviceText}>{currentSynastry.cosmicAdvice}</Text>
              </View>
            )}

            {/* New Analysis Button */}
            <TouchableOpacity
              style={styles.newAnalysisButton}
              onPress={() => {
                clearSynastry();
                setSelectedType(null);
              }}
              accessibilityLabel="Yeni analiz yap"
              accessibilityRole="button"
            >
              <Text style={styles.newAnalysisText}>Yeni Analiz Yap</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Failed state */}
        {currentSynastry?.status === 'FAILED' && (
          <View style={styles.errorCard}>
            <ErrorStateCard
              message="Uyum analizi tamamlanamadı. Sunucu yanıt vermedi veya işlem zaman aşımına uğradı."
              onRetry={handleAnalyze}
              accessibilityLabel="Analizi tekrar dene"
            />
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>
    </SafeScreen>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  header: {
    paddingTop: Platform.OS === 'ios' ? 8 : 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: COLORS.primary },
  headerSubtitle: { fontSize: 12, color: COLORS.subtext, marginTop: 2 },

  scroll: { flex: 1 },

  section: { paddingHorizontal: 20, marginTop: 24 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text },

  addButton: { padding: 4 },

  emptyPeopleCard: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyPeopleText: { fontSize: 15, color: COLORS.subtext, fontWeight: '600' },
  emptyPeopleHint: { fontSize: 12, color: COLORS.subtext, textAlign: 'center' },

  peopleScroll: { marginHorizontal: -20, paddingHorizontal: 20 },

  addPersonCard: {
    width: 76,
    height: 96,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    gap: 6,
  },
  addPersonIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPersonLabel: { fontSize: 11, color: COLORS.primary, fontWeight: '600' },

  personCard: {
    width: 76,
    height: 96,
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    padding: 8,
    gap: 4,
  },
  personCardSelected: { borderColor: COLORS.primary, borderWidth: 2 },

  personAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  personAvatarSelected: { backgroundColor: COLORS.primary },
  personAvatarText: { fontSize: 17, fontWeight: '700', color: COLORS.primary },
  personAvatarTextSelected: { color: COLORS.white },
  personName: { fontSize: 11, color: COLORS.text, fontWeight: '600', textAlign: 'center' },
  personSign: { fontSize: 10, color: COLORS.subtext },

  typeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 4,
  },
  typeCard: {
    width: '46.5%',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  typeEmoji: { fontSize: 28 },
  typeLabel: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  analyzeSection: { paddingHorizontal: 20, marginTop: 28 },
  analyzeButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 10,
  },
  analyzeButtonDisabled: { opacity: 0.6 },
  analyzeButtonText: { fontSize: 16, fontWeight: '700', color: COLORS.white },

  scoreCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreNumber: { fontSize: 34, fontWeight: '800', textAlign: 'center' },
  scoreLabel: { fontSize: 12, color: COLORS.subtext, textAlign: 'center', marginTop: -2 },
  scoreInfo: { flex: 1, gap: 6 },
  scorePersonName: { fontSize: 19, fontWeight: '700', color: COLORS.text },
  scoreTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  scoreTypeEmoji: { fontSize: 16 },
  scoreTypeLabel: { fontSize: 13, color: COLORS.primary, fontWeight: '600' },
  harmonyInsight: { fontSize: 13, color: COLORS.subtext, lineHeight: 19, marginTop: 2 },

  breakdownSection: { marginBottom: 16 },
  breakdownTitle: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 10 },
  breakdownCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
  },
  breakdownText: { flex: 1, fontSize: 13, color: COLORS.text, lineHeight: 20 },
  strengthCard: {
    backgroundColor: COLORS.successBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.strengthGreen,
  },
  challengeCard: {
    backgroundColor: COLORS.warningBg,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.warningDark,
  },
  warningCard: {
    backgroundColor: COLORS.neutralBg,
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.orange,
  },

  cosmicAdviceCard: {
    backgroundColor: COLORS.primarySoft,
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
    gap: 10,
  },
  cosmicAdviceTitle: { fontSize: 15, fontWeight: '700', color: COLORS.primary },
  cosmicAdviceText: { fontSize: 14, color: COLORS.text, lineHeight: 22 },

  newAnalysisButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    backgroundColor: COLORS.surface,
  },
  newAnalysisText: { fontSize: 14, color: COLORS.subtext, fontWeight: '600' },

  errorCard: {
    margin: 20,
    padding: 24,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    gap: 12,
  },
  errorText: { fontSize: 14, color: COLORS.error, textAlign: 'center' },
});
