import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { MARITAL_STATUS_OPTIONS } from '../../constants/index';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  primarySoft: '#F1E8FD',
  disabled: '#E5E5E5',
  disabledText: '#B5B5B5',
};

export default function MaritalStatusScreen() {
  const store = useOnboardingStore();

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <View style={styles.content}>
        <Text style={styles.title}>Medeni Haliniz</Text>
        <Text style={styles.subtitle}>Size daha iyi rehberlik edebilmemiz için</Text>

        <View style={styles.grid}>
          {MARITAL_STATUS_OPTIONS.map((option) => {
            const selected = store.maritalStatus === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => store.setMaritalStatus(option.id)}
              >
                <Text style={[styles.cardEmoji, selected && styles.cardEmojiSelected]}>
                  {option.emoji}
                </Text>
                <Text style={[styles.cardText, selected && styles.cardTextSelected]}>
                  {option.title}
                </Text>
                {selected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={12} color="#FFFFFF" />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.outlineButton} onPress={() => router.back()}>
          <Text style={styles.outlineText}>Geri</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !store.maritalStatus && styles.primaryDisabled]}
          disabled={!store.maritalStatus}
          onPress={() => router.push('/focus-point')}
        >
          <Text style={[styles.primaryText, !store.maritalStatus && styles.primaryTextDisabled]}>
            Devam Et
          </Text>
        </TouchableOpacity>
      </View>
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
    marginBottom: 22,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
    width: '100%',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  cardEmoji: {
    fontSize: 22,
    marginBottom: 6,
  },
  cardEmojiSelected: {
    color: COLORS.primary,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardTextSelected: {
    color: COLORS.primary,
  },
  checkBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
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
    backgroundColor: '#FFFFFF',
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  primaryTextDisabled: {
    color: COLORS.disabledText,
  },
});
