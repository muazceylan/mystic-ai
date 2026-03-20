import React from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles } from 'lucide-react-native';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import type { MatchDTO } from '../../types/match';

interface StoryCardPreviewProps {
  data: MatchDTO;
}

export default function StoryCardPreview({ data }: StoryCardPreviewProps) {
  const topAxes = data.axes.slice(0, 2);

  return (
    <View style={styles.shell}>
      <LinearGradient
        colors={['#5B21B6', '#7C3AED', '#9F67FF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.canvas}
      >
        <View style={styles.headerRow}>
          <View style={styles.namePill}>
            <AccessibleText style={styles.nameText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {data.people.left.name}
            </AccessibleText>
            <AccessibleText style={styles.nameSign} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {data.people.left.signIcon} {data.people.left.signLabel}
            </AccessibleText>
          </View>

          <View style={styles.andPill}>
            <AccessibleText style={styles.andText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              &
            </AccessibleText>
          </View>

          <View style={styles.namePill}>
            <AccessibleText style={styles.nameText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {data.people.right.name}
            </AccessibleText>
            <AccessibleText style={styles.nameSign} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {data.people.right.signIcon} {data.people.right.signLabel}
            </AccessibleText>
          </View>
        </View>

        <View style={styles.scoreBlock}>
          <AccessibleText style={styles.scoreValue} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            %{data.overallScore}
          </AccessibleText>
          <AccessibleText style={styles.scoreLabel} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            Genel Uyum
          </AccessibleText>
        </View>

        <View style={styles.summaryCard}>
          <AccessibleText style={styles.summaryHeadline} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {data.summaryPlain.headline}
          </AccessibleText>
          <AccessibleText style={styles.summaryBody} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {data.summaryPlain.body}
          </AccessibleText>
        </View>

        <View style={styles.axesList}>
          {topAxes.map((axis) => (
            <View key={`story-axis-${axis.id}`} style={styles.axisCard}>
              <AccessibleText style={styles.axisTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {axis.title}
              </AccessibleText>
              <AccessibleText style={styles.axisImpact} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                {axis.impactPlain}
              </AccessibleText>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <Sparkles size={16} color="#E9D5FF" />
          <AccessibleText style={styles.footerText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            astro guru • Uyum Haritası
          </AccessibleText>
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    width: '100%',
    aspectRatio: 1080 / 1920,
    borderRadius: 24,
    overflow: 'hidden',
  },
  canvas: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 42,
    paddingBottom: 30,
    justifyContent: 'space-between',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  namePill: {
    flex: 1,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingVertical: 10,
    paddingHorizontal: 10,
    alignItems: 'center',
    gap: 2,
  },
  nameText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  nameSign: {
    color: 'rgba(255,255,255,0.86)',
    fontSize: 11,
    fontWeight: '600',
  },
  andPill: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.26)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  andText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '800',
  },
  scoreBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    marginBottom: 8,
  },
  scoreValue: {
    color: '#FFFFFF',
    fontSize: 86,
    fontWeight: '900',
    letterSpacing: -1.6,
  },
  scoreLabel: {
    marginTop: -8,
    color: 'rgba(255,255,255,0.9)',
    fontSize: 18,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    padding: 14,
    gap: 8,
  },
  summaryHeadline: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    lineHeight: 26,
  },
  summaryBody: {
    color: 'rgba(255,255,255,0.92)',
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  axesList: {
    gap: 10,
  },
  axisCard: {
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    padding: 12,
    gap: 4,
  },
  axisTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  axisImpact: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  footerText: {
    color: '#E9D5FF',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
