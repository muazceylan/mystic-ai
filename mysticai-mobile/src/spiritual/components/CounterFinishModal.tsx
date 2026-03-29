import React, { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Modal,
  View,
  Text,
  Pressable,
  TextInput,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Animated from 'react-native-reanimated';
import { useBottomSheetDragGesture } from '../../components/ui/useBottomSheetDragGesture';
interface Props {
  visible: boolean;
  itemName: string;
  completed: number;
  target: number;
  durationSec: number;
  onSave: (data: { note?: string }) => void;
  onDismiss: () => void;
  accentColor?: string;
  textColor?: string;
  surfaceColor?: string;
  bgColor?: string;
}

export const CounterFinishModal = memo(function CounterFinishModal({
  visible,
  itemName,
  completed,
  target,
  durationSec,
  onSave,
  onDismiss,
  accentColor = '#4CAF50',
  textColor = '#FFF',
  surfaceColor = '#1E3A2F',
  bgColor = '#0F2B1E',
}: Props) {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const { animatedStyle, gesture } = useBottomSheetDragGesture({
    enabled: visible,
    onClose: onDismiss,
  });

  const handleSave = () => {
    onSave({ note: note.trim() || undefined });
    setNote('');
  };

  const mins = Math.floor(durationSec / 60);
  const secs = durationSec % 60;
  const durationStr = mins > 0 ? `${mins}dk ${secs}sn` : `${secs}sn`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.overlay}
      >
        <Animated.View style={[styles.sheet, { backgroundColor: surfaceColor }, animatedStyle]}>
          <GestureDetector gesture={gesture}>
            <View>
              <View style={styles.handle} />
              <View style={styles.header}>
                <Text style={[styles.checkIcon]}>✅</Text>
                <Text style={[styles.title, { color: textColor }]}>{t('spiritual.finishModal.completed')}</Text>
                <Pressable onPress={onDismiss} style={styles.closeBtn}>
                  <Text style={[styles.closeText, { color: textColor + '80' }]}>✕</Text>
                </Pressable>
              </View>
            </View>
          </GestureDetector>

          {/* Summary */}
          <View style={[styles.summaryRow, { backgroundColor: bgColor + 'CC', borderColor: accentColor + '33' }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: accentColor }]}>{completed}</Text>
              <Text style={[styles.summaryLabel, { color: textColor + '99' }]}>{t('spiritual.finishModal.completedLabel')}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: accentColor + '33' }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: accentColor }]}>{target}</Text>
              <Text style={[styles.summaryLabel, { color: textColor + '99' }]}>{t('spiritual.finishModal.targetLabel')}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: accentColor + '33' }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: accentColor }]}>{durationStr}</Text>
              <Text style={[styles.summaryLabel, { color: textColor + '99' }]}>{t('spiritual.finishModal.durationLabel')}</Text>
            </View>
          </View>

          <Text style={[styles.itemName, { color: textColor + 'CC' }]}>{itemName}</Text>

          {/* Note */}
          <TextInput
            style={[styles.noteInput, { color: textColor, borderColor: accentColor + '44', backgroundColor: bgColor + 'AA' }]}
            placeholder={t('spiritual.finishModal.notePlaceholder')}
            placeholderTextColor={textColor + '44'}
            value={note}
            onChangeText={setNote}
            maxLength={500}
            multiline
          />

          {/* CTA */}
          <Pressable
            style={[styles.saveBtn, { backgroundColor: accentColor }]}
            onPress={handleSave}
          >
            <Text style={styles.saveBtnText}>{t('spiritual.finishModal.save')}</Text>
          </Pressable>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: '#00000088',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    paddingBottom: 36,
    gap: 14,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#FFFFFF44',
    marginBottom: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  checkIcon: { fontSize: 22 },
  title: { fontSize: 20, fontWeight: '800', flex: 1, marginLeft: 8 },
  closeBtn: { padding: 6 },
  closeText: { fontSize: 18, fontWeight: '700' },
  summaryRow: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: { alignItems: 'center', gap: 4 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  summaryLabel: { fontSize: 11 },
  divider: { width: 1, height: 32 },
  itemName: { fontSize: 14, fontStyle: 'italic', textAlign: 'center' },
  noteInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
  },
  saveBtn: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
  },
  saveBtnText: { color: '#FFF', fontWeight: '800', fontSize: 16 },
});
