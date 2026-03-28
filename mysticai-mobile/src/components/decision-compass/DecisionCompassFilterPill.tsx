import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../context/ThemeContext';
import { DecisionCompassPremiumBadge } from './DecisionCompassPremiumBadge';
import { getCompassTokens } from './tokens';

type DecisionCompassFilterTone = NonNullable<
  React.ComponentProps<typeof DecisionCompassPremiumBadge>['tone']
>;

interface DecisionCompassFilterPillProps {
  label: string;
  iconName: React.ComponentProps<typeof DecisionCompassPremiumBadge>['iconName'];
  tone: DecisionCompassFilterTone;
  selected?: boolean;
  meta?: string;
  minWidth?: number;
  variant?: 'default' | 'date' | 'action';
  onPress?: () => void;
}

function resolveAuraColor(
  tone: DecisionCompassFilterTone,
  isDark: boolean,
): string {
  switch (tone) {
    case 'hero':
      return isDark ? 'rgba(196, 181, 253, 0.18)' : 'rgba(218, 196, 255, 0.72)';
    case 'supportive':
      return isDark ? 'rgba(125, 211, 252, 0.16)' : 'rgba(210, 228, 255, 0.76)';
    case 'balanced':
      return isDark ? 'rgba(148, 163, 184, 0.14)' : 'rgba(230, 238, 255, 0.76)';
    case 'caution':
      return isDark ? 'rgba(196, 181, 253, 0.12)' : 'rgba(237, 231, 255, 0.80)';
    case 'cosmic':
    default:
      return isDark ? 'rgba(96, 165, 250, 0.16)' : 'rgba(220, 231, 255, 0.76)';
  }
}

export function DecisionCompassFilterPill({
  label,
  iconName,
  tone,
  selected = false,
  meta,
  minWidth,
  variant = 'default',
  onPress,
}: DecisionCompassFilterPillProps) {
  const { colors, isDark } = useTheme();
  const T = getCompassTokens(colors, isDark);
  const S = styles(colors, isDark, T);
  const auraColor = resolveAuraColor(tone, isDark);
  const gradientColors = selected
    ? T.chip.selectedGradient
    : variant === 'action'
      ? T.chip.actionGradient
      : T.chip.defaultGradient;

  const shellStyle = [
    S.shell,
    selected ? S.selectedShell : null,
    variant === 'date' ? S.dateShell : null,
    variant === 'action' ? S.actionShell : null,
    minWidth ? { minWidth } : null,
  ];

  const content = (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0.15 }}
      end={{ x: 1, y: 0.92 }}
      style={S.gradientFill}
    >
      <View
        pointerEvents="none"
        style={[
          S.aura,
          {
            backgroundColor: auraColor,
            opacity: selected || variant !== 'default' ? 1 : 0.74,
          },
        ]}
      />
      <View pointerEvents="none" style={[S.edgeLine, selected && S.selectedEdgeLine]} />
      <View style={S.content}>
        <DecisionCompassPremiumBadge iconName={iconName} tone={tone} size="xs" />
        <View style={S.textWrap}>
          {meta ? <Text style={[S.metaText, selected && S.selectedMetaText]}>{meta}</Text> : null}
          <Text style={[S.labelText, selected && S.selectedLabelText]} numberOfLines={1}>
            {label}
          </Text>
        </View>
        {selected ? <View style={S.selectedDot} /> : null}
      </View>
    </LinearGradient>
  );

  if (!onPress) {
    return <View style={shellStyle}>{content}</View>;
  }

  return (
    <Pressable onPress={onPress} style={({ pressed }) => [shellStyle, pressed && S.pressed]}>
      {content}
    </Pressable>
  );
}

function styles(
  C: ReturnType<typeof useTheme>['colors'],
  isDark: boolean,
  T: ReturnType<typeof getCompassTokens>,
) {
  return StyleSheet.create({
    shell: {
      minHeight: 48,
      borderRadius: 23,
      borderWidth: 1,
      borderColor: T.border.soft,
      overflow: 'hidden',
      ...T.shadows.soft,
    },
    selectedShell: {
      borderColor: T.border.hero,
      ...T.shadows.ambient,
    },
    dateShell: {
      justifyContent: 'center',
    },
    actionShell: {
      borderColor: isDark ? 'rgba(205, 175, 255, 0.24)' : 'rgba(202, 173, 246, 0.74)',
    },
    gradientFill: {
      position: 'relative',
      overflow: 'hidden',
    },
    aura: {
      position: 'absolute',
      top: -16,
      right: -20,
      width: 116,
      height: 66,
      borderRadius: 36,
    },
    edgeLine: {
      position: 'absolute',
      top: 1,
      left: 12,
      right: 12,
      height: 13,
      borderRadius: 999,
      backgroundColor: isDark ? 'rgba(255,255,255,0.10)' : 'rgba(255,255,255,0.62)',
    },
    selectedEdgeLine: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.54)',
    },
    content: {
      minHeight: 48,
      paddingHorizontal: 12,
      paddingVertical: 8,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      backgroundColor: T.surface.soft,
    },
    textWrap: {
      flexShrink: 1,
      gap: 1,
    },
    metaText: {
      color: T.text.subtitle,
      fontSize: 9.8,
      fontWeight: '700',
      letterSpacing: 0.15,
    },
    selectedMetaText: {
      color: C.primary,
    },
    labelText: {
      color: T.text.title,
      fontSize: 13.3,
      fontWeight: '800',
      letterSpacing: 0.1,
    },
    selectedLabelText: {
      color: C.text,
    },
    selectedDot: {
      width: 5,
      height: 5,
      borderRadius: 999,
      marginLeft: 2,
      backgroundColor: C.primary,
      shadowColor: C.primary,
      shadowOpacity: isDark ? 0.36 : 0.24,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 0 },
      elevation: 2,
    },
    pressed: {
      opacity: 0.86,
    },
  });
}
