import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import OnboardingBackground from '../../components/OnboardingBackground';
import { useOnboardingStore } from '../../store/useOnboardingStore';
import { FOCUS_POINTS } from '../../constants/index';

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

  return (
    <View style={styles.container}>
      <OnboardingBackground />

      <View style={styles.content}>
        <Text style={styles.title}>Odak Noktan?</Text>
        <Text style={styles.subtitle}>
          Bu hayatta odak noktanın hangisi olduğunu düşünüyorsun?
        </Text>

        <View style={styles.grid}>
          {FOCUS_POINTS.map((point) => {
            const selected = store.focusPoint === point.id;
            return (
              <TouchableOpacity
                key={point.id}
                style={[styles.card, selected && styles.cardSelected]}
                onPress={() => store.setFocusPoint(point.id)}
              >
                <Ionicons
                  name={ICON_MAP[point.id] || 'sparkles'}
                  size={20}
                  color={selected ? COLORS.primary : COLORS.subtext}
                />
                <Text style={[styles.cardText, selected && styles.cardTextSelected]}>
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
          style={[styles.primaryButton, !store.focusPoint && styles.primaryDisabled]}
          disabled={!store.focusPoint}
          onPress={() => router.push('/natal-chart')}
        >
          <Text style={[styles.primaryText, !store.focusPoint && styles.primaryTextDisabled]}>
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  cardText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  cardTextSelected: {
    color: COLORS.primary,
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
});
