import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';
import { SafeScreen } from '../../components/ui';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useTheme } from '../../context/ThemeContext';
import { NameTagChip } from '../../components/NameModule';
import { trackEvent } from '../../services/analytics';
import { useAuthStore } from '../../store/useAuthStore';
import {
  NAME_ANALYSIS_TUTORIAL_TARGET_KEYS,
  SpotlightTarget,
  TUTORIAL_IDS,
  TUTORIAL_SCREEN_KEYS,
  useTutorial,
  useTutorialTrigger,
} from '../../features/tutorial';

const POPULAR_TAGS = ['modern', 'classic', 'quranic', 'nature', 'strong', 'soft'];
const QUICK_NAMES = ['Elif', 'Mira', 'Yusuf', 'Defne', 'Kerem', 'Alina'];

function makeStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 18,
      paddingBottom: 12,
    },
    backButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
    },
    scrollContent: {
      paddingHorizontal: 18,
      paddingBottom: 44,
      gap: 14,
    },
    hero: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 20,
      padding: 18,
      gap: 10,
    },
    heroKicker: {
      color: colors.primary,
      fontSize: 11,
      fontWeight: '800',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    heroTitle: {
      color: colors.text,
      fontSize: 24,
      lineHeight: 30,
      fontWeight: '900',
    },
    heroDescription: {
      color: colors.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    searchRow: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 14,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      gap: 8,
    },
    searchInput: {
      flex: 1,
      color: colors.text,
      paddingVertical: 12,
      fontSize: 15,
    },
    ctaRow: {
      flexDirection: 'row',
      gap: 10,
    },
    primaryButton: {
      flex: 1,
      backgroundColor: colors.primary,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    primaryButtonText: {
      color: colors.white,
      fontSize: 14,
      fontWeight: '800',
    },
    secondaryButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 12,
    },
    secondaryButtonText: {
      color: colors.text,
      fontSize: 14,
      fontWeight: '700',
    },
    section: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 14,
      gap: 10,
    },
    sectionTitle: {
      color: colors.text,
      fontSize: 15,
      fontWeight: '800',
    },
    tagsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quickGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    quickButton: {
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      paddingHorizontal: 12,
      paddingVertical: 8,
    },
    quickButtonText: {
      color: colors.textSoft,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}

export default function NameLandingScreen() {
  const { colors } = useTheme();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation();
  const tabBarHeight = useBottomTabBarHeight();
  const userId = useAuthStore((state) => state.user?.id);
  const { reopenTutorialById } = useTutorial();
  const { triggerInitial: triggerInitialTutorials } = useTutorialTrigger(TUTORIAL_SCREEN_KEYS.NAME_ANALYSIS);
  const tutorialBootstrapRef = useRef<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    trackEvent('name_module_opened', {
      entry_point: 'service_slider',
      screen: 'name_landing',
    });
  }, []);

  useEffect(() => {
    const scope = userId ? String(userId) : 'guest';
    if (tutorialBootstrapRef.current === scope) {
      return;
    }

    tutorialBootstrapRef.current = scope;
    void triggerInitialTutorials();
  }, [triggerInitialTutorials, userId]);

  const handlePressTutorialHelp = useCallback(() => {
    void reopenTutorialById(TUTORIAL_IDS.NAME_ANALYSIS_FOUNDATION, 'name_analysis');
  }, [reopenTutorialById]);

  const goToSearch = (preset?: string) => {
    const token = (preset ?? query).trim();
    router.push({
      pathname: '/(tabs)/name-search',
      params: token ? { q: token } : {},
    });
  };

  return (
    <SafeScreen edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <OnboardingBackground />
        <View style={styles.header}>
          <Pressable style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={styles.headerTitle}>{t('home.nameAnalysis', { defaultValue: 'İsim Analizi' })}</Text>
          <SpotlightTarget targetKey={NAME_ANALYSIS_TUTORIAL_TARGET_KEYS.HELP_ENTRY}>
            <Pressable
              style={styles.backButton}
              onPress={handlePressTutorialHelp}
              accessibilityRole="button"
              accessibilityLabel="İsim analizi rehberini tekrar aç"
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.text} />
            </Pressable>
          </SpotlightTarget>
        </View>

        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 18 }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.hero}>
            <Text style={styles.heroKicker}>Name Module</Text>
            <Text style={styles.heroTitle}>Anlam, köken ve karakter ipuçları</Text>
            <Text style={styles.heroDescription}>
              Tek bakışta isim özeti, detayda güvenilir açıklama ve benzer isim keşfi.
            </Text>

            <SpotlightTarget targetKey={NAME_ANALYSIS_TUTORIAL_TARGET_KEYS.NAME_INPUT}>
              <View style={styles.searchRow}>
                <Ionicons name="search" size={18} color={colors.subtext} />
                <TextInput
                  value={query}
                  onChangeText={setQuery}
                  placeholder={t('nameModule.searchPlaceholder', { defaultValue: 'İsim ara (örn: Elif)' })}
                  placeholderTextColor={colors.subtext}
                  style={styles.searchInput}
                  returnKeyType="search"
                  onSubmitEditing={() => goToSearch()}
                />
              </View>
            </SpotlightTarget>

            <SpotlightTarget targetKey={NAME_ANALYSIS_TUTORIAL_TARGET_KEYS.SAVE_SHARE_ENTRY}>
              <View style={styles.ctaRow}>
                <Pressable style={styles.primaryButton} onPress={() => goToSearch()}>
                  <Text style={styles.primaryButtonText}>İsim Ara</Text>
                </Pressable>
                <Pressable style={styles.secondaryButton} onPress={() => router.push('/(tabs)/name-favorites')}>
                  <Text style={styles.secondaryButtonText}>Favorilerim</Text>
                </Pressable>
              </View>
            </SpotlightTarget>
          </View>

          <SpotlightTarget targetKey={NAME_ANALYSIS_TUTORIAL_TARGET_KEYS.MEANING_PANEL}>
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Popüler Kategoriler</Text>
              <View style={styles.tagsRow}>
                {POPULAR_TAGS.map((tag) => (
                  <NameTagChip
                    key={tag}
                    label={tag}
                    onPress={() => router.push({ pathname: '/(tabs)/name-search', params: { tag } })}
                  />
                ))}
              </View>
            </View>
          </SpotlightTarget>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Hızlı Girişler</Text>
            <View style={styles.quickGrid}>
              {QUICK_NAMES.map((name) => (
                <Pressable key={name} style={styles.quickButton} onPress={() => goToSearch(name)}>
                  <Text style={styles.quickButtonText}>{name}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
