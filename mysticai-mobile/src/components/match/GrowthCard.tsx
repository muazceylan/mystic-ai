import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Brain,
  Check,
  CheckCircle2,
  Clock3,
  Heart,
  type LucideIcon,
  MessageCircleHeart,
} from 'lucide-react-native';
import { AccessibleText } from '../ui';
import { useTheme } from '../../context/ThemeContext';
import { ACCESSIBILITY } from '../../constants/tokens';
import type { GrowthAreaDTO } from '../../types/match';

interface GrowthCardProps {
  area: GrowthAreaDTO;
  checked: boolean;
  onToggle: () => void;
  index: number;
}

const CARD_ICONS: LucideIcon[] = [Clock3, Brain, MessageCircleHeart, Heart];
const CARD_TINTS = [
  { bg: '#FFF4E6', icon: '#C77D2A' },
  { bg: '#F8EEFF', icon: '#7C3AED' },
  { bg: '#EEF6FF', icon: '#2563EB' },
  { bg: '#FDEFF6', icon: '#BE185D' },
];

export default function GrowthCard({ area, checked, onToggle, index }: GrowthCardProps) {
  const { colors } = useTheme();
  const Icon = CARD_ICONS[index % CARD_ICONS.length] ?? Heart;
  const tint = CARD_TINTS[index % CARD_TINTS.length] ?? CARD_TINTS[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}> 
      <LinearGradient
        colors={[tint.bg, '#FFFFFF']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0.8 }}
        style={styles.headerBand}
      >
        <View style={styles.headerRow}>
          <View style={[styles.iconBubble, { backgroundColor: '#FFFFFF' }]}> 
            <Icon size={19} color={tint.icon} />
          </View>
          <View style={styles.headerTextWrap}>
            <AccessibleText style={[styles.title, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {area.title}
            </AccessibleText>
            <AccessibleText style={[styles.trigger, { color: colors.subtext }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {area.trigger}
            </AccessibleText>
          </View>
        </View>
      </LinearGradient>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <AccessibleText style={[styles.pattern, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
        {area.pattern}
      </AccessibleText>

      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      <View style={styles.protocolWrap}>
        {area.protocol.map((step, stepIndex) => (
          <View key={`${area.id}-step-${stepIndex}`} style={styles.protocolRow}>
            <CheckCircle2 size={16} color={colors.violet} />
            <AccessibleText style={[styles.stepText, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {step}
            </AccessibleText>
          </View>
        ))}
      </View>

      <Pressable
        onPress={onToggle}
        style={[styles.habitRow, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
      >
        <View
          style={[
            styles.checkbox,
            {
              borderColor: checked ? colors.violetLight : colors.border,
              backgroundColor: checked ? colors.violetBg : colors.surface,
            },
          ]}
        >
          {checked ? <Check size={14} color={colors.violet} /> : null}
        </View>
        <AccessibleText style={[styles.habitText, { color: colors.text }]} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
          {area.habitLabel}
        </AccessibleText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 2,
  },
  headerBand: {
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderWidth: 1,
    borderColor: '#EEE6FA',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBubble: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E8DBFA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextWrap: {
    flex: 1,
    gap: 3,
  },
  title: {
    fontSize: 19,
    fontWeight: '800',
    lineHeight: 24,
  },
  trigger: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  divider: {
    height: 1,
    borderRadius: 1,
  },
  pattern: {
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '600',
  },
  protocolWrap: {
    gap: 9,
  },
  protocolRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  habitRow: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 11,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 6,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  habitText: {
    flex: 1,
    fontSize: 13.5,
    fontWeight: '700',
    lineHeight: 19,
  },
});
