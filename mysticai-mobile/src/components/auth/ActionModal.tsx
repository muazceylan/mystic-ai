import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useTheme } from '../../context/ThemeContext';
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { useBottomSheetDragGesture } from '../ui/useBottomSheetDragGesture';

type ActionVariant = 'primary' | 'secondary';

interface ActionItem {
  label: string;
  onPress: () => void;
  variant?: ActionVariant;
  loading?: boolean;
  disabled?: boolean;
  accessibilityHint?: string;
}

interface ActionModalProps {
  visible: boolean;
  title: string;
  description: string;
  actions: ActionItem[];
  onRequestClose: () => void;
}

export function ActionModal({
  visible,
  title,
  description,
  actions,
  onRequestClose,
}: ActionModalProps) {
  const { colors } = useTheme();
  const styles = makeStyles(colors);
  const { animatedStyle, gesture } = useBottomSheetDragGesture({
    enabled: visible,
    onClose: onRequestClose,
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onRequestClose}
      presentationStyle="overFullScreen"
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onRequestClose} />
        <Animated.View style={[styles.sheet, animatedStyle]}>
          <GestureDetector gesture={gesture}>
            <View>
              <View style={styles.handle} />
              <Text style={styles.title}>{title}</Text>
              <Text style={styles.description}>{description}</Text>
            </View>
          </GestureDetector>

          <View style={styles.actions}>
            {actions.map((action) =>
              action.variant === 'secondary' ? (
                <SecondaryButton
                  key={action.label}
                  title={action.label}
                  onPress={action.onPress}
                  loading={action.loading}
                  disabled={action.disabled}
                  accessibilityHint={action.accessibilityHint}
                />
              ) : (
                <PrimaryButton
                  key={action.label}
                  title={action.label}
                  onPress={action.onPress}
                  loading={action.loading}
                  disabled={action.disabled}
                  accessibilityHint={action.accessibilityHint}
                />
              )
            )}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: C.dim,
      justifyContent: 'flex-end',
      padding: 16,
    },
    sheet: {
      backgroundColor: C.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: C.border,
      padding: 20,
      gap: 10,
      shadowColor: C.shadow,
      shadowOpacity: 0.25,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -4 },
      elevation: 8,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: 999,
      backgroundColor: C.border,
      marginBottom: 12,
    },
    title: {
      color: C.text,
      fontSize: 20,
      fontWeight: '700',
    },
    description: {
      color: C.subtext,
      fontSize: 14,
      lineHeight: 20,
    },
    actions: {
      marginTop: 6,
      gap: 10,
    },
  });
}
