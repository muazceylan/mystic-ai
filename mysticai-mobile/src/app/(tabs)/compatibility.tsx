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
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import i18n from '../../i18n';
import { ErrorStateCard, SafeScreen, TabHeader } from '../../components/ui';
import { useTabHeaderActions } from '../../hooks/useTabHeaderActions';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RelationshipTypeOption {
  key: RelationshipType;
  emoji: string;
  labelTR: string;
  labelEN: string;
  color: string;
  bgColor: string;
}

function getRelationshipTypes(C: ReturnType<typeof useTheme>['colors']): RelationshipTypeOption[] {
  return [
    { key: 'LOVE', emoji: '💍', labelTR: 'Aşk', labelEN: 'Love', color: C.pink, bgColor: C.pinkBg },
    { key: 'BUSINESS', emoji: '🤝', labelTR: 'İş', labelEN: 'Business', color: C.blue, bgColor: C.blueBg },
    { key: 'FRIENDSHIP', emoji: '🌟', labelTR: 'Arkadaş', labelEN: 'Friend', color: C.orange, bgColor: C.neutralBg },
    { key: 'RIVAL', emoji: '🥊', labelTR: 'Rakip', labelEN: 'Rival', color: C.redDark, bgColor: C.redBg },
  ];
}

// ─── Circular Progress ────────────────────────────────────────────────────────

const CircularScore: React.FC<{ score: number; color: string; borderColor: string; scoreNumberStyle: any; scoreLabelStyle: any }> = ({ score, color, borderColor, scoreNumberStyle, scoreLabelStyle }) => {
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
          borderColor: borderColor,
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
        <Text style={[scoreNumberStyle, { color }]}>{score}%</Text>
        <Text style={scoreLabelStyle}>Uyum</Text>
      </View>
    </View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    headerWrap: {
      backgroundColor: C.surface,
      borderBottomWidth: 1,
      borderBottomColor: C.border,
    },
    scroll: { flex: 1 },
    section: { paddingHorizontal: 20, marginTop: 24 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    addButton: { padding: 4 },
    emptyPeopleCard: {
      alignItems: 'center',
      padding: 32,
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: C.border,
      borderStyle: 'dashed',
      gap: 8,
    },
    emptyPeopleText: { fontSize: 15, color: C.subtext, fontWeight: '600' },
    emptyPeopleHint: { fontSize: 12, color: C.subtext, textAlign: 'center' },
    peopleScroll: { marginHorizontal: -20, paddingHorizontal: 20 },
    addPersonCard: {
      width: 76,
      height: 96,
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1.5,
      borderColor: C.primary,
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
      backgroundColor: C.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    addPersonLabel: { fontSize: 11, color: C.primary, fontWeight: '600' },
    personCard: {
      width: 76,
      height: 96,
      backgroundColor: C.surface,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 10,
      padding: 8,
      gap: 4,
    },
    personCardSelected: { borderColor: C.primary, borderWidth: 2 },
    personAvatar: {
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: C.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    personAvatarSelected: { backgroundColor: C.primary },
    personAvatarText: { fontSize: 17, fontWeight: '700', color: C.primary },
    personAvatarTextSelected: { color: C.white },
    personName: { fontSize: 11, color: C.text, fontWeight: '600', textAlign: 'center' },
    personSign: { fontSize: 10, color: C.subtext },
    typeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 4,
    },
    typeCard: {
      width: '46.5%',
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1.5,
      borderColor: C.border,
      paddingVertical: 20,
      alignItems: 'center',
      gap: 8,
    },
    typeEmoji: { fontSize: 28 },
    typeLabel: { fontSize: 14, fontWeight: '700', color: C.text },
    analyzeSection: { paddingHorizontal: 20, marginTop: 28 },
    analyzeButton: {
      backgroundColor: C.primary,
      borderRadius: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 16,
      gap: 10,
    },
    analyzeButtonDisabled: { opacity: 0.6 },
    analyzeButtonText: { fontSize: 16, fontWeight: '700', color: C.white },
    scoreCard: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 20,
      backgroundColor: C.surface,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: C.border,
    },
    scoreNumber: { fontSize: 34, fontWeight: '800', textAlign: 'center' },
    scoreLabel: { fontSize: 12, color: C.subtext, textAlign: 'center', marginTop: -2 },
    scoreInfo: { flex: 1, gap: 6 },
    scorePersonName: { fontSize: 19, fontWeight: '700', color: C.text },
    scoreTypeRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    scoreTypeEmoji: { fontSize: 16 },
    scoreTypeLabel: { fontSize: 13, color: C.primary, fontWeight: '600' },
    harmonyInsight: { fontSize: 13, color: C.subtext, lineHeight: 19, marginTop: 2 },
    breakdownSection: { marginBottom: 16 },
    breakdownTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 10 },
    breakdownCard: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    breakdownText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 20 },
    strengthCard: {
      backgroundColor: C.successBg,
      borderLeftWidth: 3,
      borderLeftColor: C.strengthGreen,
    },
    challengeCard: {
      backgroundColor: C.warningBg,
      borderLeftWidth: 3,
      borderLeftColor: C.warningDark,
    },
    warningCard: {
      backgroundColor: C.neutralBg,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
      borderLeftWidth: 3,
      borderLeftColor: C.orange,
    },
    cosmicAdviceCard: {
      backgroundColor: C.primarySoft,
      borderRadius: 20,
      padding: 20,
      marginBottom: 20,
      gap: 10,
    },
    cosmicAdviceTitle: { fontSize: 15, fontWeight: '700', color: C.primary },
    cosmicAdviceText: { fontSize: 14, color: C.text, lineHeight: 22 },
    newAnalysisButton: {
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 12,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 12,
      backgroundColor: C.surface,
    },
    newAnalysisText: { fontSize: 14, color: C.subtext, fontWeight: '600' },
    errorCard: {
      margin: 20,
      padding: 24,
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      alignItems: 'center',
      gap: 12,
    },
    errorText: { fontSize: 14, color: C.error, textAlign: 'center' },
  });
}

