import React, { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { X } from 'lucide-react-native';
import { AccessibleText } from '../ui';
import { ACCESSIBILITY } from '../../constants/tokens';
import { useTheme } from '../../context/ThemeContext';
import type { CompareExplainabilityDTO } from '../../types/compare';
import {
  formatFactorsList,
  formatExplainabilityGeneratedAt,
  normalizeDataQualityLabel,
} from '../../services/compare.presentation';
import { useBottomSheetDragGesture } from '../ui/useBottomSheetDragGesture';
import { useTranslation } from 'react-i18next';

interface CompareTechnicalDrawerProps {
  visible: boolean;
  explainability: CompareExplainabilityDTO;
  warningText: string | null;
  onClose: () => void;
}

export default function CompareTechnicalDrawer({
  visible,
  explainability,
  warningText,
  onClose,
}: CompareTechnicalDrawerProps) {
  const { t } = useTranslation();
  const { colors, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const { animatedStyle, gesture } = useBottomSheetDragGesture({
    enabled: visible,
    onClose,
  });
  const safeVersion = explainability?.calculationVersion?.trim() || 'compare-v3.0.0';
  const safeDataQuality = normalizeDataQualityLabel(explainability?.dataQuality);
  const safeProfile = explainability?.moduleScoringProfile?.trim() || 'compare-v3';
  const formattedGeneratedAt = formatExplainabilityGeneratedAt(explainability?.generatedAt);
  const factors = formatFactorsList(explainability?.factorsUsed);
  const safeMissingBirthTimeImpact = explainability?.missingBirthTimeImpact?.trim() || null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <GestureDetector gesture={gesture}>
          <Animated.View style={[styles.sheet, animatedStyle]}>
            <View>
              <View style={styles.handle} />
              <View style={styles.head}>
                <AccessibleText style={styles.title} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
                  {t('compare.technicalDrawerTitle')}
                </AccessibleText>
                <Pressable onPress={onClose} style={styles.closeBtn} accessibilityRole="button">
                  <X size={16} color={isDark ? colors.textSoft : '#4F4666'} />
                </Pressable>
              </View>
            </View>

          <AccessibleText style={styles.item} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {t('compare.technicalDrawerVersion', { v: safeVersion })}
          </AccessibleText>
          <AccessibleText style={styles.item} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {t('compare.technicalDrawerDataQuality', { q: safeDataQuality })}
          </AccessibleText>
          <AccessibleText style={styles.item} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {t('compare.technicalDrawerProfile', { p: safeProfile })}
          </AccessibleText>
          <AccessibleText style={styles.item} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {t('compare.technicalDrawerUpdated', { d: formattedGeneratedAt })}
          </AccessibleText>

          <AccessibleText style={styles.subTitle} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {t('compare.technicalDrawerFactorsTitle')}
          </AccessibleText>
          <AccessibleText style={styles.factors} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {factors.join(' • ') || t('compare.technicalDrawerNoFactor')}
          </AccessibleText>

          {warningText ? (
            <AccessibleText style={styles.warning} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {warningText}
            </AccessibleText>
          ) : null}

          {safeMissingBirthTimeImpact ? (
            <AccessibleText style={styles.warning} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {safeMissingBirthTimeImpact}
            </AccessibleText>
          ) : null}
          </Animated.View>
        </GestureDetector>
      </View>
    </Modal>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
) => StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: isDark ? 'rgba(2, 6, 23, 0.72)' : 'rgba(23, 18, 37, 0.35)',
  },
  sheet: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 7,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: colors.borderLight,
    marginBottom: 10,
  },
  head: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  item: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSoft,
    fontWeight: '600',
  },
  subTitle: {
    marginTop: 4,
    fontSize: 13,
    fontWeight: '800',
    color: colors.text,
  },
  factors: {
    fontSize: 12,
    lineHeight: 17,
    color: colors.body,
    fontWeight: '600',
  },
  warning: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: isDark ? colors.primaryLight : '#6D28D9',
    fontWeight: '700',
  },
});
