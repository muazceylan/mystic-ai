import { useMemo } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import Head from 'expo-router/head';
import { Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { getPublicWebBaseUrl, getUniversalDownloadUrl } from '../utils/publicUrl';
import {
  ProductEventName,
  resolveCampaignId,
  resolveReferrerDomain,
  trackProductEvent,
} from '../services/productAnalytics';

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

const FEATURE_PILLS = {
  en: ['Personal astrology', 'Numerology and name insights', 'Dream analysis', 'Daily cosmic guidance'],
  tr: ['Kişiye özel astrolojik analiz', 'Numeroloji ve isim analizi', 'Rüya sembolleri ve yorumları', 'Günlük kozmik rehberlik'],
} as const;

export default function BrandHomeWebScreen() {
  const { colors } = useTheme();
  const { i18n } = useTranslation();
  const { width } = useWindowDimensions();
  const isNarrow = width < 960;
  const isCompact = width < 560;
  const styles = useMemo(() => createStyles(colors, { isNarrow, isCompact }), [colors, isCompact, isNarrow]);
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr';
  const infoBaseUrl = getPublicWebBaseUrl();
  const downloadUrl = getUniversalDownloadUrl('/dl?utm_source=brand_home');
  const canonicalUrl = `${ROOT_SITE_URL}/`;
  const pageTitle =
    locale === 'en'
      ? 'AstroGuru | Astrology, Numerology and Spiritual Guidance App'
      : 'AstroGuru | Astroloji, Numeroloji ve Spirituel Rehberlik Uygulamasi';
  const description =
    locale === 'en'
      ? 'Discover daily astrology, numerology, dream insights and spiritual guidance with AstroGuru.'
      : 'Günlük astrolojik yorumlar, numeroloji analizleri ve spiritüel rehberliği AstroGuru ile tek merkezden keşfedin.';
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
    trackProductEvent(ProductEventName.APP_ENTRY_STARTED, {
      'entry point': 'brand_home',
      'cta label': 'download_or_continue',
      'destination path': url,
      'referrer domain': resolveReferrerDomain(),
      'campaign id': resolveCampaignId(),
    });
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
                : 'Günlük astrolojik yorumlar, numeroloji analizleri ve spiritüel rehberliği tek bir merkezde buluşturan kişisel rehberiniz.'}
            </Text>
            <Text style={styles.subtitle}>
              {locale === 'en'
                ? 'Open the app, explore premium guidance, and dive deeper with our editorial hub.'
                : 'Gök olaylarının günlük etkilerinden numerolojik temalara, rüya sembollerinden uzman içeriklere kadar uzanan AstroGuru deneyimine hem uygulama hem de bilgi merkezi üzerinden kolayca erişin.'}
            </Text>

            <View style={styles.pillRow}>
              {FEATURE_PILLS[locale].map((pill) => (
                <View key={pill} style={styles.pill}>
                  <Text style={styles.pillText}>{pill}</Text>
                </View>
              ))}
            </View>

            <View style={styles.ctaRow}>
              <Link href="/(auth)/welcome" asChild>
                <Pressable
                  style={styles.primaryCta}
                  onPress={() => {
                    trackProductEvent(ProductEventName.APP_ENTRY_STARTED, {
                      'entry point': 'brand_home',
                      'cta label': 'open_astroguru',
                      'destination path': '/(auth)/welcome',
                      'referrer domain': resolveReferrerDomain(),
                      'campaign id': resolveCampaignId(),
                    });
                  }}
                >
                  <Ionicons name="sparkles-outline" size={18} color={colors.white} />
                  <Text style={styles.primaryCtaText}>
                    {locale === 'en' ? 'Open AstroGuru' : "AstroGuru'yu Aç"}
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
                  {locale === 'en' ? 'Download or Continue' : "İndir veya Web'de Devam Et"}
                </Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.heroCard}>
            <Text style={styles.cardTitle}>
              {locale === 'en' ? 'What users come here for' : 'Kullanicilarin en cok yararlandigi alanlar'}
            </Text>
            <View style={styles.cardList}>
              <FeatureRow
                icon="planet-outline"
                text={locale === 'en' ? 'Daily astrological themes and moon guidance' : 'Gunluk gezegen etkileri, ay fazlari ve astrolojik odaklar'}
              />
              <FeatureRow
                icon="apps-outline"
                text={locale === 'en' ? 'Compatibility, dreams and numerology insights' : 'Uyum analizi, ruya sembolleri ve numeroloji icgoruleri'}
              />
              <FeatureRow
                icon="newspaper-outline"
                text={locale === 'en' ? 'Long-form explainers in the info hub' : 'Bilgi merkezinde derinlesmesine astroloji ve spirituel rehberler'}
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {locale === 'en' ? 'Read before you dive in' : 'Baslamadan once goz atin'}
          </Text>
          <Text style={styles.sectionBody}>
            {locale === 'en'
              ? 'Our editorial hub helps new users understand each feature while the main app stays focused on personal guidance.'
              : 'Bilgi merkezi, AstroGuru deneyimindeki modulleri ve yorum yaklasimini aciklar; uygulama ise kisisel analiz ve gunluk rehberlige odaklanir.'}
          </Text>
          <View style={styles.linkGrid}>
            {SEO_LINKS.map((entry) => {
              const href = `${infoBaseUrl}${entry.path}`;
              return (
                <Link key={entry.path} href={href as any} asChild>
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
            {locale === 'en' ? 'Need legal or support info?' : 'Yasal metinler ve destek kanallari'}
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
            <Link href={"/account-deletion" as any} asChild>
              <Pressable style={styles.footerLink}>
                <Text style={styles.footerLinkText}>{locale === 'en' ? 'Account Deletion' : 'Hesap Silme'}</Text>
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

function createStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  options: { isNarrow?: boolean; isCompact?: boolean } = {}
) {
  const { isNarrow = false, isCompact = false } = options;

  return StyleSheet.create({
    page: {
      flex: 1,
      backgroundColor: colors.bg,
    },
    content: {
      paddingHorizontal: isCompact ? 16 : 24,
      paddingVertical: isCompact ? 24 : 32,
      gap: isCompact ? 20 : 28,
      alignSelf: 'center',
      width: '100%',
      maxWidth: 1180,
    },
    hero: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isCompact ? 16 : 20,
      alignItems: 'stretch',
    },
    heroCopy: {
      flex: 1,
      minWidth: isCompact ? 0 : 320,
      width: isNarrow ? '100%' : undefined,
      maxWidth: '100%',
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.borderLight,
      borderRadius: 28,
      padding: isCompact ? 20 : 28,
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
      fontSize: isCompact ? 30 : isNarrow ? 36 : 42,
      lineHeight: isCompact ? 38 : isNarrow ? 42 : 48,
      fontWeight: '800',
      color: colors.text,
    },
    subtitle: {
      marginTop: 14,
      fontSize: isCompact ? 15 : 17,
      lineHeight: isCompact ? 24 : 27,
      color: colors.subtext,
      maxWidth: isNarrow ? undefined : 720,
    },
    pillRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: isCompact ? 8 : 10,
      marginTop: isCompact ? 18 : 20,
    },
    pill: {
      paddingHorizontal: isCompact ? 10 : 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: colors.primarySoft,
    },
    pillText: {
      color: colors.primary,
      fontSize: isCompact ? 12 : 13,
      fontWeight: '700',
    },
    ctaRow: {
      flexDirection: isCompact ? 'column' : 'row',
      flexWrap: 'wrap',
      gap: 12,
      marginTop: 24,
      alignItems: isCompact ? 'stretch' : 'center',
    },
    primaryCta: {
      minHeight: 52,
      paddingHorizontal: 18,
      borderRadius: 18,
      backgroundColor: colors.primary,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      width: isCompact ? '100%' : undefined,
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
      justifyContent: 'center',
      gap: 10,
      width: isCompact ? '100%' : undefined,
    },
    secondaryCtaText: {
      color: colors.primary,
      fontSize: 15,
      fontWeight: '800',
    },
    heroCard: {
      width: isNarrow ? '100%' : 360,
      minWidth: 0,
      maxWidth: '100%',
      backgroundColor: colors.dictSurface,
      borderWidth: 1,
      borderColor: colors.dictBorder,
      borderRadius: 28,
      padding: isCompact ? 20 : 24,
    },
    cardTitle: {
      fontSize: isCompact ? 18 : 20,
      lineHeight: isCompact ? 26 : 28,
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
      padding: isCompact ? 20 : 24,
    },
    sectionTitle: {
      fontSize: isCompact ? 22 : 26,
      lineHeight: isCompact ? 30 : 34,
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
      width: isCompact ? '100%' : 320,
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
