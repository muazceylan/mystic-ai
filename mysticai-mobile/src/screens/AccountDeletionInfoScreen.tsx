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
    title: 'Hesap Silme',
    description: 'Hesap silme islemi uygulama icinden tamamlanir. Silme sonrasinda ayni giris bilgileriyle devam edilmez; tekrar giris yaparsaniz yeni kullanici gibi baslarsiniz.',
    badge: 'Uygulama ici hesap silme bilgisi',
    pathLabel: 'Uygulama ici yol',
    pathValue: 'Profil -> Hesabi Kalici Olarak Sil',
    stepsTitle: 'Nasil yapilir?',
    steps: [
      'AstroGuru uygulamasini acin ve hesabiniza giris yapin.',
      'Profil ekranina gidin.',
      'Hesabi Kalici Olarak Sil secenegini acin ve onayi tamamlayin.',
    ],
    afterTitle: 'Silme sonrasinda ne olur?',
    afterItems: [
      'Mevcut hesabiniz kapatilir ve giris kimlikleri deleted durumuna cekilir.',
      'Ayni e-posta, Google veya Apple hesabi ile tekrar giris yaparsaniz yeni kullanici akisi baslar.',
      'Eski kayit sistemde deleted olarak tutulur; aktif hesaba geri donmez.',
    ],
    supportTitle: 'Sorun yasarsaniz',
    supportBody: 'Uygulamaya erisemiyorsaniz veya silme akisi beklediginiz gibi calismiyorsa destek ekibine yazin.',
    supportButton: 'Destek E-postasi Gonder',
  },
  en: {
    title: 'Account Deletion',
    description: 'Account deletion is completed inside the app. After deletion, the same sign-in details do not reopen the old account; signing in again starts a new-user flow.',
    badge: 'In-app account deletion info',
    pathLabel: 'In-app path',
    pathValue: 'Profile -> Permanently Delete Account',
    stepsTitle: 'How it works',
    steps: [
      'Open AstroGuru and sign in to the account you want to remove.',
      'Go to the Profile screen.',
      'Open Permanently Delete Account and complete the confirmation.',
    ],
    afterTitle: 'What happens after deletion?',
    afterItems: [
      'Your current account is closed and its sign-in identifiers are moved into a deleted state.',
      'If you sign in again later with the same email, Google, or Apple account, you start as a new user.',
      'The previous record stays in the system as deleted and is not reactivated.',
    ],
    supportTitle: 'Need help?',
    supportBody: 'If you cannot access the app or the deletion flow does not work as expected, contact support.',
    supportButton: 'Email Support',
  },
};

export default function AccountDeletionInfoScreen({ locale }: { locale: ScreenLocale }) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const content = CONTENT[locale];
  const canonicalUrl = `${ROOT_SITE_URL}/account-deletion`;
  const subject = locale === 'en' ? 'Account Deletion Request' : 'Hesap Silme Talebi';

  const openSupport = () => {
    void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`);
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
