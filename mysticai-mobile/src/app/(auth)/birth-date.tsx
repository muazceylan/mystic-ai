import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { getZodiacSign } from '../../constants/index';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  disabled: '#E5E5E5',
  disabledText: '#B5B5B5',
};

export default function BirthDateScreen() {
  const store = useOnboardingStore();
  const [showPicker, setShowPicker] = useState(false);
  const [tempDate, setTempDate] = useState(new Date());

  const handleConfirm = () => {
    store.setBirthDate(tempDate);
    const zodiac = getZodiacSign(tempDate.getMonth() + 1, tempDate.getDate());
    store.setZodiacSign(zodiac);
    setShowPicker(false);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const canContinue = Boolean(store.birthDate);

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <View style={styles.content}>
        <Text style={styles.title}>Doğum Tarihiniz?</Text>
        <Text style={styles.subtitle}>
          Sizi analiz edebilmem için doğum tarihinizi giriniz
        </Text>

        <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
          <Text style={[styles.inputText, !store.birthDate && styles.placeholder]}>
            {store.birthDate ? formatDate(store.birthDate) : 'Gün / Ay / Yıl'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.outlineButton} onPress={() => router.back()}>
          <Text style={styles.outlineText}>Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !canContinue && styles.primaryDisabled]}
          disabled={!canContinue}
          onPress={() => canContinue && router.push('/birth-time')}
        >
          <Text style={[styles.primaryText, !canContinue && styles.primaryTextDisabled]}>
            Devam Et
          </Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <View style={styles.pickerModal}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Tarih Seçin</Text>
            <View style={styles.dateRow}>
              <TextInput
                style={styles.dateInput}
                value={tempDate.getDate().toString().padStart(2, '0')}
                onChangeText={(text) => {
                  const newDate = new Date(tempDate);
                  newDate.setDate(parseInt(text, 10) || 1);
                  setTempDate(newDate);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="GG"
                placeholderTextColor={COLORS.disabledText}
              />
              <Text style={styles.dateSeparator}>/</Text>
              <TextInput
                style={styles.dateInput}
                value={(tempDate.getMonth() + 1).toString().padStart(2, '0')}
                onChangeText={(text) => {
                  const newDate = new Date(tempDate);
                  newDate.setMonth(parseInt(text, 10) - 1);
                  setTempDate(newDate);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="AA"
                placeholderTextColor={COLORS.disabledText}
              />
              <Text style={styles.dateSeparator}>/</Text>
              <TextInput
                style={styles.dateInput}
                value={tempDate.getFullYear().toString()}
                onChangeText={(text) => {
                  const newDate = new Date(tempDate);
                  newDate.setFullYear(parseInt(text, 10) || new Date().getFullYear());
                  setTempDate(newDate);
                }}
                keyboardType="number-pad"
                maxLength={4}
                placeholder="YYYY"
                placeholderTextColor={COLORS.disabledText}
              />
            </View>

            <TouchableOpacity style={styles.pickerPrimaryButton} onPress={handleConfirm}>
              <Text style={styles.pickerPrimaryText}>Tamam</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickerSecondaryButton} onPress={() => setShowPicker(false)}>
              <Text style={styles.pickerSecondaryText}>İptal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  inputText: {
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
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  outlineText: {
    color: COLORS.primary,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: COLORS.primary,
  },
  primaryDisabled: {
    backgroundColor: COLORS.disabled,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryTextDisabled: {
    color: COLORS.disabledText,
  },
  pickerModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '82%',
  },
  pickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  dateInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    width: 60,
  },
  dateSeparator: {
    color: COLORS.subtext,
    fontSize: 18,
    marginHorizontal: 6,
  },
  pickerPrimaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerPrimaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  pickerSecondaryButton: {
    marginTop: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  pickerSecondaryText: {
    color: COLORS.subtext,
    fontSize: 14,
    fontWeight: '600',
  },
});
