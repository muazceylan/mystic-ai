import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { SafeScreen, TabHeader } from '../components/ui';

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    topBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.primarySoft,
      borderRadius: 12,
      padding: 14,
      marginBottom: 8,
    },
    topBadgeText: { fontSize: 14, fontWeight: '600', color: C.primary },
    updated: { fontSize: 12, color: C.subtext, marginBottom: 20 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: '700', color: C.text, marginBottom: 6 },
    sectionBody: { fontSize: 13, color: C.subtext, lineHeight: 20 },
    linkBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      paddingVertical: 14,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.primary,
      backgroundColor: C.primarySoft,
      marginTop: 8,
    },
    linkBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },
  });
}

export default function PrivacyScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const contactEmail = t('privacy.contactEmail');
  const sections = [
    { titleKey: 'privacy.section1Title', bodyKey: 'privacy.section1Body' },
    { titleKey: 'privacy.section2Title', bodyKey: 'privacy.section2Body' },
    { titleKey: 'privacy.section3Title', bodyKey: 'privacy.section3Body' },
    { titleKey: 'privacy.section4Title', bodyKey: 'privacy.section4Body' },
    { titleKey: 'privacy.section5Title', bodyKey: 'privacy.section5Body' },
  ];

  return (
    <SafeScreen>
      <View style={styles.container}>
        <TabHeader title={t('privacy.title')} showDefaultRightIcons={false} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.topBadge}>
            <Ionicons name="shield-checkmark" size={22} color={colors.primary} />
            <Text style={styles.topBadgeText}>{t('privacy.yourDataInControl')}</Text>
          </View>

          <Text style={styles.updated}>{t('privacy.lastUpdate')}</Text>

          {sections.map((section, index) => (
            <View key={index} style={styles.section}>
              <Text style={styles.sectionTitle}>{t(section.titleKey)}</Text>
              <Text style={styles.sectionBody}>{t(section.bodyKey)}</Text>
            </View>
          ))}

          <TouchableOpacity
            style={styles.linkBtn}
            onPress={() => Linking.openURL(`mailto:${contactEmail}`)}
            accessibilityLabel={t('privacy.contactAccessibility')}
            accessibilityRole="link"
          >
            <Ionicons name="mail-outline" size={16} color={colors.primary} />
            <Text style={styles.linkBtnText}>{contactEmail}</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    </SafeScreen>
  );
}
