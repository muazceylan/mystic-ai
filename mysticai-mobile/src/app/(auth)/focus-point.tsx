import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { FOCUS_POINTS } from '../../constants/index';
import { useTheme } from '../../context/ThemeContext';
import { SafeScreen } from '../../components/ui';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  career: 'briefcase',
  love: 'heart',
  money: 'cash',
  health: 'medkit',
  family: 'people',
  spiritual: 'sparkles',
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
      marginBottom: 6,
    },
    selectionHint: {
      fontSize: 13,
      color: C.primary,
      fontWeight: '600',
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
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    cardSelected: {
      borderColor: C.primary,
      backgroundColor: C.primarySoft,
    },
    cardDimmed: {
      opacity: 0.4,
    },
    cardText: {
      fontSize: 14,
      fontWeight: '600',
      color: C.text,
    },
    cardTextSelected: {
      color: C.primary,
    },
    cardTextDimmed: {
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
  });
}

export default function FocusPointScreen() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const store = useOnboardingStore();
  const styles = makeStyles(colors);
  const isMaxSelected = store.focusPoints.length >= 3;
  const canContinue = store.focusPoints.length > 0;

  return (
    <SafeScreen>
      <View style={styles.container}>
        <OnboardingBackground />

        <View style={styles.content}>
        <Text style={styles.title}>{t('auth.focusPointTitle')}</Text>
        <Text style={styles.subtitle}>
          {t('auth.focusPointSubtitle')}
        </Text>
        <Text style={styles.selectionHint}>
          {t('auth.focusPointHint')} ({store.focusPoints.length}/3)
        </Text>

        <View style={styles.grid}>
          {FOCUS_POINTS.map((point) => {
            const selected = store.focusPoints.includes(point.id);
            const dimmed = !selected && isMaxSelected;
            return (
              <TouchableOpacity
                key={point.id}
                style={[
                  styles.card,
                  selected && styles.cardSelected,
                  dimmed && styles.cardDimmed,
                ]}
                onPress={() => store.toggleFocusPoint(point.id)}
                disabled={dimmed}
                accessibilityLabel={t(`focusPoints.${point.id}`)}
                accessibilityRole="button"
              >
                <Ionicons
                  name={ICON_MAP[point.id] || 'sparkles'}
                  size={20}
                  color={selected ? colors.primary : dimmed ? colors.disabledText : colors.subtext}
                />
                <Text
                  style={[
                    styles.cardText,
                    selected && styles.cardTextSelected,
                    dimmed && styles.cardTextDimmed,
                  ]}
                >
                  {t(`focusPoints.${point.id}`)}
                </Text>
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
          style={[styles.primaryButton, !canContinue && styles.primaryDisabled]}
          disabled={!canContinue}
          onPress={() => router.push('/natal-chart')}
          accessibilityLabel={t('common.continue')}
          accessibilityRole="button"
        >
          <Text style={[styles.primaryText, !canContinue && styles.primaryTextDisabled]}>
            {t('common.continue')}
          </Text>
        </TouchableOpacity>
      </View>
      </View>
    </SafeScreen>
  );
}
