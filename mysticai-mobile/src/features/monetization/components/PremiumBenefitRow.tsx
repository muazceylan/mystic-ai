import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { ACCESSIBILITY } from '../../../constants/tokens';

type BenefitIconName = React.ComponentProps<typeof Ionicons>['name'];

interface PremiumBenefitRowProps {
  iconName: BenefitIconName;
  label: string;
}

const COLORS = {
  iconStart: 'rgba(168,85,247,0.92)',
  iconEnd: 'rgba(76,29,149,0.88)',
  border: 'rgba(255,255,255,0.10)',
  text: 'rgba(255,255,255,0.92)',
} as const;

export function PremiumBenefitRow({ iconName, label }: PremiumBenefitRowProps) {
  return (
    <View style={styles.row}>
      <LinearGradient
        colors={[COLORS.iconStart, COLORS.iconEnd] as const}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconShell}
      >
        <Ionicons name={iconName} size={16} color="#FFFFFF" />
      </LinearGradient>
      <Text
        style={styles.label}
        maxFontSizeMultiplier={ACCESSIBILITY.maxFontSizeMultiplier}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  iconShell: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
  },
  label: {
    flex: 1,
    color: COLORS.text,
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '600',
  },
});
