import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { GENDER_OPTIONS } from '../../constants/index';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  female: 'female',
  male: 'male',
  prefer_not_to_say: 'person',
};

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
    optionsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
      width: '100%',
    },
    optionCard: {
      width: '48%',
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
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
      borderColor: C.primary,
      backgroundColor: C.primarySoft,
    },
    optionText: {
      fontSize: 15,
      color: C.text,
      fontWeight: '600',
    },
    optionTextSelected: {
      color: C.primary,
    },
    checkBadge: {
      marginLeft: 'auto',
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: C.primary,
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
  });
}

export default function GenderScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useOnboardingStore();
  const styles = makeStyles(colors);

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.content}>
        <Text style={styles.title}>{t('auth.genderTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.genderSubtitle')}</Text>

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
                accessibilityLabel={t(`gender.${option.id}`)}
                accessibilityRole="button"
              >
                <Ionicons
                  name={ICON_MAP[option.id] || 'person'}
                  size={22}
                  color={selected ? colors.primary : colors.subtext}
                />
                <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
                  {t(`gender.${option.id}`)}
                </Text>
                {selected && (
                  <View style={styles.checkBadge}>
                    <Ionicons name="checkmark" size={12} color={colors.white} />
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
          accessibilityLabel={t('editBirthInfo.accessibilityBack')}
          accessibilityRole="button"
        >
          <Text style={styles.outlineText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !store.gender && styles.primaryDisabled]}
          disabled={!store.gender}
          onPress={() => router.push('/(auth)/marital-status')}
          accessibilityLabel={t('common.continue')}
          accessibilityRole="button"
        >
          <Text style={[styles.primaryText, !store.gender && styles.primaryTextDisabled]}>
            {t('common.continue')}
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeScreen>
  );
}
