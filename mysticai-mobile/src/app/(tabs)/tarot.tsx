import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import OnboardingBackground from '../../components/OnboardingBackground';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  primarySoft: '#F1E8FD',
  gold: '#D4AF37',
  disabled: '#E5E5E5',
  disabledText: '#B5B5B5',
};

const TAROT_SPREADS = [
  { id: 'single', title: 'Tek Kart', description: 'Günlük rehberlik', cards: 1 },
  { id: 'three', title: 'Üçlü Açılım', description: 'Geçmiş-Şimdi-Gelecek', cards: 3 },
  { id: 'celtic', title: 'Kelt Çaprazı', description: 'Detaylı analiz', cards: 10 },
];

const PREVIOUS_READINGS = [
  { id: '1', title: 'Kariyer Okuması', date: '2 gün önce' },
  { id: '2', title: 'Aşk Okuması', date: '1 hafta önce' },
];

export default function TarotScreen() {
  const [selectedSpread, setSelectedSpread] = useState<string | null>(null);

  return (
    <View style={styles.container}>
      <OnboardingBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Tarot Falı</Text>
          <Text style={styles.subtitle}>Kart çekerek rehberlik alın</Text>
        </View>

        <View style={styles.spreadsContainer}>
          {TAROT_SPREADS.map((spread) => {
            const selected = selectedSpread === spread.id;
            return (
              <TouchableOpacity
                key={spread.id}
                style={[styles.spreadCard, selected && styles.spreadCardSelected]}
                onPress={() => setSelectedSpread(spread.id)}
              >
                <View style={styles.spreadHeader}>
                  <View style={[styles.spreadIcon, selected && styles.spreadIconSelected]}>
                    <Ionicons name="layers" size={18} color={selected ? COLORS.primary : COLORS.subtext} />
                  </View>
                  <Text style={[styles.spreadTitle, selected && styles.spreadTitleSelected]}>
                    {spread.title}
                  </Text>
                  <View style={styles.cardPill}>
                    <Text style={styles.cardPillText}>{spread.cards} Kart</Text>
                  </View>
                </View>
                <Text style={styles.spreadDescription}>{spread.description}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={[styles.drawButton, !selectedSpread && styles.drawButtonDisabled]}
          disabled={!selectedSpread}
        >
          <Ionicons name="sparkles" size={18} color={selectedSpread ? '#FFFFFF' : COLORS.disabledText} />
          <Text
            style={[styles.drawButtonText, !selectedSpread && styles.drawButtonTextDisabled]}
          >
            Kart Çek
          </Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Önceki Okumalar</Text>
        <View style={styles.readingsCard}>
          {PREVIOUS_READINGS.map((reading, index) => (
            <View
              key={reading.id}
              style={[styles.readingItem, index > 0 && styles.readingItemBorder]}
            >
              <View style={styles.readingIcon}>
                <Ionicons name="document-text" size={16} color={COLORS.gold} />
              </View>
              <View style={styles.readingContent}>
                <Text style={styles.readingTitle}>{reading.title}</Text>
                <Text style={styles.readingDate}>{reading.date}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.subtext} />
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 6,
  },
  subtitle: {
    color: COLORS.subtext,
    fontSize: 14,
  },
  spreadsContainer: {
    gap: 12,
    marginBottom: 20,
  },
  spreadCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  spreadCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primarySoft,
  },
  spreadHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  spreadIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2EDF9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spreadIconSelected: {
    backgroundColor: '#E5D7F6',
  },
  spreadTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  spreadTitleSelected: {
    color: COLORS.primary,
  },
  cardPill: {
    backgroundColor: '#EFEAF7',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cardPillText: {
    fontSize: 12,
    color: COLORS.subtext,
    fontWeight: '600',
  },
  spreadDescription: {
    color: COLORS.subtext,
    fontSize: 13,
  },
  drawButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 24,
  },
  drawButtonDisabled: {
    backgroundColor: COLORS.disabled,
  },
  drawButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  drawButtonTextDisabled: {
    color: COLORS.disabledText,
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  readingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  readingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  readingItemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  readingIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F9F2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  readingContent: {
    flex: 1,
  },
  readingTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  readingDate: {
    color: COLORS.subtext,
    fontSize: 12,
    marginTop: 2,
  },
});
