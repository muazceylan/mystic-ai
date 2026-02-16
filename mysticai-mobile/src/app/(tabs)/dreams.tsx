import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import OnboardingBackground from '../../components/OnboardingBackground';

const COLORS = {
  background: '#F9F7FB',
  text: '#1E1E1E',
  subtext: '#7A7A7A',
  border: '#E6E1EA',
  primary: '#9D4EDD',
  primarySoft: '#F1E8FD',
  teal: '#4ECDC4',
  gold: '#D4AF37',
};

const RECENT_DREAMS = [
  { id: '1', title: 'Uçuş', date: 'Bugün', mood: 'Huzurlu' },
  { id: '2', title: 'Kaybolmuş', date: 'Dün', mood: 'Endişeli' },
  { id: '3', title: 'Eski arkadaş', date: '3 gün', mood: 'Nostaljik' },
];

const PATTERNS = [
  { id: 'water', title: 'Su', count: 5, icon: 'water', color: COLORS.teal },
  { id: 'air', title: 'Hava', count: 3, icon: 'leaf', color: COLORS.primary },
  { id: 'fire', title: 'Ateş', count: 2, icon: 'flame', color: COLORS.gold },
];

export default function DreamsScreen() {
  const [dreamText, setDreamText] = useState('');

  return (
    <View style={styles.container}>
      <OnboardingBackground />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Rüyalar</Text>
          <Text style={styles.subtitle}>Rüyalarını kaydet ve yorum al</Text>
        </View>

        <View style={styles.inputCard}>
          <Text style={styles.inputLabel}>Rüyanı yaz</Text>
          <TextInput
            style={styles.textInput}
            placeholder="Rüyanı yaz..."
            placeholderTextColor={COLORS.subtext}
            value={dreamText}
            onChangeText={setDreamText}
            multiline
            textAlignVertical="top"
          />
          <TouchableOpacity style={styles.analyzeButton}>
            <Ionicons name="sparkles" size={16} color="#FFFFFF" />
            <Text style={styles.analyzeButtonText}>Yorumla</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Son Rüyalar</Text>
        <View style={styles.journalCard}>
          {RECENT_DREAMS.map((dream, index) => (
            <View
              key={dream.id}
              style={[styles.dreamItem, index > 0 && styles.dreamItemBorder]}
            >
              <View style={styles.dreamIcon}>
                <Ionicons name="moon" size={16} color={COLORS.primary} />
              </View>
              <View style={styles.dreamContent}>
                <Text style={styles.dreamTitle}>{dream.title}</Text>
                <Text style={styles.dreamMeta}>{dream.date} • {dream.mood}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.subtext} />
            </View>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Elementler</Text>
        <View style={styles.patternsCard}>
          {PATTERNS.map((pattern) => (
            <View key={pattern.id} style={styles.patternItem}>
              <View style={[styles.patternIcon, { backgroundColor: pattern.color + '20' }]}
              >
                <Ionicons name={pattern.icon as any} size={18} color={pattern.color} />
              </View>
              <Text style={styles.patternTitle}>{pattern.title}</Text>
              <Text style={styles.patternCount}>{pattern.count}</Text>
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
  inputCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  inputLabel: {
    color: COLORS.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#FBFAFD',
    borderRadius: 12,
    padding: 12,
    color: COLORS.text,
    fontSize: 14,
    minHeight: 100,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  analyzeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 12,
    gap: 8,
  },
  analyzeButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  journalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 20,
  },
  dreamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 10,
  },
  dreamItemBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  dreamIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#EFE9FA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dreamContent: {
    flex: 1,
  },
  dreamTitle: {
    color: COLORS.text,
    fontSize: 14,
    fontWeight: '600',
  },
  dreamMeta: {
    color: COLORS.subtext,
    fontSize: 12,
    marginTop: 2,
  },
  patternsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  patternItem: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  patternIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  patternTitle: {
    color: COLORS.text,
    fontSize: 12,
    fontWeight: '600',
  },
  patternCount: {
    color: COLORS.subtext,
    fontSize: 12,
    marginTop: 4,
  },
});
