import { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { i18n, LANGUAGE_STORAGE_KEY } from '../i18n';
import { useAuthStore } from '../store/useAuthStore';
import { updateProfile } from '../services/auth';
import OnboardingBackground from '../components/OnboardingBackground';
import { SafeScreen } from '../components/ui';

const LANGUAGES = [
  { id: 'tr', titleKey: 'language.turkish', subtitleKey: 'language.turkishDesc', flag: '🇹🇷' },
  { id: 'en', titleKey: 'language.english', subtitleKey: 'language.englishDesc', flag: '🇬🇧' },
] as const;

export default function LanguageSettingsScreen() {
  const { colors } = useTheme();
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const [saving, setSaving] = useState(false);
  const [currentLang, setCurrentLang] = useState<string>(i18n.language ?? 'tr');

  const handleSelect = async (lang: string) => {
    if (lang === currentLang || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setSaving(true);
    try {
      // 1. Immediate UI language switch
      await i18n.changeLanguage(lang);
      // 2. Persist locally
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
      setCurrentLang(lang);
      // 3. Persist to backend (non-critical — UI change already applied)
      if (user) {
        const res = await updateProfile({ preferredLanguage: lang });
        setUser({ ...user, ...res.data });
      }
    } catch {
      // Local change already applied; backend failure is non-critical
    } finally {
      setSaving(false);
    }
  };

  const S = makeStyles(colors);

  return (
    <SafeScreen>
      <View style={S.container}>
        <OnboardingBackground />
      <View style={S.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={S.backBtn}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={S.headerTitle}>{t('language.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent}>
        <Text style={S.hint}>{t('language.hint')}</Text>

        <View style={S.card}>
          {LANGUAGES.map((lang, index) => {
            const isSelected = currentLang === lang.id;
            return (
              <TouchableOpacity
                key={lang.id}
                style={[S.row, index > 0 && S.rowBorder]}
                accessibilityLabel={`${lang.name} dilini seç`}
                accessibilityRole="button"
                onPress={() => handleSelect(lang.id)}
                activeOpacity={0.7}
                disabled={saving}
              >
                <View style={S.rowLeft}>
                  <View style={[S.iconWrap, isSelected && S.iconWrapActive]}>
                    <Text style={S.flagText}>{lang.flag}</Text>
                  </View>
                  <View>
                    <Text style={[S.rowTitle, isSelected && S.rowTitleActive]}>
                      {t(lang.titleKey)}
                    </Text>
                    <Text style={S.rowSub}>{t(lang.subtitleKey)}</Text>
                  </View>
                </View>
                {saving && isSelected ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : isSelected ? (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                ) : null}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={S.noteCard}>
          <Ionicons
            name="information-circle-outline"
            size={18}
            color={colors.primary}
            style={{ marginTop: 1 }}
          />
          <Text style={S.noteText}>{t('language.aiNote')}</Text>
        </View>
      </ScrollView>
      </View>
    </SafeScreen>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 56,
      paddingBottom: 12,
    },
    backBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: C.surface,
      alignItems: 'center', justifyContent: 'center',
      borderWidth: 1, borderColor: C.border,
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
    hint: {
      fontSize: 13, color: C.subtext, marginBottom: 20,
      backgroundColor: C.primarySoft, padding: 12, borderRadius: 10,
    },
    card: {
      backgroundColor: C.surface, borderRadius: 16,
      borderWidth: 1, borderColor: C.border, overflow: 'hidden', marginBottom: 16,
    },
    row: {
      flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
      paddingVertical: 14, paddingHorizontal: 16,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: C.primarySoft, alignItems: 'center', justifyContent: 'center',
    },
    iconWrapActive: { backgroundColor: C.primary },
    flagText: { fontSize: 18 },
    rowTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    rowTitleActive: { color: C.primary },
    rowSub: { fontSize: 12, color: C.subtext, marginTop: 2 },
    noteCard: {
      flexDirection: 'row', alignItems: 'flex-start', gap: 10,
      backgroundColor: C.surface, borderRadius: 16,
      borderWidth: 1, borderColor: C.border, padding: 16,
    },
    noteText: { flex: 1, fontSize: 12, color: C.subtext, lineHeight: 18 },
  });
}
