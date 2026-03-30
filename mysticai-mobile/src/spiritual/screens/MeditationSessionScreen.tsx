import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { BreathTimer } from '../components/BreathTimer';
import { useSpiritualDaily } from '../hooks/useSpiritualDaily';
import { spiritualApi } from '../api/spiritual.api';

function parseBreathingPattern(raw?: string | null): { inhale: number; hold1?: number; exhale: number; hold2?: number } {
  if (!raw) return { inhale: 4, hold1: 4, exhale: 4, hold2: 4 };
  try {
    const parsed = JSON.parse(raw) as { inhale?: number; hold1?: number; exhale?: number; hold2?: number };
    return {
      inhale: parsed.inhale ?? 4,
      hold1: parsed.hold1 ?? 4,
      exhale: parsed.exhale ?? 4,
      hold2: parsed.hold2 ?? 4,
    };
  } catch {
    return { inhale: 4, hold1: 4, exhale: 4, hold2: 4 };
  }
}

export default function MeditationSessionScreen() {
  const { t } = useTranslation();
  const { meditation } = useSpiritualDaily();
  const [resultText, setResultText] = useState<string>('');

  const pattern = useMemo(
    () => parseBreathingPattern(meditation.data?.breathingPatternJson),
    [meditation.data?.breathingPatternJson],
  );

  if (meditation.isLoading) return <View style={styles.center}><Text>{t('spiritual.meditationSession.loading')}</Text></View>;
  if (meditation.isError || !meditation.data) return <View style={styles.center}><Text>{t('spiritual.meditationSession.error')}</Text></View>;

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{meditation.data.title}</Text>
      <Text style={styles.sub}>{t('spiritual.meditationSession.subtitle')}</Text>

      <BreathTimer
        pattern={pattern}
        targetDurationSec={meditation.data.durationSec}
        onComplete={async ({ actualDurationSec, cycles }) => {
          const res = await spiritualApi.logMeditation({
            date: meditation.data!.date,
            exerciseId: meditation.data!.exerciseId,
            durationSec: actualDurationSec,
            completedCycles: cycles,
          });
          setResultText(t('spiritual.meditationSession.saved', { sec: res.actualDurationSec, cycles: res.completedCycles ?? 0 }));
        }}
      />

      <Text style={styles.disclaimer}>
        {meditation.data.disclaimerText ?? t('spiritual.meditationSession.disclaimerDefault')}
      </Text>

      {resultText ? <Text style={styles.success}>{resultText}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  container: { padding: 16, gap: 14, backgroundColor: '#F9FAFB', flexGrow: 1 },
  title: { fontSize: 22, fontWeight: '800', color: '#111827' },
  sub: { fontSize: 12, color: '#6B7280' },
  disclaimer: { fontSize: 12, lineHeight: 18, color: '#6B7280' },
  success: { color: '#166534', fontWeight: '700' },
});

