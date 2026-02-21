import { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Modal } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
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
      marginBottom: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    inputText: {
      fontSize: 16,
      color: C.text,
    },
    placeholder: {
      color: C.disabledText,
    },
    link: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingVertical: 8,
    },
    linkText: {
      fontSize: 14,
      color: C.text,
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
    modalSelectedTime: {
      fontSize: 22,
      fontWeight: '700',
      color: C.text,
    },
    modalDivider: {
      height: 1,
      backgroundColor: C.border,
    },
    timeInputRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'flex-end',
      gap: 12,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 8,
    },
    timeInputGroup: {
      alignItems: 'center',
    },
    timeInputLabel: {
      fontSize: 12,
      color: C.subtext,
      marginBottom: 8,
    },
    timeInput: {
      width: 80,
      height: 64,
      backgroundColor: C.surfaceAlt,
      borderRadius: 12,
      fontSize: 32,
      fontWeight: '700',
      color: C.primary,
      textAlign: 'center',
      borderWidth: 1.5,
      borderColor: C.border,
    },
    timeColon: {
      fontSize: 32,
      fontWeight: '700',
      color: C.text,
      marginBottom: 8,
    },
    timeHint: {
      fontSize: 12,
      color: C.subtext,
      textAlign: 'center',
      paddingBottom: 20,
      paddingTop: 8,
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

export default function BirthTimeScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useOnboardingStore();
  const [showPicker, setShowPicker] = useState(false);
  const [hasPicked, setHasPicked] = useState(false);
  const styles = makeStyles(colors);

  const [hours, minutes] = store.birthTime.split(':').map(Number);
  const [tempHour, setTempHour] = useState(String(hours).padStart(2, '0'));
  const [tempMinute, setTempMinute] = useState(String(minutes).padStart(2, '0'));
  const minuteRef = useRef<TextInput>(null);

  const handleConfirm = () => {
    const h = Math.min(23, Math.max(0, parseInt(tempHour, 10) || 0));
    const m = Math.min(59, Math.max(0, parseInt(tempMinute, 10) || 0));
    store.setBirthTime(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
    store.setBirthTimeUnknown(false);
    setHasPicked(true);
    setShowPicker(false);
  };

  const formatTime = (time: string) => {
    const [h, m] = time.split(':');
    return `${h}:${m}`;
  };

  const isValidInput = () => {
    const h = parseInt(tempHour, 10);
    const m = parseInt(tempMinute, 10);
    return !isNaN(h) && !isNaN(m) && h >= 0 && h <= 23 && m >= 0 && m <= 59;
  };

  const canContinue = store.birthTimeUnknown || (hasPicked && isValidInput());
  const displayValue =
    !store.birthTimeUnknown && hasPicked ? formatTime(store.birthTime) : 'SS:DD';

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.content}>
        <Text style={styles.title}>{t('auth.birthTimeTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.birthTimeSubtitle')}
        </Text>

        <TouchableOpacity
          style={styles.input}
          onPress={() => setShowPicker(true)}
          accessibilityLabel="Doğum saati seç"
          accessibilityRole="button"
        >
          <Text style={[styles.inputText, displayValue === 'SS:DD' && styles.placeholder]}>
            {displayValue}
          </Text>
          {hasPicked && !store.birthTimeUnknown && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
            </Animated.View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          accessibilityLabel="Doğum saatimi bilmiyorum"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: store.birthTimeUnknown }}
          onPress={() => {
            const nextValue = !store.birthTimeUnknown;
            store.setBirthTimeUnknown(nextValue);
            if (nextValue) {
              setHasPicked(false);
            }
          }}
        >
          <Ionicons
            name={store.birthTimeUnknown ? 'checkbox' : 'square-outline'}
            size={20}
            color={store.birthTimeUnknown ? colors.primary : colors.subtext}
          />
          <Text style={styles.linkText}>{t('birthInfo.unknownTime')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.outlineButton}
          onPress={() => router.back()}
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Text style={styles.outlineText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !canContinue && styles.primaryDisabled]}
          accessibilityLabel="Devam et"
          accessibilityRole="button"
          disabled={!canContinue}
          onPress={() => router.push('/birth-country')}
        >
          <Text style={[styles.primaryText, !canContinue && styles.primaryTextDisabled]}>
            {t('common.continue')}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={showPicker} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalLabel}>{t('auth.selectTimeLabel')}</Text>
              <Text style={styles.modalSelectedTime}>
                {isValidInput() ? `${tempHour}:${tempMinute}` : '--:--'}
              </Text>
            </View>

            <View style={styles.modalDivider} />

            <View style={styles.timeInputRow}>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>{t('auth.hour')}</Text>
                <TextInput
                  style={styles.timeInput}
                  value={tempHour}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 2);
                    const num = parseInt(cleaned, 10);
                    const clamped = num > 23 ? '23' : cleaned;
                    setTempHour(clamped);
                    if (clamped.length === 2) minuteRef.current?.focus();
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor={colors.disabledText}
                  selectTextOnFocus
                />
              </View>

              <Text style={styles.timeColon}>:</Text>

              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>{t('auth.minute')}</Text>
                <TextInput
                  ref={minuteRef}
                  style={styles.timeInput}
                  value={tempMinute}
                  onChangeText={(text) => {
                    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 2);
                    const num = parseInt(cleaned, 10);
                    const clamped = num > 59 ? '59' : cleaned;
                    setTempMinute(clamped);
                  }}
                  keyboardType="number-pad"
                  maxLength={2}
                  placeholder="00"
                  placeholderTextColor={colors.disabledText}
                  selectTextOnFocus
                />
              </View>
            </View>

            <Text style={styles.timeHint}>{t('birthInfo.timeFormat')}</Text>

            <View style={styles.modalDivider} />

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
                style={[styles.modalTextButton, !isValidInput() && styles.modalTextButtonDisabled]}
                onPress={handleConfirm}
                disabled={!isValidInput()}
                accessibilityLabel={t('editBirthInfo.confirmTime')}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.modalTextButtonLabel,
                    !isValidInput() && styles.modalTextButtonLabelDisabled,
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
