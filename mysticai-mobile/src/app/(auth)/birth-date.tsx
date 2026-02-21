import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import CalendarPicker from '../../components/CalendarPicker';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { getZodiacSign } from '../../constants/index';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

function makeStyles(C: ReturnType<typeof useTheme>['colors']) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: C.bg,
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
      color: C.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 14,
      color: C.subtext,
      textAlign: 'center',
      marginBottom: 24,
    },
    input: {
      width: '100%',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
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
      color: C.text,
    },
    placeholder: {
      color: C.disabledText,
    },
    footer: {
      flexDirection: 'row',
      gap: 12,
      paddingBottom: 32,
    },
    outlineButton: {
      flex: 1,
      borderWidth: 1,
      borderColor: C.primary,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: C.surface,
    },
    outlineText: {
      color: C.primary,
      fontSize: 15,
      fontWeight: '600',
    },
    primaryButton: {
      flex: 1,
      borderRadius: 999,
      paddingVertical: 14,
      alignItems: 'center',
      backgroundColor: C.primary,
    },
    primaryDisabled: {
      backgroundColor: C.disabled,
    },
    primaryText: {
      color: C.white,
      fontSize: 15,
      fontWeight: '600',
    },
    primaryTextDisabled: {
      color: C.disabledText,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalCard: {
      width: '100%',
      backgroundColor: C.surface,
      borderRadius: 28,
      overflow: 'hidden',
      maxHeight: '85%',
      elevation: 8,
      shadowColor: C.shadow,
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
      color: C.subtext,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 8,
    },
    modalSelectedDate: {
      fontSize: 22,
      fontWeight: '700',
      color: C.text,
    },
    modalDivider: {
      height: 1,
      backgroundColor: C.border,
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
      color: C.primary,
    },
    modalTextButtonLabelDisabled: {
      color: C.disabledText,
    },
  });
}

export default function BirthDateScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useOnboardingStore();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState<Date | null>(store.birthDate);
  const styles = makeStyles(colors);

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
    const months = t('calendar.months').split(',');
    return `${day} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const canContinue = Boolean(store.birthDate);

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.content}>
        <Text style={styles.title}>{t('auth.birthDateTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.birthDateSubtitle')}
        </Text>

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowPicker(true)}
          accessibilityLabel={t('editBirthInfo.accessibilitySelectDate')}
          accessibilityRole="button"
        >
          <Ionicons name="calendar-outline" size={20} color={store.birthDate ? colors.primary : colors.disabledText} />
          <Text style={[styles.inputText, !store.birthDate && styles.placeholder]}>
            {store.birthDate ? formatDate(store.birthDate) : t('birthInfo.selectDate')}
          </Text>
          {store.birthDate && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </Animated.View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.back()}
          accessibilityLabel={t('editBirthInfo.accessibilityBack')}
          accessibilityRole="button"
        >
          <Text style={styles.outlineText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !canContinue && styles.primaryDisabled]}
          accessibilityLabel={t('common.continue')}
          accessibilityRole="button"
          disabled={!canContinue}
          onPress={() => canContinue && router.push('/birth-time')}
        >
          <Text style={[styles.primaryText, !canContinue && styles.primaryTextDisabled]}>
            {t('common.continue')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Material Design 3 style calendar modal */}
      <Modal visible={showPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            {/* M3 Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalLabel}>{t('birthInfo.selectDate')}</Text>
              <Text style={styles.modalSelectedDate}>
                {tempDate ? formatDate(tempDate) : t('editBirthInfo.notSelectedYet')}
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
                accessibilityLabel={t('common.cancel')}
                accessibilityRole="button"
              >
                <Text style={styles.modalTextButtonLabel}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalTextButton, !tempDate && styles.modalTextButtonDisabled]}
                onPress={handleConfirm}
                disabled={!tempDate}
                accessibilityLabel={t('editBirthInfo.confirmDate')}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.modalTextButtonLabel,
                    !tempDate && styles.modalTextButtonLabelDisabled,
                  ]}
                >
                  {t('common.ok')}
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
