import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Text, View, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { useSpiritualDaily } from '../hooks/useSpiritualDaily';
import { useTheme, ThemeColors } from '../../context/ThemeContext';
import { SafeScreen, AppHeader, HeaderRightIcons, Card, Button, Badge } from '../../components/ui';
import { TYPOGRAPHY, SPACING, ACCESSIBILITY } from '../../constants/tokens';

interface MeditationStep {
  title?: string;
  description?: string;
  durationSec?: number;
}

export default function MeditationDailyScreen() {
  const { t } = useTranslation();
  const { meditation } = useSpiritualDaily();
  const { colors } = useTheme();
  const s = createStyles(colors);

  const steps = useMemo<MeditationStep[]>(() => {
    if (!meditation.data?.stepsJson) return [];
    try {
      const parsed = JSON.parse(meditation.data.stepsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }, [meditation.data?.stepsJson]);

  if (meditation.isLoading) {
    return (
      <SafeScreen>
        <View style={s.center}>
          <Text style={[s.loadingText, { color: colors.subtext }]}>Egzersiz yükleniyor...</Text>
        </View>
      </SafeScreen>
    );
  }

  if (meditation.isError || !meditation.data) {
    return (
      <SafeScreen>
        <View style={s.center}>
          <Text style={[s.loadingText, { color: colors.error }]}>Egzersiz yüklenemedi.</Text>
        </View>
      </SafeScreen>
    );
  }

  const { title, type, focusTheme, durationSec, disclaimerText } = meditation.data;

  return (
    <SafeScreen scroll>
      <AppHeader title="Bugünün Nefesi" onBack={() => router.back()} rightActions={<HeaderRightIcons />} />

      <Card variant="elevated">
        <View style={s.titleRow}>
          <Text
            style={s.cardTitle}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {title}
          </Text>
          <Badge label={type} variant="primary" />
        </View>
        <Text
          style={s.meta}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {focusTheme} · {Math.floor(durationSec / 60)} dk
        </Text>
      </Card>

      {steps.length > 0 && (
        <Card>
          <Text style={s.sectionTitle}>Adımlar</Text>
          {steps.map((step, i) => (
            <View key={i} style={s.stepRow}>
              <View style={[s.stepNum, { backgroundColor: colors.primarySoftBg }]}>
                <Text style={[s.stepNumText, { color: colors.primary }]}>{i + 1}</Text>
              </View>
              <View style={s.stepBody}>
                {step.title ? (
                  <Text
                    style={s.stepTitle}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {step.title}
                  </Text>
                ) : null}
                {step.description ? (
                  <Text
                    style={s.stepDesc}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {step.description}
                  </Text>
                ) : null}
                {step.durationSec != null ? (
                  <Text
                    style={s.stepDuration}
                    maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
                  >
                    {step.durationSec} sn
                  </Text>
                ) : null}
              </View>
            </View>
          ))}
        </Card>
      )}

      <Card variant="outlined">
        <Text style={s.disclaimerTitle}>Bilgilendirme</Text>
        <Text
          style={s.disclaimer}
          maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
        >
          {disclaimerText ?? 'Bu bölüm nefes ve farkındalık egzersizi sunar; tıbbi tavsiye değildir.'}
        </Text>
      </Card>

      <Button
        title="Başlat"
        size="lg"
        onPress={() => router.push('/spiritual/meditation/session')}
        accessibilityLabel={t('spiritual.meditation.startBreathingA11y')}
      />
    </SafeScreen>
  );
}

function createStyles(C: ThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      padding: SPACING.lg,
    },
    loadingText: {
      ...TYPOGRAPHY.Body,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: SPACING.sm,
    },
    cardTitle: {
      ...TYPOGRAPHY.H3,
      color: C.text,
      flex: 1,
    },
    meta: {
      ...TYPOGRAPHY.Caption,
      color: C.subtext,
      marginTop: SPACING.xs,
    },
    sectionTitle: {
      ...TYPOGRAPHY.BodyBold,
      color: C.text,
      marginBottom: SPACING.sm,
    },
    stepRow: {
      flexDirection: 'row',
      gap: SPACING.md,
      marginBottom: SPACING.md,
    },
    stepNum: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stepNumText: {
      ...TYPOGRAPHY.SmallBold,
    },
    stepBody: {
      flex: 1,
      gap: 2,
    },
    stepTitle: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
    },
    stepDesc: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
      lineHeight: 20,
    },
    stepDuration: {
      ...TYPOGRAPHY.Caption,
      color: C.muted,
    },
    disclaimerTitle: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
      marginBottom: SPACING.xs,
    },
    disclaimer: {
      ...TYPOGRAPHY.Small,
      color: C.subtext,
      lineHeight: 20,
    },
  });
}
