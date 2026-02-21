import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import OnboardingBackground from '../../components/OnboardingBackground';
import CalendarPicker from '../../components/CalendarPicker';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { getZodiacSign } from '../../constants/index';
import { COLORS } from '../../constants/colors';
import { SafeScreen } from '../../components/ui';

export default function BirthDateScreen() {
  const store = useOnboardingStore();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(store.birthDate);

  const handleConfirm = () => {
    if (tempDate) {
      store.setBirthDate(tempDate);
      const zodiac = getZodiacSign(tempDate.getMonth() + 1, tempDate.getDate());
      store.setZodiacSign(zodiac);
    }
    setShowPicker(false);
  };

  const formatDate = (date: Date) => {
    const day = date.getDate();
    const months = [
      'Ocak', 'Subat', 'Mart', 'Nisan', 'Mayis', 'Haziran',
      'Temmuz', 'Agustos', 'Eylul', 'Ekim', 'Kasim', 'Aralik',
    ];
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const canContinue = Boolean(store.birthDate);

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.content}>
        <Text style={styles.title}>Dogum Tarihiniz?</Text>
        <Text style={styles.subtitle}>
          Sizi analiz edebilmem icin dogum tarihinizi giriniz
        </Text>

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowPicker(true)}
          accessibilityLabel="Doğum tarihi seç"
          accessibilityRole="button"
        >
          <Ionicons name="calendar-outline" size={20} color={store.birthDate ? COLORS.primary : COLORS.disabledText} />
          <Text style={[styles.inputText, !store.birthDate && styles.placeholder]}>
            {store.birthDate ? formatDate(store.birthDate) : 'Tarih secin'}
          </Text>
          {store.birthDate && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Ionicons name="checkmark-circle" size={20} color={COLORS.primary} />
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.back()}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Text style={styles.outlineText}>Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !canContinue && styles.primaryDisabled]}
          accessibilityLabel="Devam et"
          accessibilityRole="button"
          disabled={!canContinue}
          onPress={() => canContinue && router.push('/birth-time')}
        >
          <Text style={[styles.primaryText, !canContinue && styles.primaryTextDisabled]}>
            Devam Et
          </Text>
        </TouchableOpacity>
      </View>

      {/* Material Design 3 style calendar modal */}
      <Modal visible={showPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* M3 Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalLabel}>Tarih secin</Text>
              <Text style={styles.modalSelectedDate}>
                {tempDate ? formatDate(tempDate) : 'Henuz secilmedi'}
              </Text>
            </View>

            <View style={styles.modalDivider} />

            {/* Calendar */}
            <ScrollView
              style={styles.calendarScroll}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <CalendarPicker
                selectedDate={tempDate}
                onSelect={setTempDate}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
              />
            </ScrollView>

            <View style={styles.modalDivider} />

            {/* M3 Action buttons */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalTextButton}
                onPress={() => setShowPicker(false)}
                accessibilityLabel="İptal"
                accessibilityRole="button"
              >
                <Text style={styles.modalTextButtonLabel}>Iptal</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTextButton, !tempDate && styles.modalTextButtonDisabled]}
                onPress={handleConfirm}
                disabled={!tempDate}
                accessibilityLabel="Tarihi onayla"
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.modalTextButtonLabel,
                    !tempDate && styles.modalTextButtonLabelDisabled,
                  ]}
                >
                  Tamam
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
    </SafeScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingHorizontal: 24,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.subtext,
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.disabledText,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingBottom: 32,
  },
  outlineButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  outlineText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryDisabled: {
    backgroundColor: COLORS.disabled,
  },
  primaryText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryTextDisabled: {
    color: COLORS.disabledText,
  },
  // M3 Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalCard: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: 28,
    overflow: 'hidden',
    maxHeight: '85%',
    elevation: 8,
    shadowColor: COLORS.shadow,
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  modalHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: COLORS.subtext,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  modalSelectedDate: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.text,
  },
  modalDivider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  calendarScroll: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  modalTextButton: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  modalTextButtonDisabled: {
    opacity: 0.4,
  },
  modalTextButtonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primary,
  },
  modalTextButtonLabelDisabled: {
    color: COLORS.disabledText,
  },
});
