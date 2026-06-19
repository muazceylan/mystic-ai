import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Head from 'expo-router/head';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { SafeScreen, TabHeader } from '../components/ui';

type ScreenLocale = 'tr' | 'en';

const ROOT_SITE_URL = 'https://astroguru.app';
const SUPPORT_EMAIL = 'support@astroguru.app';

const CONTENT: Record<ScreenLocale, {
  title: string;
  description: string;
  badge: string;
  pathLabel: string;
  pathValue: string;
  stepsTitle: string;
  steps: string[];
  afterTitle: string;
  afterItems: string[];
  supportTitle: string;
  supportBody: string;
  supportButton: string;
}> = {
  tr: {
    title: 'Hesap ve Veri Silme',
    description: 'AstroGuru hesabınızı ve ilişkili kişisel verilerinizi uygulama içinden kalıcı olarak silebilirsiniz.',
    badge: 'Uygulama içi hesap silme bilgisi',
    pathLabel: 'Uygulama içi yol',
    pathValue: 'Profil → Hesabı Kalıcı Olarak Sil',
    stepsTitle: 'Nasıl yapılır?',
    steps: [
      'AstroGuru uygulamasını açın ve hesabınıza giriş yapın.',
      'Profil ekranına gidin.',
      '"Hesabı Kalıcı Olarak Sil" seçeneğini açın ve onayı tamamlayın.',
    ],
    afterTitle: 'Silme sonrasında ne olur?',
    afterItems: [
      'Hesap bilgileri, e-posta adresi, profil detayları, doğum tarihi/saati/yeri, astroloji ve numeroloji verileri, rüya kayıtları, bildirim token\'ları ve uygulama tercihleri silinir veya anonimleştirilir.',
      'Hesap silme işleminden sonra hesabınız aktif kullanıcı hesabı olarak kullanılamaz.',
      'Güvenlik, yasal yükümlülük veya denetim gerektiren durumlarda sınırlı kayıtlar belirli bir süre saklanabilir; bu kayıtlar aktif hesap olarak kullanılmaz.',
    ],
    supportTitle: 'Uygulamaya erişemiyorsanız',
    supportBody: 'Uygulamaya giriş yapamıyorsanız veya silme akışı beklediğiniz gibi çalışmıyorsa aşağıdaki butona tıklayarak e-posta gönderebilirsiniz.',
    supportButton: 'Hesap Silme Talebi Gönder',
  },
  en: {
    title: 'Account and Data Deletion',
    description: 'You can permanently delete your AstroGuru account and associated personal data from inside the app.',
    badge: 'In-app account deletion info',
    pathLabel: 'In-app path',
    pathValue: 'Profile → Permanently Delete Account',
    stepsTitle: 'How it works',
    steps: [
      'Open AstroGuru and sign in to the account you want to remove.',
      'Go to the Profile screen.',
      'Select "Permanently Delete Account" and complete the confirmation.',
    ],
    afterTitle: 'What happens after deletion?',
    afterItems: [
      'Account information, email address, profile details, birth date/time/place, astrology and numerology data, dream records, notification tokens, and app preferences are deleted or anonymised.',
      'After account deletion, your account can no longer be used as an active user account.',
      'Security, legal obligation, or audit records may be retained for a limited period where required; these records are not used as an active account.',
    ],
    supportTitle: 'If you cannot access the app',
    supportBody: 'If you cannot sign in or the deletion flow does not work as expected, use the button below to send a pre-filled email request.',
    supportButton: 'Send Account Deletion Request',
  },
};

