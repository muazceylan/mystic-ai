import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme, ThemeColors } from '../../../context/ThemeContext';
import { TYPOGRAPHY, SPACING, RADIUS } from '../../../constants/tokens';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface Props {
  icon: IoniconsName;
  title: string;
  content: string;
  color?: string;
}

export function CategoryCard({ icon, title, content, color }: Props) {
  const { colors, isDark } = useTheme();
  const S = makeStyles(colors, isDark);
  const [expanded, setExpanded] = useState(false);
  const accent = color ?? colors.horoscopeAccent;

  return (
    <Pressable
      onPress={() => setExpanded(!expanded)}
      style={({ pressed }) => [S.card, pressed && { opacity: 0.9 }]}
    >
      <View style={S.header}>
        <View style={[S.iconWrap, { backgroundColor: accent + '1A' }]}>
          <Ionicons name={icon} size={18} color={accent} />
        </View>
        <Text style={S.title}>{title}</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.subtext}
        />
      </View>
      {expanded && <Text style={S.content}>{content}</Text>}
    </Pressable>
  );
}

function makeStyles(C: ThemeColors, isDark: boolean) {
  return StyleSheet.create({
    card: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : C.surface,
      borderRadius: RADIUS.md,
      padding: SPACING.md,
      borderWidth: 1,
      borderColor: isDark ? 'rgba(255,255,255,0.06)' : C.border,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: SPACING.sm,
    },
    title: {
      ...TYPOGRAPHY.SmallBold,
      color: C.text,
      flex: 1,
    },
    content: {
      ...TYPOGRAPHY.Small,
      color: C.body,
      marginTop: SPACING.sm,
      lineHeight: 22,
    },
  });
}
