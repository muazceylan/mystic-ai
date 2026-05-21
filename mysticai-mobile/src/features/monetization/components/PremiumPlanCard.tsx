import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ACCESSIBILITY } from '../../../constants/tokens';

type PlanIconName = React.ComponentProps<typeof Ionicons>['name'];

export interface PremiumPlanCardProps {
  title: string;
  subtitle: string;
  note: string;
  price?: string | null;
  priceSuffix: string;
  selected: boolean;
  recommended?: boolean;
  recommendedLabel?: string;
  iconName: PlanIconName;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

const COLORS = {
  card: 'rgba(37,9,78,0.76)',
  cardSelected: 'rgba(94,22,181,0.56)',
  border: 'rgba(255,255,255,0.12)',
  borderSelected: '#C084FC',
  purple: '#A855F7',
  purpleDeep: '#4C1D95',
  gold: '#FFD76A',
  white: '#FFFFFF',
  textSoft: 'rgba(255,255,255,0.70)',
  textMuted: 'rgba(255,255,255,0.58)',
} as const;

export function PremiumPlanCard({
  title,
  subtitle,
  note,
  price,
  priceSuffix,
  selected,
  recommended,
  recommendedLabel,
  iconName,
  loading,
  disabled,
  onPress,
}: PremiumPlanCardProps) {
  return (
    <TouchableOpacity
      style={[
        styles.card,
        selected && styles.cardSelected,
        disabled && styles.cardDisabled,
      ]}
      activeOpacity={0.84}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      accessibilityState={{ selected, disabled }}
      accessibilityLabel={title}
    >
      <View style={styles.planLeft}>
        <LinearGradient
          colors={selected
            ? [COLORS.purple, COLORS.purpleDeep] as const
            : ['rgba(168,85,247,0.78)', 'rgba(76,29,149,0.72)'] as const}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconShell}
        >
          <Ionicons name={iconName} size={25} color={COLORS.white} />
        </LinearGradient>

        <View style={styles.copy}>
          <Text
            style={styles.title}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.82}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {title}
          </Text>
          <Text
            style={styles.subtitle}
            numberOfLines={2}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {subtitle}
          </Text>
          <Text
            style={styles.note}
            numberOfLines={2}
            maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
          >
            {note}
          </Text>
        </View>
      </View>

      <View style={styles.priceColumn}>
        {recommended && recommendedLabel ? (
          <LinearGradient
            colors={[COLORS.purple, '#7C3AED'] as const}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.badge}
          >
            <Ionicons name="star" size={11} color={COLORS.white} />
            <Text style={styles.badgeText} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
              {recommendedLabel}
            </Text>
          </LinearGradient>
        ) : null}

        <View style={styles.priceWrap}>
          {loading ? (
            <ActivityIndicator color={COLORS.white} size="small" />
          ) : (
            <Text
              style={styles.price}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.74}
              maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
            >
              {price || '-'}
            </Text>
          )}
          <Text style={styles.priceSuffix} maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}>
            {priceSuffix}
          </Text>
        </View>

        <View style={[styles.radio, selected && styles.radioSelected]}>
          {selected ? <View style={styles.radioDot} /> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 112,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    padding: 14,
    overflow: 'hidden',
  },
  cardSelected: {
    borderWidth: 1.5,
    borderColor: COLORS.borderSelected,
    backgroundColor: COLORS.cardSelected,
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.48,
    shadowRadius: 14,
    elevation: 8,
  },
  cardDisabled: {
    opacity: 0.58,
  },
  planLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconShell: {
    width: 58,
    height: 58,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  subtitle: {
    color: COLORS.textSoft,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
  },
  note: {
    color: COLORS.textMuted,
    fontSize: 11,
    lineHeight: 16,
    fontWeight: '500',
  },
  priceColumn: {
    width: 104,
    minHeight: 78,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  badge: {
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '800',
  },
  priceWrap: {
    alignItems: 'flex-end',
  },
  price: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: '800',
  },
  priceSuffix: {
    color: COLORS.textSoft,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  radio: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(192,132,252,0.62)',
  },
  radioSelected: {
    borderColor: COLORS.white,
    backgroundColor: 'rgba(168,85,247,0.34)',
    shadowColor: COLORS.purple,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
  },
  radioDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
});
