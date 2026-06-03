import React, { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Redirect, useLocalSearchParams } from 'expo-router';

import { AccessibleText, SafeScreen } from '../../components/ui';
import { CompatibilityDimensionCard } from '../../components/ComparisonCard';
import { ACCESSIBILITY, RADIUS, SPACING, TYPOGRAPHY } from '../../constants/tokens';
import { useTheme, type ThemeMode } from '../../context/ThemeContext';
import type { CompatibilityDimension } from '../../types/compare';

function firstParam(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function parseThemeMode(value: string | string[] | undefined): ThemeMode | null {
  const raw = firstParam(value);
  if (raw === 'light' || raw === 'dark' || raw === 'system') return raw;
  return null;
}

const mockCompatibilityDimensions: CompatibilityDimension[] = [
  {
    id: 'preview-emotional-bond',
    title: 'Duygusal Bağ',
    score: 54,
    status: 'attention',
    headline: 'Yakınlığı kurma hızınız farklı.',
    summary: 'mmc daha net ve düzenli temasla rahat ederken, cihat açılmadan önce güvenli alan arıyor.',
    personA: {
      name: 'mmc',
      initial: 'M',
      need: 'Netlik ve düzenli temas',
      challenge: 'Belirsizlik uzadığında daha çok çabalayabilir',
      ratio: 58,
    },
    personB: {
      name: 'cihat',
      initial: 'C',
      need: 'Güvenli alan ve zaman',
      challenge: 'Baskı hissettiğinde geri çekilebilir',
      ratio: 42,
    },
    balanceLabel: 'Yakınlık ihtiyacı dengesi',
    balanceSummary: 'mmc teması biraz daha sık isterken, cihat yakınlaşmayı daha kontrollü kuruyor.',
    advice: 'Yakınlaşmayı tahmine bırakmayın. Küçük ama düzenli temas ritmi kurun.',
    detail: {
      why: 'Biriniz yakınlığı daha hızlı kurmak isterken, diğeriniz önce güvenli alan arıyor.',
      tension: 'Bu fark bazen biri daha çok çabalıyor, diğeri geri çekiliyor gibi algılanabilir.',
      balance: 'Kısa, düzenli ve baskısız temas ritmi kurmak ilişkiyi daha az yorar.',
    },
  },
  {
    id: 'preview-trust',
    title: 'Güven & Bağlılık',
    score: 79,
    status: 'compatible',
    headline: 'Güven alanında güçlü bir uyum var.',
    summary: 'mmc söz ve davranış tutarlılığı ararken, cihat duygusal sıcaklık sürdüğünde daha kolay güveniyor.',
    personA: {
      name: 'mmc',
      initial: 'M',
      need: 'Söz ve davranış tutarlılığı',
      challenge: 'Söylenenle yapılan farklı olduğunda güveni azalabilir',
      ratio: 62,
    },
    personB: {
      name: 'cihat',
      initial: 'C',
      need: 'Duygusal sıcaklık',
      challenge: 'Mesafe arttığında güven kurmakta zorlanabilir',
      ratio: 38,
    },
    balanceLabel: 'Güven kurma dengesi',
    balanceSummary: 'Bir taraf güveni davranışla, diğer taraf duygusal sıcaklıkla ölçüyor.',
    advice: 'Küçük ama görünür güven işaretleri oluşturun. Verdiğiniz sözleri davranışla destekleyin.',
    detail: {
      why: 'Güven ihtiyacınız farklı biçimlerde ortaya çıkıyor.',
      tension: 'Aynı ilişki bir tarafa yakın, diğer tarafa eksik görünebilir.',
      balance: 'Söz, davranış ve duygusal sıcaklığı aynı çizgide tutmak bağı güçlendirir.',
    },
  },
  {
    id: 'preview-communication',
    title: 'İletişim Ritmi',
    score: 83,
    status: 'compatible',
    headline: 'İletişim ritminiz genel olarak uyumlu.',
    summary: 'İlgi gösterme biçiminiz ve güven ihtiyacınız birbirini destekliyor.',
    personA: {
      name: 'mmc',
      initial: 'M',
      need: 'Daha sık temas',
      challenge: 'İletişim azaldığında ilgiyi sorgulayabilir',
      ratio: 38,
    },
    personB: {
      name: 'cihat',
      initial: 'C',
      need: 'Alanı korunarak yakınlaşmak',
      challenge: 'Baskı hissettiğinde konuşmayı erteleyebilir',
      ratio: 62,
    },
    balanceLabel: 'İletişim ritmi dengesi',
    balanceSummary: 'Yakınlık korunurken kişisel alan da desteklendiğinde iletişim daha rahat akar.',
    advice: 'Kısa, net ve düzenli temas kurun. Yakınlığı korurken kişisel alanı da ihmal etmeyin.',
    detail: {
      why: 'İletişim biçimleriniz birbirini destekleyebiliyor.',
      tension: 'Alan ihtiyacı korunmazsa iyi giden iletişim zaman zaman baskı gibi algılanabilir.',
      balance: 'Kısa, net ve düzenli temas iletişim ritmini dengede tutar.',
    },
  },
];

export default function CompareCardPreviewScreen() {
  const params = useLocalSearchParams<{ expanded?: string; theme?: string; longNames?: string }>();
  const themeMode = parseThemeMode(params.theme);
  const expanded = firstParam(params.expanded) === '1';
  const useLongNames = firstParam(params.longNames) === '1';
  const { colors, isDark, setMode } = useTheme();

  useEffect(() => {
    if (!themeMode) return;
    void setMode(themeMode);
  }, [setMode, themeMode]);

  const dimensions = useMemo(() => {
    if (!useLongNames) return mockCompatibilityDimensions;

    return mockCompatibilityDimensions.map((dimension) => ({
      ...dimension,
      personA: {
        ...dimension.personA,
        name: 'mmc çok uzun isim denemesi',
        initial: 'M',
      },
      personB: {
        ...dimension.personB,
        name: 'cihat uzun soyadlı partner',
        initial: 'C',
      },
    }));
  }, [useLongNames]);

  if (!__DEV__) {
    return <Redirect href="/(tabs)/home" />;
  }

  return (
    <SafeScreen
      edges={['top', 'left', 'right']}
      showStandardBackground={false}
      style={{ ...styles.screen, backgroundColor: colors.background }}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.previewHeader, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <AccessibleText style={[styles.kicker, { color: colors.primary }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            DEV PREVIEW
          </AccessibleText>
          <AccessibleText style={[styles.title, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            İlişki Uyumu Kartları
          </AccessibleText>
          <AccessibleText style={[styles.subtitle, { color: colors.textSoft }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {isDark ? 'Dark' : 'Light'} tema • {expanded ? 'detay açık' : 'detay kapalı'}
          </AccessibleText>
        </View>

        {dimensions.map((dimension) => (
          <View key={dimension.id} style={styles.cardFrame}>
            <CompatibilityDimensionCard
              dimension={dimension}
              initiallyExpanded={expanded}
            />
          </View>
        ))}
      </ScrollView>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingTop: SPACING.lg,
    paddingBottom: 96,
    gap: SPACING.lg,
  },
  previewHeader: {
    marginHorizontal: SPACING.lg,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    padding: SPACING.lg,
    gap: SPACING.xs,
  },
  cardFrame: {
    marginHorizontal: SPACING.lg,
  },
  kicker: {
    ...TYPOGRAPHY.CaptionBold,
    fontWeight: '900',
  },
  title: {
    ...TYPOGRAPHY.H2,
    fontWeight: '900',
  },
  subtitle: {
    ...TYPOGRAPHY.Small,
  },
});
