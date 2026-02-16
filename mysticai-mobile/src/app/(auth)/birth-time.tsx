import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput } from 'react-native';
import { router } from 'expo-router';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  disabled: '#E5E5E5',
  disabledText: '#B5B5B5',
};

export default function BirthTimeScreen() {
  const store = useOnboardingStore();
  const [showPicker, setShowPicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [hasPicked, setHasPicked] = useState(false);

  const handleConfirm = () => {
    const hours = tempTime.getHours().toString().padStart(2, '0');
    const minutes = tempTime.getMinutes().toString().padStart(2, '0');
    store.setBirthTime(`${hours}:${minutes}`);
    store.setBirthTimeUnknown(false);
    setHasPicked(true);
    setShowPicker(false);
  };

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    const date = new Date();
    date.setHours(parseInt(hours, 10), parseInt(minutes, 10));
    return date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  };

  const canContinue = true;
  const displayValue = !store.birthTimeUnknown && hasPicked ? formatTime(store.birthTime) : 'SS:DD';

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <View style={styles.content}>
        <Text style={styles.title}>Doğum Saatiniz?</Text>
        <Text style={styles.subtitle}>
          Doğum saatiniz yükselen burcunuzu bulmam için önemlidir.
        </Text>

        <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)}>
          <Text style={[styles.inputText, displayValue === 'SS:DD' && styles.placeholder]}>
            {displayValue}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.link}
          onPress={() => {
            const nextValue = !store.birthTimeUnknown;
            store.setBirthTimeUnknown(nextValue);
            if (nextValue) {
              setHasPicked(false);
            }
          }}
        >
          <Text style={styles.linkText}>Doğum saatimi bilmiyorum</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.outlineButton} onPress={() => router.back()}>
          <Text style={styles.outlineText}>Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !canContinue && styles.primaryDisabled]}
          disabled={!canContinue}
          onPress={() => router.push('/birth-country')}
        >
          <Text style={[styles.primaryText, !canContinue && styles.primaryTextDisabled]}>
            Devam Et
          </Text>
        </TouchableOpacity>
      </View>

      {showPicker && (
        <View style={styles.pickerModal}>
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Saat Seçin</Text>
            <View style={styles.timeRow}>
              <TextInput
                style={styles.timeInput}
                value={tempTime.getHours().toString().padStart(2, '0')}
                onChangeText={(text) => {
                  const newDate = new Date(tempTime);
                  newDate.setHours(parseInt(text, 10) || 0);
                  setTempTime(newDate);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="SS"
                placeholderTextColor={COLORS.disabledText}
              />
              <Text style={styles.timeSeparator}>:</Text>
              <TextInput
                style={styles.timeInput}
                value={tempTime.getMinutes().toString().padStart(2, '0')}
                onChangeText={(text) => {
                  const newDate = new Date(tempTime);
                  newDate.setMinutes(parseInt(text, 10) || 0);
                  setTempTime(newDate);
                }}
                keyboardType="number-pad"
                maxLength={2}
                placeholder="DD"
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
    marginBottom: 10,
  },
  inputText: {
    fontSize: 16,
    color: COLORS.text,
  },
  placeholder: {
    color: COLORS.disabledText,
  },
  link: {
    paddingVertical: 8,
  },
  linkText: {
    fontSize: 14,
    color: COLORS.text,
    textDecorationLine: 'underline',
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
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  timeInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    width: 70,
  },
  timeSeparator: {
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
