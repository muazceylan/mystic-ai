import React from 'react';
import {
  TouchableOpacity,
  View,
  Text,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/colors';
import { SPACING } from '../../constants/tokens';

interface ListItemProps {
  title: string;
  subtitle?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onPress?: () => void;
  style?: ViewStyle;
  titleStyle?: TextStyle;
  selected?: boolean;
}

export function ListItem({
  title,
  subtitle,
  leftIcon,
  rightIcon = 'chevron-forward',
  onPress,
  style,
  titleStyle,
  selected,
}: ListItemProps) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const wrapperProps = onPress
    ? {
        onPress,
        activeOpacity: 0.7,
        accessibilityLabel: title,
        accessibilityRole: 'button' as const,
      }
    : {};

  return (
    <Wrapper
      style={[
        styles.row,
        selected && styles.rowSelected,
        style,
      ]}
      {...wrapperProps}
    >
      {leftIcon && (
        <View style={styles.leftIcon}>
          <Ionicons
            name={leftIcon}
            size={20}
            color={selected ? COLORS.primary : COLORS.subtext}
          />
        </View>
      )}
      <View style={styles.content}>
        <Text
          style={[
            styles.title,
            selected && styles.titleSelected,
            titleStyle,
          ]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {rightIcon && (
        <Ionicons
          name={rightIcon}
          size={16}
          color={COLORS.subtext}
        />
      )}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    minHeight: 44,
  },
  rowSelected: {
    backgroundColor: COLORS.primarySoft,
  },
  leftIcon: {
    marginRight: SPACING.md,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.text,
  },
  titleSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.subtext,
    marginTop: 2,
  },
});
