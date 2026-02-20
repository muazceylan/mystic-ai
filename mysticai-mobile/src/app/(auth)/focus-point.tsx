import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { FOCUS_POINTS } from '../../constants/index';
import { COLORS } from '../../constants/colors';

const ICON_MAP: Record<string, keyof typeof Ionicons.glyphMap> = {
  career: 'briefcase',
  love: 'heart',
  money: 'cash',
  health: 'medkit',
  family: 'people',
  spiritual: 'sparkles',
};

export default function FocusPointScreen() {
  const store = useOnboardingStore();
  const isMaxSelected = store.focusPoints.length >= 3;
  const canContinue = store.focusPoints.length > 0;

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <View style={styles.content}>
        <Text style={styles.title}>Odak Noktan?</Text>
        <Text style={styles.subtitle}>
          Bu hayatta odak noktanin hangisi oldugunu dusunuyorsun?
        </Text>
        <Text style={styles.selectionHint}>
          En fazla 3 secim yapabilirsiniz ({store.focusPoints.length}/3)
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
              >
                <Ionicons
                  name={ICON_MAP[point.id] || 'sparkles'}
                  size={20}
                  color={selected ? COLORS.primary : dimmed ? COLORS.disabledText : COLORS.subtext}
                />
                <Text
                  style={[
                    styles.cardText,
                    selected && styles.cardTextSelected,
                    dimmed && styles.cardTextDimmed,
                  ]}
                >
                  {point.title}
                </Text>
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
          style={[styles.primaryButton, !canContinue && styles.primaryDisabled]}
          disabled={!canContinue}
          onPress={() => router.push('/natal-chart')}
        >
          <Text style={[styles.primaryText, !canContinue && styles.primaryTextDisabled]}>
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
    marginBottom: 6,
  },
  selectionHint: {
    fontSize: 13,
    color: COLORS.primary,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  cardDimmed: {
    opacity: 0.4,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardTextSelected: {
    color: COLORS.primary,
  },
  cardTextDimmed: {
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
