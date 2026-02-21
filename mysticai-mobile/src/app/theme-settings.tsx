import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../components/OnboardingBackground';
import { COLORS } from '../constants/colors';

const THEMES: { id: ThemeMode; titleKey: string; subtitleKey: string; icon: string }[] = [
  { id: 'light', titleKey: 'theme.light',  subtitleKey: 'theme.lightDesc',  icon: 'sunny-outline' },
  { id: 'dark',  titleKey: 'theme.dark',   subtitleKey: 'theme.darkDesc',   icon: 'moon-outline' },
  { id: 'system',titleKey: 'theme.system', subtitleKey: 'theme.systemDesc', icon: 'phone-portrait-outline' },
];

export default function ThemeSettingsScreen() {
  const { colors, mode, activeTheme, setMode } = useTheme();
  const { t } = useTranslation();

  const handleSelect = async (theme: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await setMode(theme); // immediately updates ThemeContext → whole app re-renders
  };

  const S = makeStyles(colors);

  return (
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
        <Text style={S.headerTitle}>{t('theme.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent}>
        <Text style={S.hint}>{t('theme.hint')}</Text>

        <View style={S.card}>
          {THEMES.map((theme, index) => {
            const isSelected = mode === theme.id;
            return (
              <TouchableOpacity
                key={theme.id}
                style={[S.row, index > 0 && S.rowBorder]}
                accessibilityLabel={`${theme.name} temasını seç`}
                accessibilityRole="button"
                onPress={() => handleSelect(theme.id)}
                activeOpacity={0.7}
              >
                <View style={S.rowLeft}>
                  <View style={[S.iconWrap, isSelected && S.iconWrapActive]}>
                    <Ionicons
                      name={theme.icon as any}
                      size={18}
                      color={isSelected ? COLORS.white : colors.primary}
                    />
                  </View>
                  <View>
                    <Text style={[S.rowTitle, isSelected && S.rowTitleActive]}>
                      {t(theme.titleKey)}
                    </Text>
                    <Text style={S.rowSub}>{t(theme.subtitleKey)}</Text>
                  </View>
                </View>
                {isSelected && (
                  <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={S.previewCard}>
          <Ionicons
            name={activeTheme === 'dark' ? 'moon' : 'sunny'}
            size={28}
            color={colors.primary}
          />
          <View style={{ marginLeft: 14 }}>
            <Text style={S.previewTitle}>
              {t('theme.current')} {activeTheme === 'dark' ? t('theme.currentDark') : t('theme.currentLight')}
            </Text>
            <Text style={S.previewSub}>
              {mode === 'system' ? t('theme.automatic') : t('theme.manual')}
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
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
    rowTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    rowTitleActive: { color: C.primary },
    rowSub: { fontSize: 12, color: C.subtext, marginTop: 2 },
    previewCard: {
      flexDirection: 'row', alignItems: 'center',
      backgroundColor: C.surface, borderRadius: 16,
      borderWidth: 1, borderColor: C.border, padding: 16,
    },
    previewTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    previewSub: { fontSize: 12, color: C.subtext, marginTop: 2 },
  });
}
