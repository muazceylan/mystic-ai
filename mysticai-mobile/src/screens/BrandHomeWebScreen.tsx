import { useMemo } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Head from 'expo-router/head';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { getPublicWebBaseUrl, getUniversalDownloadUrl } from '../utils/publicUrl';

const ROOT_SITE_URL = 'https://astroguru.app';
const SUPPORT_EMAIL = 'support@astroguru.app';
const SEO_LINKS = [
  { label: 'Astroloji Rehberleri', path: '/astroloji' },
  { label: 'Numeroloji Yorumlari', path: '/numeroloji' },
  { label: 'Ruya Yorumu Icerikleri', path: '/ruya-yorumu' },
  { label: 'Uyum Analizi Rehberi', path: '/uyum-analizi' },
  { label: 'Spirituel Rehberlik', path: '/spirituel-rehberlik' },
  { label: 'Blog', path: '/blog' },
] as const;

const FEATURE_PILLS = [
  'Kisiye ozel astroloji',
  'Numeroloji ve isim yorumu',
  'Ruya analizi',
  'Gunluk kozmik rehberlik',
] as const;

export default function BrandHomeWebScreen() {
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr';
  const infoBaseUrl = getPublicWebBaseUrl();
  const downloadUrl = getUniversalDownloadUrl('/dl?utm_source=brand_home');
  const canonicalUrl = `${ROOT_SITE_URL}/`;
  const pageTitle =
    locale === 'en'
      ? 'AstroGuru | Astrology, Numerology and Spiritual Guidance App'
      : 'AstroGuru | Astroloji, Numeroloji ve Ruhsal Rehberlik Uygulamasi';
  const description =
    locale === 'en'
      ? 'Discover daily astrology, numerology, dream insights and spiritual guidance with AstroGuru.'
      : 'AstroGuru ile gunluk astroloji, numeroloji, ruya yorumu ve spirituel rehberlik deneyimini kesfet.';
  const organizationJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'AstroGuru',
    url: ROOT_SITE_URL,
    sameAs: [infoBaseUrl],
    email: SUPPORT_EMAIL,
  };
  const websiteJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'AstroGuru',
    url: ROOT_SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${infoBaseUrl}/blog?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
  const appJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'AstroGuru',
    applicationCategory: 'LifestyleApplication',
    operatingSystem: 'iOS, Android, Web',
    url: ROOT_SITE_URL,
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  };

  const openExternalUrl = async (url: string) => {
    if (Platform.OS !== 'web') {
      return;
    }
    await Linking.openURL(url);
  };

  return (
    <>
      <Head>
        <title>{pageTitle}</title>
        <meta name="description" content={description} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <link rel="canonical" href={canonicalUrl} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />
      </Head>

      <ScrollView style={styles.page} contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={styles.heroCopy}>
            <Text style={styles.eyebrow}>ASTROGURU</Text>
            <Text style={styles.title}>
              {locale === 'en'
                ? 'Your daily astrology, numerology and spiritual guidance companion.'
                : 'Gunluk astroloji, numeroloji ve ruhsal rehberlik icin tek uygulama.'}
            </Text>
            <Text style={styles.subtitle}>
              {locale === 'en'
                ? 'Open the app, explore premium guidance, and dive deeper with our editorial hub.'
                : 'Uygulamayi ac, gunluk kozmik yorumlarini takip et ve detayli iceriklere bilgi merkezinden ulas.'}
            </Text>

            <View style={styles.pillRow}>
              {FEATURE_PILLS.map((pill) => (
                <View key={pill} style={styles.pill}>
                  <Text style={styles.pillText}>{pill}</Text>
                </View>
              ))}
            </View>

            <View style={styles.ctaRow}>
              <Link href="/(auth)/welcome" asChild>
                <Pressable style={styles.primaryCta}>
                  <Ionicons name="sparkles-outline" size={18} color={colors.white} />
                  <Text style={styles.primaryCtaText}>
                    {locale === 'en' ? 'Open AstroGuru' : 'AstroGuru Uygulamasini Ac'}
                  </Text>
                </Pressable>
              </Link>

              <Pressable
                onPress={() => {
                  void openExternalUrl(downloadUrl);
                }}
                style={styles.secondaryCta}
              >
                <Ionicons name="download-outline" size={18} color={colors.primary} />
                <Text style={styles.secondaryCtaText}>
                  {locale === 'en' ? 'Download or Continue' : 'Indir veya Devam Et'}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.cardTitle}>
              {locale === 'en' ? 'What users come here for' : 'Kullanicilar burada ne buluyor'}
            </Text>
            <View style={styles.cardList}>
              <FeatureRow
                icon="planet-outline"
                text={locale === 'en' ? 'Daily astrological themes and moon guidance' : 'Gunluk astrolojik temalar ve ay rehberligi'}
              />
              <FeatureRow
                icon="apps-outline"
                text={locale === 'en' ? 'Compatibility, dreams and numerology insights' : 'Uyum analizi, ruya yorumu ve numeroloji icerikleri'}
              />
              <FeatureRow
                icon="newspaper-outline"
                text={locale === 'en' ? 'Long-form explainers in the info hub' : 'Bilgi merkezinde uzun form astroloji ve spirituel rehberler'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'en' ? 'Read before you dive in' : 'Kesfetmeye baslamadan once'}
          </Text>
          <Text style={styles.sectionBody}>
            {locale === 'en'
              ? 'Our editorial hub helps new users understand each feature while the main app stays focused on personal guidance.'
              : 'Bilgi merkezi yeni kullanicilarin ozellikleri anlamasina yardim eder; ana uygulama ise kisisel rehberlige odaklanir.'}
          </Text>
          <View style={styles.linkGrid}>
            {SEO_LINKS.map((entry) => {
              const href = `${infoBaseUrl}${entry.path}`;
              return (
                <Link key={entry.path} href={href} asChild>
                  <Pressable style={styles.linkCard}>
                    <Text style={styles.linkCardTitle}>{entry.label}</Text>
                    <Text style={styles.linkCardHref}>{href.replace(/^https?:\/\//, '')}</Text>
                  </Pressable>
                </Link>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'en' ? 'Need legal or support info?' : 'Yasal veya destek bilgisi mi lazim?'}
          </Text>
          <View style={styles.footerLinks}>
            <Link href="/privacy" asChild>
              <Pressable style={styles.footerLink}>
                <Text style={styles.footerLinkText}>{locale === 'en' ? 'Privacy' : 'Gizlilik'}</Text>
              </Pressable>
            </Link>
            <Link href="/terms" asChild>
              <Pressable style={styles.footerLink}>
                <Text style={styles.footerLinkText}>{locale === 'en' ? 'Terms' : 'Kullanim Sartlari'}</Text>
              </Pressable>
            </Link>
            <Pressable
              onPress={() => {
                void openExternalUrl(`mailto:${SUPPORT_EMAIL}`);
              }}
              style={styles.footerLink}
            >
              <Text style={styles.footerLinkText}>{SUPPORT_EMAIL}</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

function FeatureRow({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  const { colors } = useTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  return (
    <View style={styles.featureRow}>
      <View style={styles.featureIcon}>
        <Ionicons name={icon} size={18} color={colors.primary} />
      </View>
      <Text style={styles.featureText}>{text}</Text>
    </View>
  );
}

function createStyles(colors: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: 24,
      paddingVertical: 32,
      gap: 28,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 1180,
    },
    hero: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 20,
      alignItems: 'stretch',
    },
    heroCopy: {
      flex: 1,
      minWidth: 320,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 28,
      padding: 28,
      shadowColor: colors.shadow,
      shadowOpacity: 0.08,
      shadowRadius: 20,
      shadowOffset: { width: 0, height: 10 },
      elevation: 4,
    },
    eyebrow: {
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 2,
      color: colors.primary,
      marginBottom: 12,
    },
    title: {
      fontSize: 42,
      lineHeight: 48,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      marginTop: 14,
      fontSize: 17,
      lineHeight: 27,
      color: colors.subtext,
      maxWidth: 720,
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginTop: 20,
    },
    pill: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
    },
    pillText: {
      color: colors.primary,
      fontSize: 13,
      fontWeight: '700',
    },
    ctaRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 24,
    },
    primaryCta: {
      minHeight: 52,
      paddingHorizontal: 18,
      borderRadius: 18,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    primaryCtaText: {
      color: colors.white,
      fontSize: 15,
      fontWeight: '800',
    },
    secondaryCta: {
      minHeight: 52,
      paddingHorizontal: 18,
      borderRadius: 18,
      backgroundColor: colors.primarySoftBg,
      borderWidth: 1,
      borderColor: colors.primarySoft,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    secondaryCtaText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '800',
    },
    heroCard: {
      width: 360,
      minWidth: 300,
      backgroundColor: colors.dictSurface,
      borderWidth: 1,
      borderColor: colors.dictBorder,
      borderRadius: 28,
      padding: 24,
    },
    cardTitle: {
      fontSize: 20,
      lineHeight: 28,
      fontWeight: '800',
      color: colors.text,
      marginBottom: 16,
    },
    cardList: {
      gap: 14,
    },
    featureRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
    },
    featureIcon: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.primarySoft,
    },
    featureText: {
      flex: 1,
      color: colors.body,
      fontSize: 14,
      lineHeight: 21,
    },
    section: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 28,
      padding: 24,
    },
    sectionTitle: {
      fontSize: 26,
      lineHeight: 34,
      fontWeight: '800',
      color: colors.text,
    },
    sectionBody: {
      marginTop: 10,
      fontSize: 16,
      lineHeight: 25,
      color: colors.subtext,
      maxWidth: 780,
    },
    linkGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 14,
      marginTop: 20,
    },
    linkCard: {
      width: 320,
      maxWidth: '100%',
      padding: 18,
      borderRadius: 20,
      backgroundColor: colors.primarySoftBg,
      borderWidth: 1,
      borderColor: colors.borderLight,
      gap: 8,
    },
    linkCardTitle: {
      color: colors.text,
      fontSize: 16,
      fontWeight: '800',
      lineHeight: 22,
    },
    linkCardHref: {
      color: colors.primary,
      fontSize: 12,
      lineHeight: 18,
    },
    footerLinks: {
      marginTop: 16,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    footerLink: {
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.borderLight,
      backgroundColor: colors.surfaceAlt,
    },
    footerLinkText: {
      color: colors.text,
      fontSize: 13,
      fontWeight: '700',
    },
  });
}