export default function CompatibilityScreen() {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const RELATIONSHIP_TYPES = getRelationshipTypes(colors);
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

  const { t } = useTranslation();
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
      Alert.alert(t('common.error'), t('natalChart.analysisStartError'));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return colors.strengthGreen;
    if (score >= 40) return colors.orange;
    return colors.redDark;
  };

  const isLoading = isAnalyzing || isPolling;
  const showResults = currentSynastry?.status === 'COMPLETED';

  return (
    <SafeScreen edges={['top', 'left', 'right']} style={styles.container}>
      {/* Header */}
      <TabHeader
        title={t('compatibility.title')}
        subtitle={t('compatibility.subtitle')}
        {...useTabHeaderActions()}
      />

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── SECTION 1: Saved People ─────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('compatibility.importantPeople')}</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => router.push('/add-person')}
              accessibilityLabel="Kişi ekle"
              accessibilityRole="button"
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            >
              <Ionicons name="add-circle" size={26} color={colors.primary} />
            </TouchableOpacity>
          </View>

          {isLoadingPeople ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
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
              <Ionicons name="person-add-outline" size={32} color={colors.subtext} />
              <Text style={styles.emptyPeopleText}>{t('compatibility.addPerson')}</Text>
              <Text style={styles.emptyPeopleHint}>
                {t('compatibility.addPersonHint')}
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
                  <Ionicons name="add" size={22} color={colors.primary} />
                </View>
                <Text style={styles.addPersonLabel}>{t('compatibility.add')}</Text>
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
                      t('compatibility.deletePersonConfirm'),
                      [
                        { text: t('common.cancel'), style: 'cancel' },
                        {
                          text: t('common.delete'),
                          style: 'destructive',
                          onPress: async () => {
                            try {
                              await useSynastryStore.getState().removePerson(person.id, user!.id!);
                            } catch {
                              Alert.alert(t('common.error'), t('natalChart.deletePersonError'));
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
                <ActivityIndicator color={colors.white} size="small" />
              ) : (
                <Ionicons name="sparkles" size={20} color={colors.white} />
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
                borderColor={colors.border}
                scoreNumberStyle={styles.scoreNumber}
                scoreLabelStyle={styles.scoreLabel}
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
                    <Ionicons name="checkmark-circle" size={18} color={colors.strengthGreen} style={{ marginRight: 10, marginTop: 1 }} />
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
                    <Ionicons name="alert-circle" size={18} color={colors.warningDark} style={{ marginRight: 10, marginTop: 1 }} />
                    <Text style={styles.breakdownText}>{c}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Key Warning */}
            {currentSynastry.keyWarning && (
              <View style={[styles.breakdownCard, styles.warningCard]}>
                <Ionicons name="warning" size={18} color={colors.orange} style={{ marginRight: 10, marginTop: 1 }} />
                <Text style={[styles.breakdownText, { color: colors.warningDark }]}>
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