export default function AccountDeletionInfoScreen({ locale }: { locale: ScreenLocale }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const content = CONTENT[locale];
  const canonicalUrl = `${ROOT_SITE_URL}/account-deletion`;
  const subject =
    locale === 'en' ? 'AstroGuru Account Deletion Request' : 'AstroGuru Hesap Silme Talebi';
  const body =
    locale === 'en'
      ? 'Hello AstroGuru team,\n\nI request the deletion of my AstroGuru account and associated personal data.\n\nAccount email: \nSign-in method: Email / Google / Apple'
      : 'Merhaba AstroGuru ekibi,\n\nAstroGuru hesabımın ve hesabımla ilişkili kişisel verilerimin silinmesini talep ediyorum.\n\nHesap e-postam: \nGiriş yöntemi: E-posta / Google / Apple';

  const openSupport = () => {
    void Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`,
    );
  };

  return (
    <SafeScreen>
      <Head>
        <title>{`AstroGuru | ${content.title}`}</title>
        <meta name="description" content={content.description} />
        <meta property="og:title" content={`AstroGuru | ${content.title}`} />
        <meta property="og:description" content={content.description} />
        <meta property="og:url" content={canonicalUrl} />
        <link rel="canonical" href={canonicalUrl} />
      </Head>

      <View style={styles.container}>
        <TabHeader title={content.title} showDefaultRightIcons={false} />

        <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
          <View style={styles.badge}>
            <Ionicons name="trash-outline" size={18} color={colors.primary} />
            <Text style={styles.badgeText}>{content.badge}</Text>
          </View>

          <Text style={styles.description}>{content.description}</Text>

          <View style={styles.pathCard}>
            <Text style={styles.pathLabel}>{content.pathLabel}</Text>
            <Text style={styles.pathValue}>{content.pathValue}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{content.stepsTitle}</Text>
            {content.steps.map((step) => (
              <View key={step} style={styles.listRow}>
                <Ionicons name="checkmark-circle-outline" size={16} color={colors.primary} />
                <Text style={styles.listText}>{step}</Text>
              </View>
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{content.afterTitle}</Text>
            {content.afterItems.map((item) => (
              <View key={item} style={styles.listRow}>
                <Ionicons name="ellipse-outline" size={16} color={colors.subtext} />
                <Text style={styles.listText}>{item}</Text>
              </View>
            ))}
          </View>

          <View style={styles.supportCard}>
            <Text style={styles.sectionTitle}>{content.supportTitle}</Text>
            <Text style={styles.supportBody}>{content.supportBody}</Text>
            <TouchableOpacity
              style={styles.supportButton}
              onPress={openSupport}
              accessibilityRole="link"
              accessibilityLabel={SUPPORT_EMAIL}
            >
              <Ionicons name="mail-outline" size={16} color={colors.primary} />
              <Text style={styles.supportButtonText}>{content.supportButton}</Text>
            </TouchableOpacity>
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
    scrollContent: { paddingHorizontal: 24, paddingBottom: 40 },
    badge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: C.primarySoft,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    badgeText: { fontSize: 14, fontWeight: '600', color: C.primary },
    description: { fontSize: 14, lineHeight: 22, color: C.text, marginBottom: 18 },
    pathCard: {
      borderRadius: 14,
      borderWidth: 1,
      borderColor: C.border,
      backgroundColor: C.surface,
      padding: 16,
      marginBottom: 20,
      gap: 6,
    },
    pathLabel: { fontSize: 12, color: C.subtext, textTransform: 'uppercase' },
    pathValue: { fontSize: 15, fontWeight: '700', color: C.text },
    section: { marginBottom: 20, gap: 12 },
    sectionTitle: { fontSize: 15, fontWeight: '700', color: C.text },
    listRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    listText: { flex: 1, fontSize: 13, lineHeight: 20, color: C.subtext },
    supportCard: {
      borderRadius: 16,
      borderWidth: 1,
      borderColor: C.primarySoft,
      backgroundColor: C.primarySoftBg,
      padding: 16,
      gap: 10,
    },
    supportBody: { fontSize: 13, lineHeight: 20, color: C.subtext },
    supportButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: C.primary,
      backgroundColor: C.surface,
      paddingVertical: 12,
      marginTop: 4,
    },
    supportButtonText: { fontSize: 14, fontWeight: '600', color: C.primary },
  });
}
