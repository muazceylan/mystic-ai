import React, { memo, useState } from 'react';
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
import { MoodSelector } from './MoodSelector';
import type { Mood } from '../types';

interface Props {
  visible: boolean;
  itemName: string;
  completed: number;
  target: number;
  durationSec: number;
  onSave: (data: { note?: string; mood?: Mood }) => void;
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
  const [note, setNote] = useState('');
  const [mood, setMood] = useState<Mood | undefined>(undefined);

  const handleSave = () => {
    onSave({ note: note.trim() || undefined, mood });
    setNote('');
    setMood(undefined);
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
        <View style={[styles.sheet, { backgroundColor: surfaceColor }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.checkIcon]}>✅</Text>
            <Text style={[styles.title, { color: textColor }]}>Tamamlandı!</Text>
            <Pressable onPress={onDismiss} style={styles.closeBtn}>
              <Text style={[styles.closeText, { color: textColor + '80' }]}>✕</Text>
            </Pressable>
          </View>

          {/* Summary */}
          <View style={[styles.summaryRow, { backgroundColor: bgColor + 'CC', borderColor: accentColor + '33' }]}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: accentColor }]}>{completed}</Text>
              <Text style={[styles.summaryLabel, { color: textColor + '99' }]}>Tamamlanan</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: accentColor + '33' }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: accentColor }]}>{target}</Text>
              <Text style={[styles.summaryLabel, { color: textColor + '99' }]}>Hedef</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: accentColor + '33' }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: accentColor }]}>{durationStr}</Text>
              <Text style={[styles.summaryLabel, { color: textColor + '99' }]}>Süre</Text>
            </View>
          </View>

          <Text style={[styles.itemName, { color: textColor + 'CC' }]}>{itemName}</Text>

          {/* Mood */}
          <Text style={[styles.sectionLabel, { color: textColor + '99' }]}>Nasıl hissediyorsun?</Text>
          <MoodSelector
            selected={mood}
            onSelect={setMood}
            accentColor={accentColor}
            textColor={textColor}
          />

          {/* Note */}
          <TextInput
            style={[styles.noteInput, { color: textColor, borderColor: accentColor + '44', backgroundColor: bgColor + 'AA' }]}
            placeholder="Not ekle (opsiyonel)..."
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
            <Text style={styles.saveBtnText}>Kaydet</Text>
          </Pressable>
        </View>
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
  sectionLabel: { fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
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
