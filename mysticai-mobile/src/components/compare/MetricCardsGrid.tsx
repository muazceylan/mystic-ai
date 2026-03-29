import React from 'react';
import { StyleSheet, View } from 'react-native';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import type { CompareMetricCardDTO } from '../../types/compare';
import { useTranslation } from 'react-i18next';

interface MetricCardsGridProps {
  metrics: CompareMetricCardDTO[];
}

function statusColors(status: CompareMetricCardDTO['status']) {
  if (status === 'strong') return { bg: '#EAF9F0', border: '#B7E7C8', text: '#166534' };
  if (status === 'balanced') return { bg: '#EEF4FF', border: '#C8D8FF', text: '#1D4ED8' };
  if (status === 'watch') return { bg: '#FFF6E8', border: '#F3D9A9', text: '#9A5A0A' };
  if (status === 'growth') return { bg: '#F2EEFF', border: '#D8CBFF', text: '#6D28D9' };
  return { bg: '#FDEEEF', border: '#F8C5CB', text: '#9F1239' };
}

function statusLabel(status: CompareMetricCardDTO['status'], t: (key: string) => string) {
  if (status === 'strong') return t('compare.gradeStrong');
  if (status === 'balanced') return t('compare.gradeBalanced');
  if (status === 'watch') return t('compare.gradeAttention');
  if (status === 'growth') return t('compare.gradeDevelopment');
  return t('compare.gradeIntense');
}

export default function MetricCardsGrid({ metrics }: MetricCardsGridProps) {
  const { t } = useTranslation();
  const safeMetrics = Array.isArray(metrics) ? metrics.filter((metric) => Boolean(metric?.id)) : [];
  if (!safeMetrics.length) {
    return null;
  }

  return (
    <View style={styles.grid}>
      {safeMetrics.map((metric) => {
        const palette = statusColors(metric.status);
        const title = metric.title?.trim() || 'Metrik';
        const insight =
          metric.insight?.trim() ||
          t('compare.metricCardHint');
        return (
          <View key={metric.id} style={styles.card}>
            <View style={styles.headRow}>
              <AccessibleText style={styles.title} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {title}
              </AccessibleText>
              <AccessibleText style={styles.score} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                %{metric.score}
              </AccessibleText>
            </View>

            <View style={[styles.statusPill, { backgroundColor: palette.bg, borderColor: palette.border }]}> 
              <AccessibleText
                style={[styles.statusText, { color: palette.text }]}
                maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
              >
                {statusLabel(metric.status, t)}
              </AccessibleText>
            </View>

            <AccessibleText style={styles.insight} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {insight}
            </AccessibleText>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  card: {
    width: '48.7%',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E7E0F1',
    backgroundColor: '#FFFFFF',
    padding: 10,
    gap: 8,
  },
  headRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  title: {
    flex: 1,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '700',
    color: '#2E2642',
  },
  score: {
    fontSize: 18,
    fontWeight: '900',
    color: '#241D37',
  },
  statusPill: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderRadius: 999,
    minHeight: 24,
    paddingHorizontal: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '800',
  },
  insight: {
    fontSize: 12,
    lineHeight: 17,
    color: '#534A69',
    fontWeight: '600',
  },
});
