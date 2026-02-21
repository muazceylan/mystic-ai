import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { GENDER_OPTIONS } from '../../constants/index';
import { COLORS } from '../../constants/colors';
import { SafeScreen } from '../../components/ui';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  female: 'female',
  male: 'male',
  prefer_not_to_say: 'person',
};

export default function GenderScreen() {
  const store = useOnboardingStore();

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.content}>
        <Text style={styles.title}>Cinsiyetin</Text>
        <Text style={styles.subtitle}>Cinsiyetinizi sonra değiştiremezsiniz</Text>

        <View style={styles.optionsContainer}>
          {GENDER_OPTIONS.map((option) => {
            const selected = store.gender === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionCard,
                  option.id === 'prefer_not_to_say' && styles.optionFull,
                  selected && styles.optionSelected,
                ]}
                onPress={() => store.setGender(option.id)}
                accessibilityLabel={option.title}
                accessibilityRole="button"
              >
                <Ionicons
                  name={ICON_MAP[option.id] || 'person'}
                  size={22}
                  color={selected ? COLORS.primary : COLORS.subtext}
                />
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {option.title}
                </Text>
                {selected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={12} color={COLORS.white} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
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
          style={[styles.primaryButton, !store.gender && styles.primaryDisabled]}
          disabled={!store.gender}
          onPress={() => router.push('/marital-status')}
          accessibilityLabel="Devam et"
          accessibilityRole="button"
        >
          <Text style={[styles.primaryText, !store.gender && styles.primaryTextDisabled]}>
            Devam Et
          </Text>
        </TouchableOpacity>
      </View>
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
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    width: '100%',
  },
  optionCard: {
    width: '48%',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  optionFull: {
    width: '100%',
  },
  optionSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  optionText: {
    fontSize: 15,
    color: COLORS.text,
    fontWeight: '600',
  },
  optionTextSelected: {
    color: COLORS.primary,
  },
  checkBadge: {
    marginLeft: 'auto',
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
});
