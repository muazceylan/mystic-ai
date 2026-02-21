import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../components/OnboardingBackground';
import { useTheme } from '../context/ThemeContext';
import { SafeScreen } from '../components/ui';

export default function HelpScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();

  const FAQ = [
    { q: t('help.faq1q'), a: t('help.faq1a') },
    { q: t('help.faq2q'), a: t('help.faq2a') },
    { q: t('help.faq3q'), a: t('help.faq3a') },
    { q: t('help.faq4q'), a: t('help.faq4a') },
    { q: t('help.faq5q'), a: t('help.faq5a') },
  ];

  const QUICK_ACTIONS = [
    { id: 'email', titleKey: 'help.supportEmail', icon: 'mail-outline', action: () => Linking.openURL('mailto:destek@mystic.ai') },
    { id: 'feedback', titleKey: 'help.sendFeedback', icon: 'chatbubble-outline', action: () => Alert.alert(t('help.thanks'), t('help.feedbackComingSoon')) },
    { id: 'rate', titleKey: 'help.rateApp', icon: 'star-outline', action: () => Alert.alert(t('help.comingSoon'), t('help.appStoreComingSoon')) },
  ];
  const [expanded, setExpanded] = React.useState<number | null>(null);
  const styles = makeStyles(colors);

  const toggle = (i: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => (prev === i ? null : i));
  };

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('help.title')}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>{t('help.quickAccess')}</Text>
        <View style={styles.card}>
          {QUICK_ACTIONS.map((a, i) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.actionRow, i > 0 && styles.rowBorder]}
              accessibilityLabel={t(a.titleKey)}
              accessibilityRole="button"
              onPress={a.action}
              activeOpacity={0.7}
            >
              <View style={styles.actionLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name={a.icon as any} size={18} color={colors.primary} />
                </View>
                <Text style={styles.actionTitle}>{t(a.titleKey)}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.subtext} />
            </TouchableOpacity>
          ))}
        </View>

        {/* FAQ */}
        <Text style={styles.sectionTitle}>{t('help.faq')}</Text>
        <View style={styles.card}>
          {FAQ.map((item, i) => (
            <View key={i} style={i > 0 ? styles.rowBorder : undefined}>
              <TouchableOpacity
                style={styles.faqHeader}
                onPress={() => toggle(i)}
                accessibilityLabel={expanded === i ? `${item.q} kapat` : `${item.q} genişlet`}
                accessibilityRole="button"
                activeOpacity={0.7}
              >
                <Text style={styles.faqQ}>{item.q}</Text>
                <Ionicons
                  name={expanded === i ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color={colors.subtext}
                />
              </TouchableOpacity>
              {expanded === i && (
                <Text style={styles.faqA}>{item.a}</Text>
              )}
            </View>
          ))}
        </View>

        <Text style={styles.version}>{t('profile.version')} · destek@mystic.ai</Text>
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
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: C.text },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text, marginBottom: 12, marginTop: 20 },
  card: {
    backgroundColor: C.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  rowBorder: { borderTopWidth: 1, borderTopColor: C.border },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  actionLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: C.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionTitle: { fontSize: 14, fontWeight: '500', color: C.text },
  faqHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    gap: 12,
  },
  faqQ: { flex: 1, fontSize: 13, fontWeight: '600', color: C.text },
  faqA: { fontSize: 13, color: C.subtext, lineHeight: 20, paddingHorizontal: 16, paddingBottom: 14 },
  version: { fontSize: 12, color: C.subtext, textAlign: 'center', marginTop: 24 },
});
}
