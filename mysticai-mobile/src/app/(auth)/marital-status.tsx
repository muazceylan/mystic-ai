import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { MARITAL_STATUS_OPTIONS } from '../../constants/index';
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
      backgroundColor: C.surface,
      borderWidth: 1,
      borderColor: C.border,
      borderRadius: 14,
      paddingVertical: 16,
      paddingHorizontal: 16,
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
    },
    cardSelected: {
      borderColor: C.primary,
      backgroundColor: C.primarySoft,
    },
    cardEmoji: {
      fontSize: 22,
      marginBottom: 6,
    },
    cardEmojiSelected: {
      color: C.primary,
    },
    cardText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
    },
    cardTextSelected: {
      color: C.primary,
    },
    checkBadge: {
      position: 'absolute',
      top: 8,
      right: 8,
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

export default function MaritalStatusScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useOnboardingStore();
  const styles = makeStyles(colors);

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.content}>
        <Text style={styles.title}>{t('auth.maritalTitle')}</Text>
        <Text style={styles.subtitle}>{t('auth.maritalSubtitle')}</Text>

        <View style={styles.grid}>
          {MARITAL_STATUS_OPTIONS.map((option) => {
            const selected = store.maritalStatus === option.id;
            return (
              <TouchableOpacity
                key={option.id}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => store.setMaritalStatus(option.id)}
                accessibilityLabel={t(`maritalStatus.${option.id}`)}
                accessibilityRole="button"
              >
                <Text style={[styles.cardEmoji, selected && styles.cardEmojiSelected]}>
                  {option.emoji}
                </Text>
                <Text style={[styles.cardText, selected && styles.cardTextSelected]}>
                  {t(`maritalStatus.${option.id}`)}
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
          accessibilityLabel="Geri dön"
          accessibilityRole="button"
        >
          <Text style={styles.outlineText}>{t('common.back')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.primaryButton, !store.maritalStatus && styles.primaryDisabled]}
          disabled={!store.maritalStatus}
          onPress={() => router.push('/focus-point')}
          accessibilityLabel="Devam et"
          accessibilityRole="button"
        >
          <Text style={[styles.primaryText, !store.maritalStatus && styles.primaryTextDisabled]}>
            {t('common.continue')}
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeScreen>
  );
}
