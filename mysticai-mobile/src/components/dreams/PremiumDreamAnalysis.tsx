import React, { useEffect, useState } from 'react';
import { Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext';
import {
  dreamService,
  type DreamAnalysisResult,
} from '../../services/dream.service';
import { trackEvent } from '../../services/analytics';
import { DreamExpansionSheet } from './DreamExpansionSheet';

interface PremiumDreamAnalysisProps {
  analysis: DreamAnalysisResult;
  isPremium: boolean;
  dreamId: number;
  onShowPurchase: () => void;
  onShowEarn: (expansionType: import('../../services/dream.service').DreamExpansionType) => void;
  onShowPremium: () => void;
}

export function PremiumDreamAnalysis({
  analysis,
  isPremium,
  dreamId,
  onShowPurchase,
  onShowEarn,
  onShowPremium,
}: PremiumDreamAnalysisProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const [feedback, setFeedback] = useState<'helpful' | 'not_helpful' | null>(null);
  const [showExpansion, setShowExpansion] = useState(false);
  const [defaultExpansionCost, setDefaultExpansionCost] = useState<number | null>(null);
  useEffect(() => {
    let active = true;
    dreamService.getExpansionConfig()
      .then((config) => {
        if (active) setDefaultExpansionCost(config.defaultCost);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);
  const confidence = Math.round(
    Math.max(0, Math.min(1, analysis.emotionalCore.confidence)) * 100,
  );
  const details = isPremium ? analysis.keyDetails.slice(0, 3) : analysis.keyDetails.slice(0, 1);
  const shareSummary = [
    t('dreams.analysis.shareTitle'),
    analysis.essence,
    analysis.emotionalCore.primaryEmotion
      ? `${t('dreams.analysis.primaryEmotion')}: ${analysis.emotionalCore.primaryEmotion}`
      : null,
    analysis.reflectionQuestion,
  ].filter(Boolean).join('\n\n');

  const shareAnalysis = async () => {
    const result = await Share.share({ message: shareSummary });
    if (result.action === Share.sharedAction) {
      trackEvent('dream_share_card_created', {
        input_quality: analysis.inputQuality.level,
        premium_status: isPremium,
        contains_sensitive_details: false,
      });
    }
  };

  const sendFeedback = (value: 'helpful' | 'not_helpful') => {
    setFeedback(value);
    trackEvent('dream_analysis_feedback_sent', {
      input_quality: analysis.inputQuality.level,
      premium_status: isPremium,
      user_feedback: value,
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.essenceCard}>
        <View style={styles.eyebrowRow}>
          <Ionicons name="moon" size={15} color={colors.goldDark} />
          <Text style={styles.eyebrow}>{t('dreams.analysis.essence')}</Text>
          <View style={styles.qualityBadge}>
            <Text style={styles.qualityText}>
              {t(`dreams.analysis.quality.${analysis.inputQuality.level}`)}
            </Text>
          </View>
        </View>
        <Text style={styles.essence}>{analysis.essence}</Text>
      </View>

      {analysis.inputQuality.level === 'INSUFFICIENT' ? (
        <Section
          icon="chatbubble-ellipses-outline"
          title={t('dreams.analysis.followUp')}
          styles={styles}
          iconColor={colors.primary}
        >
          <Text style={styles.body}>{analysis.deepInterpretation}</Text>
          {analysis.followUpQuestions.slice(0, 2).map((question) => (
            <View key={question} style={styles.questionRow}>
              <View style={styles.questionDot} />
              <Text style={styles.questionText}>{question}</Text>
            </View>
          ))}
        </Section>
      ) : (
        <>
          <Section
            icon="pulse-outline"
            title={t('dreams.analysis.emotionalCore')}
            styles={styles}
            iconColor={colors.primary}
          >
            <View style={styles.emotionGrid}>
              <Metric
                label={t('dreams.analysis.primaryEmotion')}
                value={analysis.emotionalCore.primaryEmotion || t('dreams.analysis.notSpecified')}
                styles={styles}
              />
              <Metric
                label={t('dreams.analysis.secondaryEmotion')}
                value={analysis.emotionalCore.secondaryEmotion || t('dreams.analysis.notSpecified')}
                styles={styles}
              />
            </View>
            {analysis.emotionalCore.emotionalTransition ? (
              <Text style={styles.transition}>{analysis.emotionalCore.emotionalTransition}</Text>
            ) : null}
            <Text style={styles.confidence}>
              {t('dreams.analysis.confidence', { value: confidence })}
            </Text>
          </Section>

          {details.length > 0 ? (
            <Section
              icon="search-outline"
              title={t('dreams.analysis.keyDetails')}
              styles={styles}
              iconColor={colors.violet}
            >
              {details.map((detail, index) => (
                <View key={`${detail.title}-${index}`} style={styles.detail}>
                  <Text style={styles.detailIndex}>0{index + 1}</Text>
                  <View style={styles.detailBody}>
                    <Text style={styles.detailTitle}>{detail.title}</Text>
                    <Text style={styles.context}>{detail.dreamContext}</Text>
                    <Text style={styles.body}>{detail.interpretation}</Text>
                  </View>
                </View>
              ))}
            </Section>
          ) : null}

          <Section
            icon="layers-outline"
            title={t('dreams.analysis.deepInterpretation')}
            styles={styles}
            iconColor={colors.primary}
          >
            <Text style={styles.body}>{analysis.deepInterpretation}</Text>
          </Section>

          {analysis.personalConnection ? (
            <Section
              icon="person-outline"
              title={t('dreams.analysis.personalConnection')}
              styles={styles}
              iconColor={colors.green}
            >
              <Text style={styles.body}>{analysis.personalConnection}</Text>
            </Section>
          ) : null}

          {isPremium && analysis.patternConnection ? (
            <Section
              icon="git-compare-outline"
              title={t('dreams.analysis.patternConnection')}
              styles={styles}
              iconColor={colors.violet}
            >
              <Text style={styles.body}>{analysis.patternConnection.summary}</Text>
            </Section>
          ) : null}
        </>
      )}

      <View style={styles.reflectionCard}>
        <Text style={styles.reflectionLabel}>{t('dreams.analysis.reflectionQuestion')}</Text>
        <Text style={styles.reflectionText}>{analysis.reflectionQuestion}</Text>
      </View>

      <View style={styles.journalRow}>
        <Ionicons name="bookmark-outline" size={18} color={colors.goldDark} />
        <View style={styles.journalBody}>
          <Text style={styles.journalLabel}>{t('dreams.analysis.journalNote')}</Text>
          <Text style={styles.body}>{analysis.journalTrackingNote}</Text>
        </View>
      </View>

      {analysis.astrologyNote ? (
        <Section
          icon="planet-outline"
          title={t('dreams.analysis.skyConnection')}
          styles={styles}
          iconColor={colors.goldDark}
        >
          <Text style={styles.body}>{analysis.astrologyNote}</Text>
        </Section>
      ) : null}

      {analysis.inputQuality.level !== 'INSUFFICIENT' ? (
        <TouchableOpacity
          style={styles.deepenButton}
          onPress={() => {
            trackEvent('dream_expansion_cta_clicked', {
              premium_status: isPremium,
              token_cost: defaultExpansionCost,
            });
            setShowExpansion(true);
          }}
          accessibilityLabel={t('dreams.analysis.expansion.cta')}
          accessibilityRole="button"
        >
          <View style={styles.deepenIcon}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
          </View>
          <View style={styles.deepenBody}>
            <Text style={styles.deepenTitle}>
              {defaultExpansionCost == null
                ? t('dreams.analysis.expansion.cta')
                : t('dreams.analysis.expansion.ctaWithCost', { cost: defaultExpansionCost })}
            </Text>
            <Text style={styles.deepenSubtitle}>{t('dreams.analysis.expansion.ctaBody')}</Text>
          </View>
          <Ionicons name="chevron-forward" size={19} color={colors.primary} />
        </TouchableOpacity>
      ) : null}

      <View style={styles.footerActions}>
        <View style={styles.feedbackBlock}>
          <Text style={styles.feedbackLabel}>{t('dreams.analysis.helpful')}</Text>
          <View style={styles.feedbackButtons}>
            <TouchableOpacity
              style={[styles.iconButton, feedback === 'helpful' && styles.iconButtonActive]}
              onPress={() => sendFeedback('helpful')}
              accessibilityLabel={t('dreams.analysis.helpfulYes')}
              accessibilityRole="button"
            >
              <Ionicons name="thumbs-up-outline" size={17} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, feedback === 'not_helpful' && styles.iconButtonActive]}
              onPress={() => sendFeedback('not_helpful')}
              accessibilityLabel={t('dreams.analysis.helpfulNo')}
              accessibilityRole="button"
            >
              <Ionicons name="thumbs-down-outline" size={17} color={colors.subtext} />
            </TouchableOpacity>
          </View>
        </View>
        <TouchableOpacity
          style={styles.shareButton}
          onPress={() => void shareAnalysis()}
          accessibilityLabel={t('dreams.analysis.share')}
          accessibilityRole="button"
        >
          <Ionicons name="share-social-outline" size={17} color={colors.white} />
          <Text style={styles.shareText}>{t('dreams.analysis.share')}</Text>
        </TouchableOpacity>
      </View>

      <DreamExpansionSheet
        visible={showExpansion}
        dreamId={dreamId}
        isPremium={isPremium}
        onClose={() => setShowExpansion(false)}
        onShowPurchase={() => {
          setShowExpansion(false);
          onShowPurchase();
        }}
        onShowEarn={(expansionType) => {
          setShowExpansion(false);
          onShowEarn(expansionType);
        }}
        onShowPremium={() => {
          setShowExpansion(false);
          onShowPremium();
        }}
      />
    </View>
  );
}

function Section({
  icon,
  title,
  iconColor,
  styles,
  children,
}: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  iconColor: string;
  styles: ReturnType<typeof makeStyles>;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={styles.iconShell}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function Metric({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

const makeStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: { gap: 12 },
  essenceCard: {
    borderRadius: 22,
    padding: 18,
    backgroundColor: colors.primarySoftBg,
    borderWidth: 1,
    borderColor: colors.primaryLight,
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 11 },
  eyebrow: {
    flex: 1,
    color: colors.goldDark,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  qualityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: colors.surface,
  },
  qualityText: { color: colors.subtext, fontSize: 10, fontWeight: '700' },
  essence: { color: colors.text, fontSize: 18, lineHeight: 27, fontWeight: '700' },
  section: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 13 },
  iconShell: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceMuted,
  },
  sectionTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  emotionGrid: { flexDirection: 'row', gap: 10 },
  metric: { flex: 1, padding: 12, borderRadius: 14, backgroundColor: colors.surfaceMuted },
  metricLabel: { color: colors.subtext, fontSize: 10, fontWeight: '700', marginBottom: 5 },
  metricValue: { color: colors.text, fontSize: 14, fontWeight: '800' },
  transition: { color: colors.body, fontSize: 13, lineHeight: 19, marginTop: 11 },
  confidence: { color: colors.subtext, fontSize: 10, marginTop: 8 },
  detail: { flexDirection: 'row', gap: 12, paddingVertical: 10 },
  detailIndex: { color: colors.primaryLight, fontSize: 22, fontWeight: '900' },
  detailBody: { flex: 1 },
  detailTitle: { color: colors.text, fontSize: 14, fontWeight: '800', marginBottom: 4 },
  context: { color: colors.violet, fontSize: 12, lineHeight: 18, marginBottom: 5 },
  body: { color: colors.body, fontSize: 14, lineHeight: 21 },
  reflectionCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: colors.violetBg,
    borderLeftWidth: 3,
    borderLeftColor: colors.violet,
  },
  reflectionLabel: {
    color: colors.violetText,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  reflectionText: { color: colors.text, fontSize: 17, lineHeight: 25, fontWeight: '700' },
  journalRow: {
    flexDirection: 'row',
    gap: 11,
    borderRadius: 16,
    padding: 15,
    backgroundColor: colors.goldLight,
  },
  journalBody: { flex: 1 },
  journalLabel: { color: colors.goldDark, fontSize: 12, fontWeight: '800', marginBottom: 5 },
  questionRow: { flexDirection: 'row', gap: 9, marginTop: 10, alignItems: 'flex-start' },
  questionDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginTop: 7,
    backgroundColor: colors.primary,
  },
  questionText: { flex: 1, color: colors.text, fontSize: 14, lineHeight: 21, fontWeight: '600' },
  footerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 3,
  },
  feedbackBlock: { flex: 1 },
  feedbackLabel: { color: colors.subtext, fontSize: 11, fontWeight: '700', marginBottom: 7 },
  feedbackButtons: { flexDirection: 'row', gap: 7 },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  iconButtonActive: { borderColor: colors.primary, backgroundColor: colors.primarySoftBg },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    backgroundColor: colors.primary,
  },
  shareText: { color: colors.white, fontSize: 12, fontWeight: '800' },
  deepenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderRadius: 18,
    padding: 14,
    backgroundColor: colors.primarySoftBg,
  },
  deepenIcon: {
    width: 38,
    height: 38,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  deepenBody: { flex: 1 },
  deepenTitle: { color: colors.text, fontSize: 14, fontWeight: '900', marginBottom: 3 },
  deepenSubtitle: { color: colors.subtext, fontSize: 11, lineHeight: 16 },
});
