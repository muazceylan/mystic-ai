import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from '../utils/haptics';
import { useTheme, ThemeMode } from '../context/ThemeContext';
import { useTranslation } from 'react-i18next';
import { SafeScreen, TabHeader } from '../components/ui';

const THEMES: { id: ThemeMode; titleKey: string; subtitleKey: string; icon: string }[] = [
  { id: 'light', titleKey: 'theme.light', subtitleKey: 'theme.lightDesc', icon: 'sunny-outline' },
  { id: 'dark', titleKey: 'theme.dark', subtitleKey: 'theme.darkDesc', icon: 'moon-outline' },
  { id: 'system', titleKey: 'theme.system', subtitleKey: 'theme.systemDesc', icon: 'phone-portrait-outline' },
];

export default function ThemeSettingsScreen() {
  const { colors, mode, activeTheme, setMode } = useTheme();
  const { t } = useTranslation();

  const handleSelect = async (theme: ThemeMode) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    await setMode(theme);
  };

  const S = makeStyles(colors);

  return (
    <SafeScreen>
      <View style={S.container}>
        <TabHeader title={t('theme.title')} />

        <ScrollView style={S.scroll} contentContainerStyle={S.scrollContent}>
          <Text style={S.hint}>{t('theme.hint')}</Text>

          <View style={S.card}>
            {THEMES.map((theme, index) => {
              const isSelected = mode === theme.id;
              return (
                <TouchableOpacity
                  key={theme.id}
                  style={[S.row, index > 0 && S.rowBorder]}
                  accessibilityLabel={t('theme.selectA11y', { theme: t(theme.titleKey) })}
                  accessibilityRole="button"
                  onPress={() => handleSelect(theme.id)}
                  activeOpacity={0.7}
                >
                  <View style={S.rowLeft}>
                    <View style={[S.iconWrap, isSelected && S.iconWrapActive]}>
                      <Ionicons
                        name={theme.icon as any}
                        size={18}
                        color={isSelected ? colors.white : colors.primary}
                      />
                    </View>
                    <View>
                      <Text style={[S.rowTitle, isSelected && S.rowTitleActive]}>
                        {t(theme.titleKey)}
                      </Text>
                      <Text style={S.rowSub}>{t(theme.subtitleKey)}</Text>
                    </View>
                  </View>
                  {isSelected ? <Ionicons name="checkmark-circle" size={22} color={colors.primary} /> : null}
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
    </SafeScreen>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40, paddingTop: 16 },
    hint: {
      fontSize: 13,
      color: C.subtext,
      marginBottom: 20,
      backgroundColor: C.primarySoft,
      padding: 12,
      borderRadius: 10,
    },
    card: {
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      overflow: 'hidden',
      marginBottom: 16,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
    rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: C.primarySoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconWrapActive: { backgroundColor: C.primary },
    rowTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    rowTitleActive: { color: C.primary },
    rowSub: { fontSize: 12, color: C.subtext, marginTop: 2 },
    previewCard: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: C.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.border,
      padding: 16,
    },
    previewTitle: { fontSize: 14, fontWeight: '600', color: C.text },
    previewSub: { fontSize: 12, color: C.subtext, marginTop: 2 },
  });
}
